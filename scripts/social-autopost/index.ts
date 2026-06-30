import crypto from 'node:crypto';
import axios from 'axios';
import { TwitterApi } from 'twitter-api-v2';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

// ─── Configurations ──────────────────────────────────────────────────────────

const CDN_URL = process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.fresherflow.in';
const CDN_SECRET = process.env.CDN_SIGNATURE_SECRET || '';
const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'fresherflow-cdn';
const DRY_RUN = process.env.DRY_RUN === 'true';
const MAX_POSTS_PER_RUN = 5;

// Initialize S3/R2 client if credentials exist
let s3: S3Client | null = null;
if (process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_ENDPOINT) {
    s3 = new S3Client({
        region: 'auto',
        endpoint: process.env.R2_ENDPOINT,
        credentials: {
            accessKeyId: process.env.R2_ACCESS_KEY_ID,
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
    });
} else {
    console.warn('[social-autopost] S3 / R2 credentials missing. Persistent state will run in mock mode.');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function signUrl(pathname: string): string {
    if (!CDN_SECRET) {
        console.warn('[social-autopost] CDN_SIGNATURE_SECRET is missing. Returning unsigned URL.');
        return `${CDN_URL}${pathname}`;
    }
    const t = Math.floor(Date.now() / 1000);
    const message = `${pathname}:${t}`;
    const sig = crypto.createHmac('sha256', CDN_SECRET).update(message).digest('hex');
    return `${CDN_URL}${pathname}?t=${t}&sig=${sig}`;
}

export type SharePlatform = 'linkedin' | 'x' /* | 'facebook' */;

const PLATFORM_MEDIUM: Record<SharePlatform, string> = {
    linkedin: 'post',
    x: 'post',
    // facebook: 'post',
};

function buildSocialOpportunityUrl(slug: string, platform: SharePlatform, type: string) {
    const url = new URL(`/${slug}`, CDN_URL);
    url.searchParams.set('ref', 'social');
    url.searchParams.set('source', 'opportunity_share');
    url.searchParams.set('utm_source', platform);
    url.searchParams.set('utm_medium', PLATFORM_MEDIUM[platform]);
    url.searchParams.set('utm_campaign', 'job_share');
    return url.toString();
}

const HASHTAGS = {
    X: '#Hiring #Fresher #Jobs',
    LINKEDIN: '#Hiring #FresherJobs #Careers #JobOpening',
    // FACEBOOK: '#Hiring #Jobs #FreshersHiring',
};

const MAX_CAPTION_LENGTH = {
    X: 260,
    LINKEDIN: 2800,
    // FACEBOOK: 2000,
};

function buildCaption(job: any, platform: 'X' | 'LINKEDIN' /* | 'FACEBOOK' */, applyLink: string): string {
    const { title, company, type, locations, salaryRange } = job;
    const locationText = (locations || []).slice(0, 3).join(' / ');
    const salary = salaryRange ? `💰 ${salaryRange}` : '';
    const tags = HASHTAGS[platform as 'X' | 'LINKEDIN'];

    const footer = `\n\n🔗 Apply: ${applyLink}\n\n${tags}`;
    const header = [
        `🚀 ${title} @ ${company}`,
        `📂 ${type} | 📍 ${locationText}`,
        salary,
    ].filter(Boolean).join('\n');

    const maxLen = MAX_CAPTION_LENGTH[platform];

    if (header.length + footer.length <= maxLen) {
        return header + footer;
    }

    const availableHeaderLen = maxLen - footer.length - 3;
    if (availableHeaderLen > 20) {
        return header.slice(0, availableHeaderLen) + '...' + footer;
    }

    const minimalFooter = `\n\n🔗 Apply: ${applyLink}`;
    const extremeHeaderLen = maxLen - minimalFooter.length - 3;
    if (extremeHeaderLen > 10) {
        return header.slice(0, extremeHeaderLen) + '...' + minimalFooter;
    }

    return `🔗 Apply: ${applyLink}`.slice(0, maxLen);
}

// ─── Social Platform Posters ─────────────────────────────────────────────────

async function postToX(text: string): Promise<string> {
    const client = new TwitterApi({
        appKey: process.env.X_API_KEY || '',
        appSecret: process.env.X_API_SECRET || '',
        accessToken: process.env.X_ACCESS_TOKEN || '',
        accessSecret: process.env.X_ACCESS_TOKEN_SECRET || '',
    });
    const response = await client.v2.tweet(text);
    return response.data.id;
}

async function postToLinkedIn(text: string): Promise<string> {
    const org = process.env.LINKEDIN_ORGANIZATION_URN;
    const token = process.env.LINKEDIN_ACCESS_TOKEN;

    const res = await axios.post('https://api.linkedin.com/v2/ugcPosts', {
        author: org,
        lifecycleState: 'PUBLISHED',
        specificContent: {
            'com.linkedin.ugc.ShareContent': {
                shareCommentary: { text },
                shareMediaCategory: 'NONE',
            },
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    }, {
        headers: {
            Authorization: `Bearer ${token}`,
            'X-Restli-Protocol-Version': '2.0.0',
        },
        timeout: 15000,
    });

    return res.headers['x-restli-id'] || 'unknown';
}

/*
async function postToFacebook(text: string): Promise<string> {
    const pageId = process.env.FACEBOOK_PAGE_ID;
    const token = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

    const res = await axios.post(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
        message: text,
        access_token: token,
    }, {
        timeout: 15000,
    });

    return res.data.id;
}
*/

// ─── State Management ────────────────────────────────────────────────────────

interface PostedState {
    postedIds: string[];
}

async function fetchPostedState(): Promise<PostedState> {
    if (!s3) return { postedIds: [] };

    try {
        const response = await s3.send(new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: 'social-posted.json',
        }));
        if (response.Body) {
            const bodyStr = await response.Body.transformToString();
            return JSON.parse(bodyStr) as PostedState;
        }
    } catch (err: any) {
        if (err.name === 'NoSuchKey') {
            console.log('[social-autopost] social-posted.json not found in CDN R2. Starting clean.');
        } else {
            console.error('[social-autopost] Error reading state from R2:', err.message);
        }
    }
    return { postedIds: [] };
}

async function savePostedState(state: PostedState): Promise<void> {
    if (!s3) {
        console.log('[social-autopost] Mock saving state: ', state.postedIds.length, 'total posted IDs.');
        return;
    }

    try {
        await s3.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: 'social-posted.json',
            Body: JSON.stringify(state, null, 2),
            ContentType: 'application/json',
        }));
        console.log('[social-autopost] Saved state to R2 successfully.');
    } catch (err: any) {
        console.error('[social-autopost] Error saving state to R2:', err.message);
    }
}

