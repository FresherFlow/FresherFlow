import * as cheerio from 'cheerio';
import { BOARD_SCRAPER_REGISTRY, ScraperInputDto, AtsJob } from '@fresherflow/plugins';
import { parseWalkInDetails, matchTechCluster, ParsedWalkInDetails, MatchedClusterResult, isSeniorJob } from '@fresherflow/utils';
import { unwrapRedirectors, isValidApplyLink } from '../../core/extractor.js';

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

/**
 * Cities this collector covers. Drives are found by city mention rather than
 * assumed to be Hyderabad, which is what made every non-Hyderabad drive
 * impossible to collect.
 */
const SUPPORTED_CITY_KEYWORDS: string[] = [
  'hyderabad', 'secunderabad', 'madhapur', 'gachibowli', 'hitec city', 'hitech city',
  'cyber towers', 'kondapur', 'ameerpet', 'begumpet', 'uppal', 'banjara hills',
  'bengaluru', 'bangalore', 'whitefield', 'electronic city', 'marathahalli',
  'hebbal', 'hsr layout', 'koramangala', 'outer ring road',
  'pune', 'hinjewadi', 'kharadi', 'viman nagar', 'wakad', 'magarpatta',
  'chennai', 'sholinganallur', 'omr', 'guindy', 'nungambakkam', 'ambattur',
  'mumbai', 'powai', 'andheri', 'thane', 'airoli', 'chakala',
  'delhi', 'noida', 'gurugram', 'gurgaon', 'faridabad', 'greater noida',
  'kolkata', 'salt lake', 'rajarhat', 'new town',
  'ahmedabad', 'surat', 'jaipur', 'lucknow', 'nagpur', 'indore', 'bhopal',
  'patna', 'kochi', 'coimbatore', 'madurai', 'visakhapatnam', 'vijayawada',
  'mysuru', 'mysore', 'chandigarh', 'ludhiana', 'bhubaneswar', 'guwahati',
  'trivandrum', 'thiruvananthapuram', 'goa', 'ranchi', 'dehradun',
];

const CITY_ALIASES: Record<string, string> = {
  bangalore: 'Bengaluru',
  gurgaon: 'Gurugram',
  secunderabad: 'Hyderabad',
  'new delhi': 'Delhi',
  mysore: 'Mysuru',
  trivandrum: 'Thiruvananthapuram',
};

/** The city a post is about, or null when it names no supported city. */
function detectCity(text: string): string | null {
  const lower = (text || '').toLowerCase();
  for (const kw of SUPPORTED_CITY_KEYWORDS) {
    if (lower.includes(kw)) return CITY_ALIASES[kw] ?? titleCase(kw);
  }
  return null;
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, c => c.toUpperCase());
}

function isSupportedCityLocation(text: string): boolean {
  return detectCity(text) !== null;
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
  // Naming a city we cover is evidence this is a real, local drive. Worth the
  // same as a Hyderabad mention used to be.
  if (detectCity(text)) score += 5;

  return score;
}

