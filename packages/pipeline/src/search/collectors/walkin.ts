import * as cheerio from 'cheerio';
import { BOARD_SCRAPER_REGISTRY, ScraperInputDto, AtsJob } from '@fresherflow/plugins';
import { parseWalkInDetails, matchHyderabadCluster, ParsedWalkInDetails, MatchedClusterResult, isSeniorJob } from '@fresherflow/utils';

export interface WalkInJobOpportunity extends AtsJob {
  city: string;
  cluster: MatchedClusterResult;
  walkInDetails: ParsedWalkInDetails;
  clusterName?: string;
  latitude?: number;
  longitude?: number;
  walkinDate?: string;
  walkinTime?: string;
  reportingTime?: string;
  venueAddress?: string;
  contactPerson?: string;
  contactPhone?: string;
  requiredDocs?: string;
  fresherScore?: number;
  reviewRequired?: boolean;
  confidenceScore?: number;
  sources?: string[];
  expiresAt?: string;
}

const SCAM_PHRASES = [
  'registration fee', 'training fee', 'security deposit', 'pay 500', 'pay 1000',
  'pay 2000', 'consultancy fee', 'placement fee', 'charges apply', 'interview fee',
  'bond amount', 'processing fee'
];

function isScamWalkin(text: string): boolean {
  const lower = (text || '').toLowerCase();
  return SCAM_PHRASES.some(p => lower.includes(p));
}

const HYDERABAD_KEYWORDS = [
  'hyderabad', 'secunderabad', 'madhapur', 'gachibowli', 'hitec city', 'hitech city',
  'cyber towers', 'mindspace', 'kondapur', 'kukatpally', 'miyapur', 'ameerpet',
  'begumpet', 'somajiguda', 'uppal', 'pocharam', 'kokapet', 'nanakramguda',
  'financial district', 'banjara hills', 'jubilee hills', 'dlf', 'waverock'
];

function isHyderabadLocation(text: string): boolean {
  const lower = (text || '').toLowerCase();
  return HYDERABAD_KEYWORDS.some(kw => lower.includes(kw));
}

function calculateWalkinScore(title: string, body: string): number {
  const text = `${title} ${body}`.toLowerCase();
  let score = 0;

  if (text.includes('walk-in') || text.includes('walk in') || text.includes('walkin')) score += 5;
  if (text.includes('walk-in drive') || text.includes('walk in drive') || text.includes('walkin drive')) score += 5;
  if (text.includes('interview venue') || text.includes('venue address') || text.includes('venue:')) score += 4;
  if (text.includes('walk-in date') || text.includes('interview date') || text.includes('date:')) score += 4;
  if (text.includes('reporting time') || text.includes('timing:')) score += 3;
  if (text.includes('direct interview') || text.includes('spot interview') || text.includes('face to face')) score += 4;
  if (text.includes('fresher') || text.includes('0-1 years') || text.includes('0-2 years') || text.includes('2024') || text.includes('2025') || text.includes('2026')) score += 3;
  if (isHyderabadLocation(text)) score += 5;

  return score;
}

const WALKIN_AGGREGATOR_FEEDS = [
  { name: 'Job4Freshers Walk-ins', url: 'https://job4freshers.co.in/category/walkin-jobs/' },
  { name: 'Job4Freshers Hyderabad', url: 'https://job4freshers.co.in/tag/hyderabad/' },
  { name: 'FreshersVoice Walk-ins', url: 'https://www.freshersvoice.com/latest-walk-in-drives/' },
  { name: 'FreshersVoice Hyderabad', url: 'https://www.freshersvoice.com/hyderabad-jobs/' },
  { name: 'OffCampusJobsIndia Walk-ins', url: 'https://offcampusjobsindia.com/category/walk-ins' },
  { name: 'OffCampusJobs4u Freshers', url: 'https://offcampusjobs4u.com/category/off-campus-freshers-job/' },
];

const TELEGRAM_PUBLIC_CHANNELS = [
  'job4freshers',
  'freshersvoice',
  'offcampusjobs4u',
  'hyderabadjobs',
  'freshersnow'
];

/**
 * Sweeps all sources to discover, geocode, and deduplicate real-time Hyderabad walk-in drives.
 */
