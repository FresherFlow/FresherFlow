import { chromium } from 'playwright';
import * as fs from 'node:fs/promises';

const QUERIES = [
    'site:myworkdayjobs.com ("intern" OR "graduate" OR "trainee" OR "entry level")',
    'site:boards.greenhouse.io ("intern" OR "new grad" OR "fresher")',
    'site:jobs.lever.co ("intern" OR "entry level" OR "associate")'
];

async function randomDelay(min = 2000, max = 5000) {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    await new Promise(resolve => setTimeout(resolve, ms));
}

async function runDorker() {
    console.log("Starting ATS Google Dorker...");

    const browser = await chromium.launch({ headless: true });
    // Use a stealthy user agent
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 },
    });

    const page = await context.newPage();
    const foundLinks = new Set<string>();

    for (const query of QUERIES) {
        console.log(`\nExecuting query: ${query}`);
        // Using DuckDuckGo html version to avoid immediate Google Recaptcha walls if running locally/CI without proxies
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        
        try {
            await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await randomDelay(3000, 6000);

            // Extract result links from DuckDuckGo
            const links = await page.$$eval('a.result__url', anchors => anchors.map(a => (a as HTMLAnchorElement).href));
            
            // Clean up duckduckgo tracking wrappers if any, though html.duckduckgo usually returns clean URLs in the text or href
            const cleanLinks = await page.$$eval('a.result__snippet', anchors => anchors.map(a => (a as HTMLAnchorElement).href));

            const combined = Array.from(new Set([...links, ...cleanLinks]));
            
            let count = 0;
            for (const link of combined) {
                // DuckDuckGo redirects via //duckduckgo.com/l/?uddg=...
                let actualUrl = link;
                try {
                    if (link.includes('uddg=')) {
                        const urlObj = new URL(link);
                        actualUrl = decodeURIComponent(urlObj.searchParams.get('uddg') || link);
                    }
                } catch {}

                let isAts = false;
                try {
                    const h = new URL(actualUrl).hostname;
                    if (h === 'myworkdayjobs.com' || h.endsWith('.myworkdayjobs.com') ||
                        h === 'greenhouse.io' || h.endsWith('.greenhouse.io') ||
                        h === 'lever.co' || h.endsWith('.lever.co')) {
                        isAts = true;
                    }
                } catch {}

                if (isAts) {
                    foundLinks.add(actualUrl);
                    count++;
                }
            }
            console.log(`  -> Found ${count} ATS links for this query.`);

        } catch (err) {
            console.error(`  -> Failed to execute query: ${(err as Error).message}`);
        }
    }

    await browser.close();

    console.log(`\n--- Dorker Finished ---`);
    console.log(`Total unique ATS links found: ${foundLinks.size}`);
    
    if (foundLinks.size > 0) {
        console.log("Sample links:");
        Array.from(foundLinks).slice(0, 5).forEach(l => console.log(` - ${l}`));
    }
}

runDorker().catch(console.error);
