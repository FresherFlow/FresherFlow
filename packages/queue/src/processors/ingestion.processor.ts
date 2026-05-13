import { OpportunityType as SharedOpportunityType, RawOpportunity } from '@fresherflow/types';
import { generateOpportunitySlug, calculateTrendingScore } from '@fresherflow/domain';
import { generateOpportunityFingerprint } from '@fresherflow/utils';
import prisma, { OpportunityType, OpportunityStatus } from '@fresherflow/database';

/**
 * Background processor for opportunity ingestion.
 */
export async function processIngestionJob(job: { data: { rawOpportunityId: string, url: string, userId?: string } }) {
    const { rawOpportunityId, url, userId } = job.data;

    // 1. Fetch raw opportunity
    const raw = await prisma.rawOpportunity.findUnique({
        where: { id: rawOpportunityId }
    }) as unknown as RawOpportunity;

    if (!raw) throw new Error(`Raw opportunity ${rawOpportunityId} not found`);

    try {
        const payload = (raw.rawPayload || {}) as Record<string, unknown>;

        // 2. Preliminary Duplicate Detection (Semantic Fingerprinting - Item 45 in plan)
        // Note: URL-based dedupe happened in the route, this is for content-level dedupe.
        const fingerprint = generateOpportunityFingerprint({
            title: (payload.title as string) || '',
            company: (payload.company as string) || '',
            locations: (payload.locations as string[]) || []
        });

        const semanticExisting = await prisma.opportunity.findFirst({
            where: {
                OR: [
                    { slug: { startsWith: fingerprint } },
                    { title: (payload.title as string) || undefined, company: (payload.company as string) || undefined }
                ],
                deletedAt: null
            }
        });

        if (semanticExisting) {
            await prisma.rawOpportunity.update({
                where: { id: rawOpportunityId },
                data: {
                    status: 'DEDUPED',
                    mappedOpportunityId: semanticExisting.id as string
                }
            });
            return;
        }

        // 3. Simple Mock Parsing (In reality, this would hit an LLM or scraper)
        const parsed = {
            title: (payload.title as string) || 'New Opportunity',
            company: (payload.company as string) || 'Unknown Company',
            type: payload.type === 'INTERNSHIP' ? SharedOpportunityType.INTERNSHIP : SharedOpportunityType.JOB,
            locations: (payload.locations as string[]) || ['Remote'],
        };

        if (!parsed.title || !parsed.company) {
             await prisma.rawOpportunity.update({
                where: { id: rawOpportunityId },
                data: { status: 'REJECTED' }
            });
            return;
        }

        const slug = generateOpportunitySlug(parsed.company, parsed.title);

        // 4. Calculate Initial Trending Score (Item 156-167 in plan)
        const initialScore = calculateTrendingScore({
            shares: 1, // First share
            saves: 0,
            clicks: 0,
            postedAt: new Date(),
            isVerified: false
        });

        // 5. Domain Trust Logic (Auto-Publish High-Trust Sources)
        const TRUSTED_DOMAINS = [
            'lever.co',
            'greenhouse.io',
            'myworkdayjobs.com',
            'jobvite.com',
            'smartrecruiters.com',
            'ashbyhq.com',
            'careers.google.com',
            'amazon.jobs',
            'meta.com/careers',
            'microsoft.com',
            'apple.com/jobs',
            'netflix.com/jobs',
            'spotify.com/jobs'
        ];

        const isTrusted = TRUSTED_DOMAINS.some(domain => url.toLowerCase().includes(domain));
        const status = isTrusted ? OpportunityStatus.PUBLISHED : OpportunityStatus.DRAFT;

        // Create Opportunity
        const opportunity = await prisma.opportunity.create({
            data: {
                slug,
                title: parsed.title,
                company: parsed.company,
                type: parsed.type as OpportunityType,
                locations: parsed.locations,
                sourceLink: url,
                applyLink: url,
                status: status,
                linkHealth: isTrusted ? 'HEALTHY' : 'RETRYING',
                publishedAt: isTrusted ? new Date() : null,
                postedByUserId: userId || 'SYSTEM_DEFAULT',
                sharesCount: 1,
                trendingScore: initialScore,
            }
        });

        // 6. Finalize Raw status
        await prisma.rawOpportunity.update({
            where: { id: rawOpportunityId },
            data: {
                status: 'DRAFT_CREATED',
                mappedOpportunityId: opportunity.id as string
            }
        });

    } catch (error) {
        console.error('Ingestion processing failed:', error);
        await prisma.rawOpportunity.update({
            where: { id: rawOpportunityId },
            data: { status: 'ERROR' }
        });
    }
}
