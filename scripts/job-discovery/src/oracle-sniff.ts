import { chromium } from 'playwright';

async function main() {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    const captured: { url: string; body: string; status: number; reqBody?: string }[] = [];
    
    page.on('request', request => {
        const url = request.url();
        if (url.includes('hcmRestApi') && !url.includes('css') && !url.includes('CandExpStatic')) {
            const postData = request.postData();
            console.log(`\n[REQ] ${request.method()} ${url}`);
            if (postData) console.log(`  PostBody: ${postData.substring(0, 300)}`);
        }
    });
    
    page.on('response', async response => {
        const url = response.url();
        if (url.includes('hcmRestApi') && !url.includes('css') && !url.includes('CandExpStatic')) {
            try {
                const status = response.status();
                const text = await response.text();
                console.log(`\n[RES ${status}] ${url}`);
                if (text.trim().length > 0 && !text.startsWith('wOF')) {
                    console.log(`  Body: ${text.substring(0, 800)}`);
                }
                captured.push({ url, body: text, status });
            } catch (e) {}
        }
    });

    console.log("Navigating to Honeywell jobs page...");
    
    // Don't use networkidle - just use domcontentloaded, then wait for a specific API
    await page.goto("https://ibqbjb.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/Honeywell/jobs", {
        waitUntil: 'domcontentloaded',
        timeout: 30000
    });
    
    // Wait for the job list API to fire (up to 15 seconds)
    try {
        await page.waitForResponse(
            r => r.url().includes('hcmRestApi') && r.url().includes('recruiting'),
            { timeout: 15000 }
        );
        console.log("\n[Got recruiting API response!]");
        await page.waitForTimeout(3000); // Wait for all requests to complete
    } catch (e) {
        console.log("\n[Timed out waiting for recruiting API]");
    }
    
    console.log("\n=== SUMMARY ===");
    for (const c of captured) {
        console.log(`  [${c.status}] ${c.url}`);
    }
    
    await browser.close();
}

main().catch(console.error);