// ─── Main Execution ──────────────────────────────────────────────────────────

async function main() {
    console.log('[social-autopost] Fetching bootstrap feed from CDN...');
    let feed: any = { opportunities: [] };
    try {
        const feedUrl = signUrl('/bootstrap-feed.min.json');
        console.log(`[social-autopost] Requesting feed from: ${feedUrl.split('?')[0]}`);
        const res = await axios.get(feedUrl, { timeout: 15000 });
        feed = res.data;
    } catch (err: any) {
        console.error('[social-autopost] Failed to retrieve feed from CDN:', err.message);
        process.exit(1);
    }

    const opportunities = feed.opportunities || [];
    console.log(`[social-autopost] Loaded ${opportunities.length} opportunities from CDN feed.`);

    const state = await fetchPostedState();
    const postedSet = new Set(state.postedIds);

    // Identify opportunities that haven't been posted yet
    const unposted = opportunities.filter((opp: any) => opp.id && !postedSet.has(opp.id));
    console.log(`[social-autopost] Identified ${unposted.length} new opportunities to post.`);

    if (unposted.length === 0) {
        console.log('[social-autopost] No new opportunities. Exiting.');
        return;
    }

    // Process oldest opportunities first (the feed is sorted descending, so we reverse it)
    const toPost = unposted.reverse().slice(0, MAX_POSTS_PER_RUN);
    console.log(`[social-autopost] Processing batch of ${toPost.length} posts...`);

    for (const job of toPost) {
        console.log(`\n--------------------------------------------`);
        console.log(`[social-autopost] Posting: "${job.title}" at "${job.company}" (ID: ${job.id})`);

        // 1. Build URLs
        const shareUrlX = buildSocialOpportunityUrl(job.slug, 'x', job.type);
        const shareUrlLI = buildSocialOpportunityUrl(job.slug, 'linkedin', job.type);
        // const shareUrlFB = buildSocialOpportunityUrl(job.slug, 'facebook', job.type);

        // 2. Build Captions
        const captionX = buildCaption(job, 'X', shareUrlX);
        const captionLI = buildCaption(job, 'LINKEDIN', shareUrlLI);
        // const captionFB = buildCaption(job, 'FACEBOOK', shareUrlFB);

        if (DRY_RUN) {
            console.log(`[DRY RUN] Platforms mock posts:`);
            console.log(`\n=== X CAPTION ===\n${captionX}`);
            console.log(`\n=== LINKEDIN CAPTION ===\n${captionLI}`);
            // console.log(`\n=== FACEBOOK CAPTION ===\n${captionFB}`);
            
            // In dry-run we still mark them as posted to verify state update
            state.postedIds.push(job.id);
            continue;
        }

        // 3. Dispatch Posts
        let successCount = 0;

        // Post to X
        if (process.env.X_ACCESS_TOKEN) {
            try {
                await postToX(captionX);
                console.log('[social-autopost] Successfully posted to X.');
                successCount++;
            } catch (err: any) {
                console.error('[social-autopost] Failed to post to X:', err.message);
            }
        } else {
            console.log('[social-autopost] X credentials missing, skipping.');
        }

        // Post to LinkedIn
        if (process.env.LINKEDIN_ACCESS_TOKEN) {
            try {
                await postToLinkedIn(captionLI);
                console.log('[social-autopost] Successfully posted to LinkedIn.');
                successCount++;
            } catch (err: any) {
                console.error('[social-autopost] Failed to post to LinkedIn:', err.message);
            }
        } else {
            console.log('[social-autopost] LinkedIn credentials missing, skipping.');
        }

        // Post to Facebook (Commented out)
        /*
        if (process.env.FACEBOOK_PAGE_ACCESS_TOKEN) {
            try {
                await postToFacebook(captionFB);
                console.log('[social-autopost] Successfully posted to Facebook.');
                successCount++;
            } catch (err: any) {
                console.error('[social-autopost] Failed to post to Facebook:', err.message);
            }
        } else {
            console.log('[social-autopost] Facebook credentials missing, skipping.');
        }
        */

        // If it successfully posted to at least one platform, mark it as posted
        if (successCount > 0) {
            state.postedIds.push(job.id);
        } else {
            console.warn(`[social-autopost] Skipping marking ID ${job.id} as posted since all posts failed.`);
        }
    }

    // Save updated state
    await savePostedState(state);
    console.log('\n[social-autopost] Done.');
}

main().catch((err) => {
    console.error('[social-autopost] Critical failure in script execution:', err);
    process.exit(1);
});