const WALKIN_AGGREGATOR_FEEDS = [
  { name: 'Job4Freshers Walk-ins', url: 'https://job4freshers.co.in/category/walkin-jobs/' },
  { name: 'Job4Freshers Hyderabad', url: 'https://job4freshers.co.in/tag/hyderabad/' },
  { name: 'Job4Freshers Bengaluru', url: 'https://job4freshers.co.in/tag/bangalore/' },
  { name: 'Job4Freshers Pune', url: 'https://job4freshers.co.in/tag/pune/' },
  { name: 'Job4Freshers Chennai', url: 'https://job4freshers.co.in/tag/chennai/' },
  { name: 'FreshersVoice Walk-ins', url: 'https://www.freshersvoice.com/latest-walk-in-drives/' },
  { name: 'FreshersVoice Hyderabad', url: 'https://www.freshersvoice.com/hyderabad-jobs/' },
  { name: 'FreshersVoice Bengaluru', url: 'https://www.freshersvoice.com/bangalore-jobs/' },
  { name: 'FreshersVoice Pune', url: 'https://www.freshersvoice.com/pune-jobs/' },
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
 * Sweeps all sources to discover, geocode, and deduplicate real-time walk-in drives across covered cities.
 */
export async function collectWalkinDrives(options: {
  resultsWanted?: number;
  resultsPerQuery?: number;
  hoursOld?: number;
} = {}): Promise<WalkInJobOpportunity[]> {
  console.log(`\n======================================================`);
  console.log(`\n[Walk-in] Starting multi-source walk-in engine...`);
  console.log(`======================================================`);

  const eventMap = new Map<string, WalkInJobOpportunity>();
  const seenUrls = new Set<string>();

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // 1. Channel 1: Dedicated Walk-in Category Feeds from Aggregators
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  console.log(`\nðŸ“¡ [Channel 1] Sweeping Dedicated Aggregator Walk-in Feeds...`);

  for (const feed of WALKIN_AGGREGATOR_FEEDS) {
    try {
      console.log(`  â””â”€ Ingesting ${feed.name} (${feed.url})...`);
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
              const mentionsCity =
                isSupportedCityLocation(post.title) || isSupportedCityLocation(bodyText);

              if (walkinScore >= 8 && mentionsCity) {
                // 2-Step Verification: Scam check & Senior check
                if (isScamWalkin(bodyText) || isScamWalkin(post.title)) {
                  console.log(`     â›” Rejected Scam Walk-in: ${post.title}`);
                  continue;
                }
                if (isSeniorJob(`${post.title} ${bodyText}`)) {
                  console.log(`     â›” Rejected Senior Walk-in: ${post.title}`);
                  continue;
                }

                // Derive the city from the post itself. It was hardcoded to
                // Hyderabad, so a Bengaluru drive was labelled
                // "Hyderabad, Telangana" and clustered under Gachibowli.
                const city = detectCity(`${post.title} ${bodyText}`) || 'Hyderabad';
                const details = parseWalkInDetails(post.title, bodyText, city);
                if (!details.venueAddress || details.venueAddress.length < 8 || details.venueAddress === city) {
                  continue;
                }

                const cluster = matchTechCluster(`${details.venueAddress} ${bodyText} ${post.title}`);
                if (!cluster) {
                  // No curated locality matched. Skip rather than pin the drive
                  // to a cluster in the wrong city.
                  continue;
                }

                let applyLink = post.url;
                const postHost = new URL(post.url).hostname;
                post$('a').each((_, a) => {
                  const h = post$(a).attr('href');
                  if (h && (h.startsWith('http') || h.startsWith('//'))) {
                    const unwrapped = unwrapRedirectors(h.startsWith('//') ? `https:${h}` : h);
                    if (isValidApplyLink(unwrapped, postHost)) {
                      applyLink = unwrapped;
                      return false; // Break on first valid real apply link
                    }
                  }
                });

                // Extract company name from title
                const companyMatch = post.title.match(/^([^|â€“â€”\-]+?)(?:\s+(?:Walk\s*in|Recruitment|Off\s*Campus|Hiring|Drive))/i) ||
                                     post.title.match(/(?:at|for|by)\s+([^|â€“â€”\-]+)/i);
                const company = companyMatch ? companyMatch[1].trim() : 'Corporate Walk-in';

                const fingerprint = `${company.toLowerCase()}:${details.dateRange || 'active'}:${cluster.cluster.name}`.replace(/\s+/g, '-');

                if (!eventMap.has(fingerprint)) {
                  eventMap.set(fingerprint, {
                    id: `walkin-${Math.random().toString(36).slice(2, 9)}`,
                    title: post.title,
                    company,
                    location: city,
                    city,
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
                  console.log(`     âœ… Ingested: [${company}] in ${cluster.cluster.name}`);
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
      console.warn(`  â””â”€ Feed error: ${feed.name}: ${e.message}`);
    }
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // 2. Channel 2: Public Telegram Recruitment Channels (Web Preview)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  console.log(`\nðŸ“¢ [Channel 2] Sweeping Public Telegram Recruitment Feeds...`);

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

          if (walkinScore >= 8) {
            if (isScamWalkin(text)) return;
            if (isSeniorJob(text)) return;

            const firstLine = text.split('\n')[0].replace(/[ðŸš¨ðŸ“¢ðŸ”¥âœ…]/gu, '').trim();
            const city = detectCity(text) || 'Hyderabad';
            const details = parseWalkInDetails(firstLine, text, city);
            if (!details.venueAddress || details.venueAddress.length < 8 || details.venueAddress === city) {
              return;
            }

            const cluster = matchTechCluster(`${details.venueAddress} ${text}`);
            if (!cluster) return;

            // Extract real apply links inside message using extractor rules
            let applyLink = tmeUrl;
            $(wrap).find('a').each((_, a) => {
              const h = $(a).attr('href');
              if (h && (h.startsWith('http') || h.startsWith('//'))) {
                const unwrapped = unwrapRedirectors(h.startsWith('//') ? `https:${h}` : h);
                if (isValidApplyLink(unwrapped, 't.me')) {
                  applyLink = unwrapped;
                  return false;
                }
              }
            });

            const companyMatch = text.match(/(?:Company|Hiring|Drive|Walk-in|Walkin)\s*:\s*([^\n\r,]+)/i) ||
                                 firstLine.match(/^([^|â€“â€”\-]+?)(?:\s+(?:Walk\s*in|Recruitment|Drive))/i);
            const company = companyMatch ? companyMatch[1].trim() : 'Corporate';

            const fingerprint = `${company.toLowerCase()}:${details.dateRange || 'active'}:${cluster.cluster.name}`.replace(/\s+/g, '-');

            if (!eventMap.has(fingerprint)) {
              eventMap.set(fingerprint, {
                id: `walkin-${Math.random().toString(36).slice(2, 9)}`,
                title: firstLine.length > 5 ? firstLine : `${company} Walk-in Drive 2026`,
                company,
                location: city,
                city,
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
              console.log(`     âœ… Telegram Ingested: [${company}] in ${cluster.cluster.name}`);
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

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // 3. Channel 3: Job Board Sweep (LinkedIn & Boards)
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  console.log(`\n[Channel 3] Sweeping job boards for walk-in posts across covered cities...`);

  // One generic query per covered city. The three Hyderabad-specific queries
  // this replaced meant no board was ever searched for a drive outside
  // Hyderabad.
  const boardCities = ['Hyderabad', 'Bengaluru', 'Pune', 'Chennai', 'Mumbai', 'Noida'];

  const linkedinScraper = BOARD_SCRAPER_REGISTRY['linkedin'];

  if (linkedinScraper) {
    for (const city of boardCities) {
      const query = `walk in drive ${city}`;
      try {
        const res = await linkedinScraper.scrape(
          new ScraperInputDto({
            searchTerm: query,
            location: city,
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
          // Trust the board's own location, then a city we recognise, rather
          // than assuming Hyderabad for every listing.
          const detectedCity = detectCity(`${title} ${desc} ${job.location?.displayLocation() || ''}`);
          if (!detectedCity) continue;
          const location = job.location?.displayLocation() || detectedCity;

          const walkinScore = calculateWalkinScore(title, desc);
          if (walkinScore >= 6) {
            if (isScamWalkin(desc) || isScamWalkin(title)) continue;
            if (isSeniorJob(`${title} ${desc}`)) continue;

            const walkInDetails = parseWalkInDetails(title, desc, detectedCity);
            if (!walkInDetails.venueAddress || walkInDetails.venueAddress.length < 8 || walkInDetails.venueAddress === detectedCity) {
              continue;
            }

            const cluster = matchTechCluster(`${walkInDetails.venueAddress} ${desc} ${title}`);
            if (!cluster) continue;
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
                city: detectedCity,
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
              console.log(`     âœ… Board Ingested: [${company}] ${title} (${cluster.cluster.name})`);
            }
          }
        }
      } catch (err: any) {
        console.warn(`  â””â”€ [LinkedIn] Error for "${query}": ${err.message}`);
      }
    }
  }

  const results = Array.from(eventMap.values());

  console.log(`\n======================================================`);
  console.log(`   -> ${results.length} high-confidence walk-ins ingested`);
  console.log(`======================================================\n`);

  return results;
}
