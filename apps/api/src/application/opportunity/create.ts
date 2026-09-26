import prisma, { Prisma, OpportunityStatus as DbOpportunityStatus, OpportunityCategory as DbOpportunityCategory, EmploymentType as DbEmploymentType, OpportunitySourceKind as DbOpportunitySourceKind, OpportunityTrustLevel as DbOpportunityTrustLevel, LinkHealth as DbLinkHealth, Sector as DbSector } from '../../infrastructure/database/prisma';
import { Opportunity, OpportunityStatus, OpportunityCategory } from '@fresherflow/types';
import { generateSlug, generateCompanyLogoUrl, resolveUniqueSlug, sanitizeCustomSlug } from '@fresherflow/utils';
import { OpportunityEvent } from '@fresherflow/utils';
import { logger } from '@fresherflow/utils';
import { validateOpportunityInput, buildDuplicateWhere } from './validate';

export class DuplicateOpportunityError extends Error {
    duplicate: { id: string; slug: string; status: string; title: string };
    constructor(duplicate: { id: string; slug: string; status: string; title: string }) {
        super('Duplicate listing detected by applyLink');
        this.name = 'DuplicateOpportunityError';
        this.duplicate = duplicate;
    }
}

export class InvalidOpportunityError extends Error {
    errors: Array<{ field: string; message: string }>;
    constructor(errors: Array<{ field: string; message: string }>) {
        super(errors.map((e) => `${e.field}: ${e.message}`).join('; '));
        this.name = 'InvalidOpportunityError';
        this.errors = errors;
    }
}

/**
 * Use Case: Create Opportunity (lifecycle step 1: create → validate → draft).
 *
 * Covers the Phase 5 gates in one place so admin create, ingest-draft, and
 * community approval cannot drift:
 * - validation (title/company/link, kind-specific details, date sanity)
 * - duplicate protection across applyLink/sourceLink/sourceExternalId
 * - slug generation (private suffix vs govt SEO slug with collision check)
 * - provenance (sourceKind), authorship (postedByUserId), org ownership
 *   (organizationId passthrough, null for unmatched scraped rows)
 * - trust defaults (50/UNVERIFIED) and healthy link state
 *
 * Defaults to DRAFT. Pass `status: PUBLISHED` explicitly only when the caller
 * has already run publication checks (admin immediate-publish path).
 */
export async function createOpportunity(data: Partial<Opportunity>, adminId: string) {
    const errors = validateOpportunityInput(data as Record<string, unknown>);
    if (errors.length > 0) throw new InvalidOpportunityError(errors);

    const links = {
        applyLink: typeof (data as Record<string, unknown>).applyLink === 'string'
            ? ((data as Record<string, unknown>).applyLink as string).trim() || undefined
            : undefined,
        sourceLink: typeof (data as Record<string, unknown>).sourceLink === 'string'
            ? ((data as Record<string, unknown>).sourceLink as string).trim() || undefined
            : undefined,
        sourceExternalId: typeof (data as Record<string, unknown>).sourceExternalId === 'string'
            ? ((data as Record<string, unknown>).sourceExternalId as string).trim() || undefined
            : undefined,
    };

    const duplicateFilters = buildDuplicateWhere(links);
    if (duplicateFilters.length > 0) {
        const existing = await prisma.opportunity.findFirst({
            where: { deletedAt: null, OR: duplicateFilters },
            select: { id: true, slug: true, status: true, title: true },
        });
        if (existing) {
            throw new DuplicateOpportunityError(existing as unknown as DuplicateOpportunityError['duplicate']);
        }
    }

    const tempId = crypto.randomUUID();
    const raw = data as Record<string, unknown>;
    const isGovt = raw.governmentJobDetails !== undefined || raw.sector === 'GOVERNMENT';
    const customSlug = typeof raw.customSlug === 'string' ? raw.customSlug.trim() : '';

    let slug: string;
    if (customSlug) {
        const base = sanitizeCustomSlug(customSlug);
        const matches = await prisma.opportunity.findMany({
            where: { slug: { startsWith: base } },
            select: { slug: true },
        });
        slug = resolveUniqueSlug(base, new Set(matches.map((o) => o.slug)));
    } else if (isGovt) {
        const base = generateSlug(data.title || '', data.company || '', undefined, { isGovt: true });
        const matches = await prisma.opportunity.findMany({
            where: { slug: { startsWith: base } },
            select: { slug: true },
        });
        slug = resolveUniqueSlug(base, new Set(matches.map((o) => o.slug)));
    } else {
        slug = generateSlug(data.title || '', data.company || '', tempId);
    }

    const requestedStatus = (raw.status as string | undefined) === OpportunityStatus.PUBLISHED
        ? OpportunityStatus.PUBLISHED
        : OpportunityStatus.DRAFT;

    const opportunity = await prisma.opportunity.create({
        data: {
            ...(data as unknown as Prisma.OpportunityUncheckedCreateInput),
            applyLink: links.applyLink,
            sourceLink: links.sourceLink,
            sourceExternalId: links.sourceExternalId,
            companyLogoUrl: data.companyLogoUrl || generateCompanyLogoUrl(data.companyWebsite),
            id: tempId,
            slug,
            postedByUserId: (raw.postedByUserId as string | undefined) || adminId,
            organizationId: (raw.organizationId as string | undefined) ?? null,
            sourceKind: ((raw.sourceKind as string | undefined) || 'SCRAPED') as unknown as DbOpportunitySourceKind,
            status: requestedStatus as unknown as DbOpportunityStatus,
            trustScore: typeof raw.trustScore === 'number' ? (raw.trustScore as number) : 50,
            trustLevel: ((raw.trustLevel as string | undefined) || 'UNVERIFIED') as unknown as DbOpportunityTrustLevel,
            linkHealth: ((raw.linkHealth as string | undefined) || 'HEALTHY') as unknown as DbLinkHealth,
            category: (data.category || OpportunityCategory.EMPLOYMENT) as unknown as DbOpportunityCategory,
            sector: (((raw.sector as string | undefined) || 'PRIVATE')) as unknown as DbSector,
            recruitmentMethod: data.recruitmentMethod,
            workMode: data.workMode,
            experienceLevel: data.experienceLevel,
            employmentTypes: data.employmentTypes?.length ? data.employmentTypes as unknown as DbEmploymentType[] : undefined,
            title: data.title || '',
            company: data.company || '',
            description: data.description || '',
        },
        include: {
            driveDetails: true,
            eventDetails: true,
            governmentJobDetails: true,
        },
    });

    // Emit Domain Event (Async/Bg via Queue logic soon)
    logger.info(`[Event] Emitting ${OpportunityEvent.CREATED}`, { id: tempId });
    // TODO: Wire with event bus/queue

    return opportunity;
}
