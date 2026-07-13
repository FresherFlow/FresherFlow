import { Page, BrowserContext } from 'playwright';

export function isValidApplyLink(urlStr: string, currentDomain: string): boolean {
    try {
        const u = new URL(urlStr);
        const targetHost = u.hostname.replace(/^www\./, '').toLowerCase();
        const baseHost = currentDomain.replace(/^www\./, '').toLowerCase();
        
        if (targetHost === baseHost) {
            // Allow redirector paths for sites like freshersnow.com
            const pathLower = u.pathname.toLowerCase();
            if (pathLower.startsWith('/go/') || pathLower.startsWith('/out/') || pathLower.startsWith('/apply/') || pathLower.startsWith('/job/') || pathLower.startsWith('/link/')) {
                // It's a redirector, allow it
            } else {
                return false;
            }
        }
        if (u.protocol.includes('mailto')) return false;
        if (targetHost.startsWith('courses.')) return false;
        if (u.pathname.toLowerCase().includes('.pdf')) return false;
        
        const blacklistedDomains = [
            'facebook.com', 'twitter.com', 'x.com', 'linkedin.com', 'whatsapp.com', 
            'telegram.org', 't.me', 'telegram.me', 'telegram.dog', 'youtube.com', 'youtu.be', 
            'instagram.com', 'foundit.in', 'naukri.com', 'cloudflare.com', 
            'play.google.com', 'plus.google.com', 'apps.apple.com',
            'pinterest.com', 'reddit.com', 'github.com/MukeshCheekatla',
            'openinapp.co', 'openinapp.link', 'linktr.ee', 'bio.link', 'bit.ly', 'tinyurl.com',
            'freshershunt.in', 'jobsaddafreshers.com', 'internshipss.com', 'placementdrive.in',
            'freshersvoice.com', 'freshersnow.com', 'offcampusjobs4u.com', 'freshhiring.com', 
            'recruitnxt.com', 'fresheropenings.com', 'job4freshers.co.in', 'frontlinesmedia.in',
            'govtjobmart.in', 'findmyjobss.com', 'dailypharmajobs.in', 'ashokworld.in',
            'topvarsity.in',
            'love2pickleball.com',
            'softwaremuchatlu.com',
            'onlinestudy4u.in',
            'merademyjobs.com',
            'fresheroffcampus.com',
            'kickcharm.com',
            'offcampusjobdrives.com',
            'mohancareers.com',
            'cookieyes.com', 'generatepress.com', 'wordpress.org', 'wordpress.com', 'gravatar.com',
            'elementor.com', 'schema.org', 'doubleclick.net', 'google-analytics.com', 'googletagmanager.com',
            'w.org', 'wp.com', 'blogspot.com', 'getrevue.co', 'revue.co',
            'frontlinesedutech.com', 'courses.frontlinesedutech.com',
            'apprenticeshipindia.org', 'mhrdnats.gov.in', 'nats.education.gov.in', 'udemy.com',
            'coursera.org', 'edx.org', 'simplilearn.com', 'greatlearning.in', 'medium.com',
            'subscribepage.com', 'mailerlite.com', 'getresponse.com', 'activecampaign.com', 'convertkit.com'
        ];
        
        for (const domain of blacklistedDomains) {
            if (targetHost === domain || targetHost.endsWith('.' + domain)) return false;
        }
        
        return true;
    } catch {
        return false;
    }
}

// Find actual ATS link
export async function findActualApplyLink(page: Page, context: BrowserContext, currentDomain: string): Promise<string | null> {
    try {
        // Define common selectors for the main article/post content
        const contentSelectors = [
            '.post-body', '.entry-content', 'article', 'main', '#main-content', 
            '#content', '.post-content', '.entry-body', '.post', '.job-description'
        ];
        
        let rootLocator = page.locator('body');
        for (const selector of contentSelectors) {
            const locator = page.locator(selector);
            if (await locator.count() > 0) {
                rootLocator = locator;
                break;
            }
        }

        // 1. Try to find links containing explicit apply/register/click here/submit text
        const applyButtons = await rootLocator.locator('a', { hasText: /(apply|register|click here|submit)/i }).elementHandles();
        for (const btn of applyButtons) {
            const href = await btn.getAttribute('href');
            if (href) {
                try {
                    const u = new URL(href, page.url());
                    if (isValidApplyLink(u.href, currentDomain)) {
                        return u.href;
                    }
                } catch {
                    // Ignore invalid URLs
                }
            }
        }

        // 2. Fall back to collecting all external links and checking for known ATS hosts
        const links = await rootLocator.locator('a').evaluateAll(anchors => 
            anchors.map(a => (a as HTMLAnchorElement).href)
        );
        const externalLinks = links.filter(l => isValidApplyLink(l, currentDomain));

        for (const link of externalLinks) {
            try {
                const u = new URL(link);
                const h = u.hostname.toLowerCase();
                const pathLower = u.pathname.toLowerCase();
                const atsHosts = [
                    'myworkdayjobs.com', 'myworkdaysite.com', 'greenhouse.io', 'lever.co', 
                    'taleo.net', 'icims.com', 'smartrecruiters.com', 'eightfold.ai', 
                    'oraclecloud.com', 'infosysapps.com', 'phenompro.com', 'ashbyhq.com', 
                    'jobvite.com', 'workable.com', 'rippling.com', 'forms.gle'
                ];
                let isAts = false;
                for (const ats of atsHosts) {
                    if (h === ats || h.endsWith('.' + ats)) {
                        isAts = true; break;
                    }
                }
                if (isAts || h.includes('workday') || h.includes('taleo') || pathLower.includes('careers') || pathLower.includes('jobs')) {
                    return link;
                }
            } catch {}
        }

        // 3. If no explicit apply link with an external href was found, try clicking the first apply button (js actions)
        // Skip buttons that are just hash links (anchor scroll links)
        const clickTargets = [];
        for (const btn of applyButtons) {
            const href = await btn.getAttribute('href');
            if (!href || !href.startsWith('#')) {
                clickTargets.push(btn);
            }
        }

        if (clickTargets.length > 0) {
            const [newPage] = await Promise.all([
                context.waitForEvent('page').catch(() => null),
                clickTargets[0].click({ timeout: 5000 }).catch(() => null)
            ]);

            if (newPage) {
                await newPage.waitForLoadState();
                const url = newPage.url();
                await newPage.close();
                if (isValidApplyLink(url, currentDomain)) {
                    return url;
                }
            } else {
                await page.waitForTimeout(3000);
                const currentUrl = page.url();
                if (isValidApplyLink(currentUrl, currentDomain)) {
                    return currentUrl;
                }
            }
        }
        
        // 4. Return first external link from content area as a fallback
        return externalLinks.length > 0 ? externalLinks[0] : null;

    } catch (err) {
        console.error("Error finding actual apply link:", (err as Error).message);
        return null;
    }
}
