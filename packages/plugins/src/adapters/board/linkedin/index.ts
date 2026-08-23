import * as cheerio from 'cheerio';
import { AtsAdapter, AtsJob, toAtsJob, decodeHtmlEntities } from '../../../base/BaseAdapter.js';
import { LinkedInService } from './linkedin.service.js';

export { LinkedInService };
export * from './linkedin.constants.js';

const service = new LinkedInService();

export class LinkedinAdapter implements AtsAdapter {
  providerName = 'Linkedin';

  async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
    const res = await service.scrape({ companySlug: companyId, searchTerm: companyName });
    return (res?.jobs || []).map(j => toAtsJob(j, 'linkedin', companyName, 'AGGREGATOR'));
  }

  async fetchJobDetails(job: AtsJob, page?: any): Promise<{ title: string; html: string; text: string; locations: string[]; company?: string; experienceLevel?: string; experienceMin?: number; applyLink?: string } | undefined> {
    const url = job.applyLink;
    const idMatch = url.match(/view\/[^/]*?(\d{8,12})/i) || url.match(/currentJobId=(\d{8,12})/i) || url.match(/(\d{8,12})/);
    const jobId = idMatch ? idMatch[1] : null;

    if (jobId) {
      try {
        const guestUrl = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`;
        const res = await fetch(guestUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          signal: AbortSignal.timeout(8000)
        });

        if (res.ok) {
          const html = await res.text();
          const $ = cheerio.load(html);
          const title = $('h2.top-card-layout__title, .topcard__title, h1').first().text().trim();
          const company = $('a.topcard__org-name-link, .topcard__flavor--black-link').first().text().trim();
          const location = $('span.topcard__flavor--bullet').first().text().trim();
          const descEl = $('.show-more-less-html__markup, .description__text');
          const rawDescHtml = descEl.html() || '';
          const descText = descEl.text().trim();

          // Extract offsite apply link if available
          let offsiteApply = $('a[data-tracking-control-name*="apply"], a.apply-button').attr('href');
          if (offsiteApply && (offsiteApply.includes('linkedin.com/signup') || offsiteApply.includes('linkedin.com/login'))) {
            offsiteApply = undefined;
          }

          if (descText.length > 50) {
            return {
              title: title || job.title,
              company: company || job.company,
              html: rawDescHtml,
              text: descText,
              locations: location ? [location] : [],
              applyLink: offsiteApply || undefined
            };
          }
        }
      } catch (err) {
        console.warn(`[LinkedIn Guest API] Error fetching ${url}: ${(err as Error).message}`);
      }
    }

    // Fallback to Playwright page if provided
    if (page) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await page.waitForTimeout(2000);
        const title = await page.title();
        const text = await page.locator('body').innerText();
        const html = await page.locator('body').innerHTML();
        return {
          title,
          text,
          html,
          locations: []
        };
      } catch (pageErr) {
        console.warn(`[LinkedIn Playwright] Error fetching ${url}: ${(pageErr as Error).message}`);
      }
    }

    return undefined;
  }
}
