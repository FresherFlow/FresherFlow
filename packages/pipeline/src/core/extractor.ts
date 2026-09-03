import { Page, BrowserContext } from 'playwright';

export function unwrapRedirectors(urlStr: string): string {
    try {
        let u = new URL(urlStr);
        if ((u.hostname === 'linkedin.com' || u.hostname.endsWith('.linkedin.com')) && u.pathname.includes('/safety/go/')) {
            const nested = u.searchParams.get('url');
            if (nested) return new URL(nested).href;
        } else if ((u.hostname === 'google.com' || u.hostname.endsWith('.google.com')) && u.pathname.includes('/url')) {
            const nested = u.searchParams.get('q') || u.searchParams.get('url');
            if (nested) return new URL(nested).href;
        }
    } catch {}
    return urlStr;
}

export function isValidApplyLink(urlStr: string, currentDomain: string): boolean {
    try {
        const unwrapped = unwrapRedirectors(urlStr);
        let u = new URL(unwrapped);

        const targetHost = u.hostname.replace(/^www\./, '').toLowerCase();
        const baseHost = currentDomain.replace(/^www\./, '').toLowerCase();
        
        if (targetHost === baseHost) {
            // Allow redirector paths for sites like freshersnow.com
            const pathLower = u.pathname.toLowerCase();
            if (pathLower.includes('/go/') || pathLower.includes('/out/') || pathLower.includes('/apply') || pathLower.includes('/redirect') || pathLower.includes('/visit') || pathLower.includes('register') || pathLower.includes('submit')) {
                return true; // It's a redirector, allow it immediately
            } else {
                return false;
            }
        }
        if (u.protocol.includes('mailto') || u.protocol.includes('javascript')) return false;
        if (targetHost.startsWith('courses.')) return false;
        if (u.pathname.toLowerCase().includes('.pdf')) return false;

        // Allow direct LinkedIn job postings (/jobs/view/...), but reject general profiles/channels
        if (targetHost === 'linkedin.com' || targetHost.endsWith('.linkedin.com')) {
            return u.pathname.includes('/jobs/view/');
        }
        
        const blacklistedDomains = [
            'facebook.com', 'twitter.com', 'x.com', 'whatsapp.com', 
            'telegram.org', 't.me', 'telegram.me', 'telegram.dog', 'youtube.com', 'youtu.be', 
            'instagram.com', 'foundit.in', 'naukri.com', 'cloudflare.com', 
            'play.google.com', 'plus.google.com', 'accounts.google.com', 'apps.apple.com',
            'pinterest.com', 'reddit.com', 'github.com/MukeshCheekatla',
            'openinapp.co', 'openinapp.link', 'linktr.ee', 'bio.link', 'bit.ly', 'tinyurl.com',
            'instamojo.com', 'razorpay.me', 'cosmofeed.com', 'topmate.io', 'gumroad.com',
            'maps.google.com', 'maps.app.goo.gl', 'goo.gl/maps', 'easylatexresume.com',

            'freshershunt.in', 'jobsaddafreshers.com', 'internshipss.com', 'placementdrive.in',
            'sarkariresultbuzz.com',
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
        // Search for explicit apply/register/click here/submit text across the page
        const applyButtons = await page.locator('a, button', { hasText: /(apply|register|click here|submit|official link|careers link|form)/i }).elementHandles();
        console.log(`[DEBUG] Found ${applyButtons.length} explicit apply buttons.`);
        for (const btn of applyButtons) {
            const href = await btn.getAttribute('href');
            if (href) {
                try {
                    const u = new URL(href, page.url());
                    const currentU = new URL(page.url());
                    if (u.pathname.replace(/\/$/, '') === currentU.pathname.replace(/\/$/, '')) {
                        console.log(`[DEBUG] Skipping self-link: ${u.href}`);
                        continue; // Skip self-links even with different query params or trailing slashes
                    }
                    const unwrappedHref = unwrapRedirectors(u.href);
                    if (isValidApplyLink(unwrappedHref, currentDomain)) {
                        console.log(`[DEBUG] Returning explicit apply link: ${unwrappedHref}`);
                        return unwrappedHref;
                    } else {
                        console.log(`[DEBUG] Explicit apply link invalid: ${unwrappedHref}`);
                    }
                } catch {
                    // Ignore invalid URLs
                }
            }
        }

        // 2. Fall back to collecting all external links and checking for known ATS hosts
        const links = await page.locator('a').evaluateAll(anchors => 
            anchors.map(a => (a as HTMLAnchorElement).href)
        );
        const externalLinks = links.map(unwrapRedirectors).filter(l => isValidApplyLink(l, currentDomain));
        console.log(`[DEBUG] Found ${links.length} total links, ${externalLinks.length} valid external links.`);

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
                    console.log(`[DEBUG] Returning ATS fallback link: ${link}`);
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

        if (clickTargets.length > 0 && context) {
            const [newPage] = await Promise.all([
                context.waitForEvent('page', { timeout: 5000 }).catch(() => null),
                clickTargets[0].click({ timeout: 5000 }).catch(() => null)
            ]);

            if (newPage) {
                try {
                    await newPage.waitForLoadState('load', { timeout: 10000 });
                    const url = newPage.url();
                    if (isValidApplyLink(url, currentDomain)) {
                        return url;
                    }
                } catch (e) {
                    // Timeout or page crash
                } finally {
                    await newPage.close();
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