export async function collectHyderabadWalkinDrives(options: {
  resultsWanted?: number;
  resultsPerQuery?: number;
  hoursOld?: number;
} = {}): Promise<WalkInJobOpportunity[]> {
  console.log(`\n======================================================`);
  console.log(`🗺️ STARTING MULTI-SOURCE HYDERABAD WALK-IN ENGINE`);
  console.log(`======================================================`);

  const eventMap = new Map<string, WalkInJobOpportunity>();
  const seenUrls = new Set<string>();

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. Channel 1: Dedicated Walk-in Category Feeds from Aggregators
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n📡 [Channel 1] Sweeping Dedicated Aggregator Walk-in Feeds...`);

  for (const feed of WALKIN_AGGREGATOR_FEEDS) {
    try {
      console.log(`  └─ Ingesting ${feed.name} (${feed.url})...`);
      const res = await fetch(feed.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(8000)
      });

      if (res.ok) {
        const html = await res.text();
        const $ = cheerio.load(html);
        const postLinks: { title: string; url: string }[] = [];

        $('article, .post, .entry-title, h2, h3').each((_, el) => {
          const a = $(el).find('a').first();
          const href = a.attr('href') || $(el).attr('href');
          const text = (a.text() || $(el).text()).trim();

          if (href && text && (href.startsWith('http') || href.startsWith('/'))) {
            const full = href.startsWith('http') ? href : new URL(href, feed.url).href;
            if (!seenUrls.has(full) && full !== feed.url && text.length > 10) {
              seenUrls.add(full);
              postLinks.push({ title: text, url: full });
            }
          }
        });

        console.log(`     Found ${postLinks.length} post links in feed.`);

        for (const post of postLinks.slice(0, 6)) {
          try {
            const postRes = await fetch(post.url, {
              headers: { 'User-Agent': 'Mozilla/5.0' },
              signal: AbortSignal.timeout(6000)
            });

            if (postRes.ok) {
              const postHtml = await postRes.text();
              const post$ = cheerio.load(postHtml);
              const bodyText = post$('article, .entry-content, .post-content, body').text().trim();

              const walkinScore = calculateWalkinScore(post.title, bodyText);
              const isHyd = isHyderabadLocation(post.title) || isHyderabadLocation(bodyText);

              if (walkinScore >= 8 && isHyd) {
                // 2-Step Verification: Scam check & Senior check
                if (isScamWalkin(bodyText) || isScamWalkin(post.title)) {
                  console.log(`     ⛔ Rejected Scam Walk-in: ${post.title}`);
                  continue;
                }
                if (isSeniorJob(`${post.title} ${bodyText}`)) {
                  console.log(`     ⛔ Rejected Senior Walk-in: ${post.title}`);
                  continue;
                }

                const details = parseWalkInDetails(post.title, bodyText, 'Hyderabad');
                if (!details.venueAddress || details.venueAddress.length < 8 || details.venueAddress === 'Hyderabad') {
                  continue;
                }

                const cluster = matchHyderabadCluster(`${details.venueAddress} ${bodyText} ${post.title}`);

                let applyLink = post.url;
                post$('a').each((_, a) => {
                  const t = post$(a).text().toLowerCase();
                  const h = post$(a).attr('href');
                  if (h && (t.includes('apply') || t.includes('official') || t.includes('link')) && h.startsWith('http') && !h.includes(new URL(post.url).hostname)) {
                    applyLink = h;
                  }
                });

                // Extract company name from title
                const companyMatch = post.title.match(/^([^|–—\-]+?)(?:\s+(?:Walk\s*in|Recruitment|Off\s*Campus|Hiring|Drive))/i) ||
                                     post.title.match(/(?:at|for|by)\s+([^|–—\-]+)/i);
                const company = companyMatch ? companyMatch[1].trim() : 'Corporate Walk-in';

                const fingerprint = `${company.toLowerCase()}:${details.dateRange || 'active'}:${cluster.cluster.name}`.replace(/\s+/g, '-');

                if (!eventMap.has(fingerprint)) {
                  eventMap.set(fingerprint, {
                    id: `walkin-${Math.random().toString(36).slice(2, 9)}`,
                    title: post.title,
                    company,
                    location: 'Hyderabad, Telangana',
                    city: 'Hyderabad',
                    cluster,
                    clusterName: cluster.cluster.name,
                    latitude: cluster.latitude,
                    longitude: cluster.longitude,
                    applyLink,
                    source: feed.name,
                    sourceType: 'AGGREGATOR',
                    descriptionSource: 'HTML',
                    description: bodyText.slice(0, 4000),
                    fresherScore: 95,
                    reviewRequired: true,
                    isRemote: false,
                    postedAt: new Date().toISOString(),
                    expiresAt: details.expiresAt,
                    walkInDetails: details,
                    venueAddress: details.venueAddress,
                    walkinDate: details.dateRange || 'Active Walk-in',
                    walkinTime: details.timeRange || details.reportingTime,
                    reportingTime: details.reportingTime,
                    contactPerson: details.contactPerson,
                    contactPhone: details.contactPhone,
                    requiredDocs: JSON.stringify(details.requiredDocuments),
                    confidenceScore: 0.90,
                    sources: [post.url],
                  });
                  console.log(`     ✅ Ingested: [${company}] in ${cluster.cluster.name}`);
                } else {
                  const existing = eventMap.get(fingerprint)!;
                  existing.sources = existing.sources || [];
                  existing.sources.push(post.url);
                  existing.confidenceScore = Math.min(0.99, (existing.confidenceScore || 0.9) + 0.05);
                }
              }
            }
          } catch {
            // Ignore single post timeout
          }
        }
      }
    } catch (e: any) {
      console.warn(`  └─ Feed error: ${feed.name}: ${e.message}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Channel 2: Public Telegram Recruitment Channels (Web Preview)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n📢 [Channel 2] Sweeping Public Telegram Recruitment Feeds...`);

  for (const channel of TELEGRAM_PUBLIC_CHANNELS) {
    const tmeUrl = `https://t.me/s/${channel}`;
    try {
      const res = await fetch(tmeUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: AbortSignal.timeout(6000)
      });

      if (res.ok) {
        const html = await res.text();
        const $ = cheerio.load(html);

        $('.tgme_widget_message_wrap').each((_, wrap) => {
          const text = $(wrap).find('.tgme_widget_message_text').text().trim();
          if (!text) return;

          const walkinScore = calculateWalkinScore('', text);
          const isHyd = isHyderabadLocation(text);

          if (walkinScore >= 8 && isHyd) {
            if (isScamWalkin(text)) return;
            if (isSeniorJob(text)) return;

            const firstLine = text.split('\n')[0].replace(/[🚨📢🔥✅]/gu, '').trim();
            const details = parseWalkInDetails(firstLine, text, 'Hyderabad');
            if (!details.venueAddress || details.venueAddress.length < 8 || details.venueAddress === 'Hyderabad') {
              return;
            }

            const cluster = matchHyderabadCluster(`${details.venueAddress} ${text}`);

            // Extract any links inside message
            const links: string[] = [];
            $(wrap).find('a').each((_, a) => {
              const h = $(a).attr('href');
              if (h && h.startsWith('http') && !h.includes('t.me')) links.push(h);
            });
            const applyLink = links[0] || tmeUrl;

            const companyMatch = text.match(/(?:Company|Hiring|Drive|Walk-in|Walkin)\s*:\s*([^\n\r,]+)/i) ||
                                 firstLine.match(/^([^|–—\-]+?)(?:\s+(?:Walk\s*in|Recruitment|Drive))/i);
            const company = companyMatch ? companyMatch[1].trim() : 'Hyderabad Corporate';

            const fingerprint = `${company.toLowerCase()}:${details.dateRange || 'active'}:${cluster.cluster.name}`.replace(/\s+/g, '-');

            if (!eventMap.has(fingerprint)) {
              eventMap.set(fingerprint, {
                id: `walkin-${Math.random().toString(36).slice(2, 9)}`,
                title: firstLine.length > 5 ? firstLine : `${company} Walk-in Drive 2026`,
                company,
                location: 'Hyderabad, Telangana',
                city: 'Hyderabad',
                cluster,
                clusterName: cluster.cluster.name,
                latitude: cluster.latitude,
                longitude: cluster.longitude,
                applyLink,
                source: `Telegram (@${channel})`,
                sourceType: 'AGGREGATOR',
                descriptionSource: 'HTML',
                description: text,
                fresherScore: 92,
                reviewRequired: true,
                isRemote: false,
                postedAt: new Date().toISOString(),
                expiresAt: details.expiresAt,
                walkInDetails: details,
                venueAddress: details.venueAddress,
                walkinDate: details.dateRange || 'Active Walk-in',
                walkinTime: details.timeRange || details.reportingTime,
                reportingTime: details.reportingTime,
                contactPerson: details.contactPerson,
                contactPhone: details.contactPhone,
                requiredDocs: JSON.stringify(details.requiredDocuments),
                confidenceScore: 0.88,
                sources: [tmeUrl],
              });
              console.log(`     ✅ Telegram Ingested: [${company}] in ${cluster.cluster.name}`);
            } else {
              const existing = eventMap.get(fingerprint)!;
              existing.sources = existing.sources || [];
              existing.sources.push(tmeUrl);
              existing.confidenceScore = Math.min(0.99, (existing.confidenceScore || 0.9) + 0.05);
            }
          }
        });
      }
    } catch {
      // Non-blocking
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Channel 3: Job Board Sweep (LinkedIn & Boards)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n💼 [Channel 3] Sweeping Job Boards for Hyderabad Walk-in Posts...`);

  const boardQueries = [
    'walkin fresher',
    'walk-in interview',
    'walk in drive Hyderabad',
    'walkin software engineer Hyderabad',
    'walkin support executive Hyderabad'
  ];

  const linkedinScraper = BOARD_SCRAPER_REGISTRY['linkedin'];

  if (linkedinScraper) {
    for (const query of boardQueries) {
      try {
        const res = await linkedinScraper.scrape(
          new ScraperInputDto({
            searchTerm: query,
            location: 'Hyderabad',
            resultsWanted: 5,
            hoursOld: options.hoursOld,
          })
        );

        for (const job of res?.jobs || []) {
          if (!job.jobUrl || seenUrls.has(job.jobUrl)) continue;
          seenUrls.add(job.jobUrl);

          const title = job.title || 'Walk-in Drive';
          const company = job.companyName || 'Corporate';
          const desc = job.description || '';
          const location = job.location?.displayLocation() || 'Hyderabad, Telangana, India';

          const walkinScore = calculateWalkinScore(title, desc);
          if (walkinScore >= 6) {
            if (isScamWalkin(desc) || isScamWalkin(title)) continue;
            if (isSeniorJob(`${title} ${desc}`)) continue;

            const walkInDetails = parseWalkInDetails(title, desc, location);
            if (!walkInDetails.venueAddress || walkInDetails.venueAddress.length < 8 || walkInDetails.venueAddress === 'Hyderabad') {
              continue;
            }

            const cluster = matchHyderabadCluster(`${walkInDetails.venueAddress} ${desc} ${title}`);
            const fingerprint = `${company.toLowerCase()}:${walkInDetails.dateRange || 'active'}:${cluster.cluster.name}`.replace(/\s+/g, '-');

            if (!eventMap.has(fingerprint)) {
              eventMap.set(fingerprint, {
                id: job.id || `walkin-${Math.random().toString(36).slice(2, 9)}`,
                title,
                company,
                location,
                applyLink: job.jobUrl,
                source: 'LinkedIn Walk-in',
                sourceType: 'AGGREGATOR',
                descriptionSource: 'HTML',
                description: desc,
                fresherScore: 90,
                reviewRequired: true,
                isRemote: false,
                postedAt: job.datePosted ? String(job.datePosted) : new Date().toISOString(),
                expiresAt: walkInDetails.expiresAt,
                city: 'Hyderabad',
                cluster,
                clusterName: cluster.cluster.name,
                latitude: cluster.latitude,
                longitude: cluster.longitude,
                walkInDetails,
                venueAddress: walkInDetails.venueAddress,
                walkinDate: walkInDetails.dateRange || 'Active',
                walkinTime: walkInDetails.timeRange || walkInDetails.reportingTime,
                reportingTime: walkInDetails.reportingTime,
                contactPerson: walkInDetails.contactPerson,
                contactPhone: walkInDetails.contactPhone,
                requiredDocs: JSON.stringify(walkInDetails.requiredDocuments),
                confidenceScore: 0.95,
                sources: [job.jobUrl],
              });
              console.log(`     ✅ Board Ingested: [${company}] ${title} (${cluster.cluster.name})`);
            }
          }
        }
      } catch (err: any) {
        console.warn(`  └─ [LinkedIn] Error for "${query}": ${err.message}`);
      }
    }
  }

  const results = Array.from(eventMap.values());

  console.log(`\n======================================================`);
  console.log(`🎯 TOTAL HIGH-CONFIDENCE HYDERABAD WALKINS INGESTED: ${results.length}`);
  console.log(`======================================================\n`);

  return results;
}
