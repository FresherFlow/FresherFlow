import { AtsAdapter, AtsJob } from './BaseAdapter.js';
import { chromium } from 'playwright';

export class SkillCareerHubAdapter implements AtsAdapter {
    providerName = 'SkillCareerHub';

    async fetchJobs(companyId: string, companyName: string): Promise<AtsJob[]> {
        const jobs: AtsJob[] = [];
        let browser;
        try {
            browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            
            // Block images and media to speed up loading
            await page.route('**/*', (route) => {
                const type = route.request().resourceType();
                if (['image', 'media', 'font'].includes(type)) {
                    route.abort();
                } else {
                    route.continue();
                }
            });

            await page.goto('https://skillcareerhub.com/jobs', { waitUntil: 'networkidle', timeout: 30000 });
            
            // Wait for job cards to render
            await page.waitForSelector('div.grid > div, div.border, article', { timeout: 10000 }).catch(() => {});
            await page.waitForTimeout(2000); // Give it a moment to finish hydrating

            const rawJobs = await page.evaluate(() => {
                const results: any[] = [];
                // Look for common card wrappers
                const cards = document.querySelectorAll('div.grid > div, div.border');
                
                cards.forEach(card => {
                    const el = card as HTMLElement;
                    const text = el.innerText || '';
                    if (text.toLowerCase().includes('apply') || text.toLowerCase().includes('view')) {
                        // Extract title (usually the first bold or largest text)
                        const titleEl = el.querySelector('h2, h3, h4, font-bold, strong');
                        const title = titleEl ? (titleEl as HTMLElement).innerText.trim() : text.split('\n')[0].trim();
                        
                        // Try to find the apply link
                        let applyLink = '';
                        const anchors = Array.from(el.querySelectorAll('a'));
                        for (const a of anchors) {
                            if (a.href && !a.href.startsWith('#') && !a.href.includes('skillcareerhub.com')) {
                                applyLink = a.href;
                                break;
                            }
                        }

                        if (title && applyLink) {
                            results.push({
                                title,
                                applyLink
                            });
                        }
                    }
                });
                return results;
            });

            for (const r of rawJobs) {
                jobs.push({
                    title: r.title,
                    company: 'SkillCareerHub',
                    applyLink: r.applyLink,
                    descriptionSource: 'NONE',
                    source: 'SkillCareerHub',
                    sourceType: 'ATS'
                });
            }
        } catch (e) {
            console.error(`[SkillCareerHub] Error fetching jobs:`, (e as Error).message);
        } finally {
            if (browser) await browser.close();
        }
        
        return jobs;
    }
}
