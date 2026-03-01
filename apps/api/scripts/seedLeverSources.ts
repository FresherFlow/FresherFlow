import stagingPrisma from '../src/lib/stagingPrisma';
import { IngestionSourceType, OpportunityType } from '@prisma/staging-client';

// Verified active Lever slugs
const LEVER_SLUGS = [
    'razorpay',
    'meesho',
    'inmobi',
    'atlassian',
    'postman',
    'browserstack',
    'freshworks',
    'chargebee',
    'cleartax',
    'groww',
    'slice',
    'unacademy',
    'cars24',
    'spinny',
    'delhivery',
    'sharechat',
    'dream11',
    'acko',
    'nykaa',
    'lenskart',
    'gupshup',
    'darwinbox',
    'innovaccer',
    'turing',
    'rippling',
    'figma',
    'canva',
    'notion',
    'airtable',
    'segment',
    'datadog',
    'coinbase',
    'stripe',
    'brex',
    'affirm',
    'instacart',
    'doordash',
    'netflix',
    'spotify',
    'shopify',
    'cloudflare',
    'docusign',
    'okta',
    'hubspot',
    'mongodb',
    'elastic',
    'twilio',
    'hashicorp',
    'gitlab',
    'openai',
    // Indian companies (from earlier seed)
    'zepto',
    'cred-club',
    'jupiter-money',
    'licious',
    'moengage',
    'clevertap',
    'hasura',
    'leadsquared',
    'gojek',
    'ninjacart',
    'khatabook',
    'vedantu',
    'physicswallah',
    'toplyne',
    'rocketlane',
    'kissflow',
    'zoho',
    'wingify',
    'mindtickle',
    'druva',
    'icertis',
    'yellowai',
    'observe-ai',
    'hevo-data',
    'sprinklr',
];

// Greenhouse board slugs
const GREENHOUSE_SLUGS = [
    { slug: 'razorpaysoftwareprivatelimited', name: 'Razorpay' },
    { slug: 'zomato', name: 'Zomato' },
    { slug: 'dream11', name: 'Dream11' },
    { slug: 'flipkart', name: 'Flipkart' },
    { slug: 'phonepe', name: 'PhonePe' },
    { slug: 'swiggy', name: 'Swiggy' },
    { slug: 'ola', name: 'Ola' },
    { slug: 'paytm', name: 'Paytm' },
    { slug: 'sharechat', name: 'ShareChat' },
    { slug: 'urbancompany', name: 'Urban Company' },
    { slug: 'curefit', name: 'CureFit' },
    { slug: 'bigbasket', name: 'BigBasket' },
];

async function main() {
    let created = 0;
    let skipped = 0;

    for (const slug of LEVER_SLUGS) {
        const endpoint = `https://api.lever.co/v0/postings/${slug}?mode=json`;
        const exists = await stagingPrisma.ingestionSource.findFirst({ where: { endpoint } });
        if (exists) { skipped++; continue; }

        const name = slug
            .split('-')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');

        await stagingPrisma.ingestionSource.create({
            data: {
                name,
                sourceType: IngestionSourceType.LEVER,
                endpoint,
                defaultType: OpportunityType.JOB,
                runFrequencyMinutes: 720,
                enabled: true,
            }
        });
        created++;
        console.log(`✅ ${name} (LEVER)`);
    }

    for (const gh of GREENHOUSE_SLUGS) {
        const endpoint = `https://boards-api.greenhouse.io/v1/boards/${gh.slug}/jobs?content=true`;
        const exists = await stagingPrisma.ingestionSource.findFirst({ where: { endpoint } });
        if (exists) { skipped++; continue; }

        await stagingPrisma.ingestionSource.create({
            data: {
                name: gh.name,
                sourceType: IngestionSourceType.GREENHOUSE,
                endpoint,
                defaultType: OpportunityType.JOB,
                runFrequencyMinutes: 720,
                enabled: true,
            }
        });
        created++;
        console.log(`✅ ${gh.name} (GREENHOUSE)`);
    }

    console.log(`\nDone — ${created} created, ${skipped} skipped (already exist)`);
}

main().finally(() => process.exit());
