import prisma, { Prisma, OpportunityStatus as DbOpportunityStatus, EducationLevel as DbEducationLevel, WorkMode as DbWorkMode, OpportunityCategory as DbOpportunityCategory, EmploymentType as DbEmploymentType } from '../../database/prisma';
import { OpportunityStatus, OpportunityCategory, EmploymentType, RecruitmentMethod, Opportunity, Profile } from '@fresherflow/types';
import { calculateOpportunityMatch, generateSlug, generateCompanyLogoUrl } from '@fresherflow/utils';

/**
 * Opportunity Service - Business Logic Layer
 *
 * Responsibilities:
 * - CRUD operations with business rules
 * - Eligibility filtering
 * - Status management
 * - Soft delete handling
 */

/**
 * Fields an admin may edit on an existing opportunity.
 *
 * Spreading the request body straight into `Prisma.OpportunityUpdateInput` lets a
 * caller write columns that are derived or privileged: `deletedAt` (un-delete a
 * soft-deleted row), `savesCount`/`clicksCount`/`trendingScore` (denormalized
 * counters owned by engagement.ts), `slug`, `createdAt` and `id`. Everything the
 * route actually accepts has to be named here.
 *
 * Phase 5: covers every independent taxonomy dimension plus the eligibility,
 * compensation-projection, deadline, trust, provenance, and org-ownership
 * columns. Counters, `deletedAt`, `postedByUserId`, and `search_vector` stay
 * off this list on purpose.
 */
const EDITABLE_OPPORTUNITY_FIELDS = [
    'title',
    'description',
    'company',
    'companyWebsite',
    'companyLogoUrl',
    'companyStage',
    'companySize',
    'companyIndustry',
    'companyTopics',
    'location',
    'city',
    'state',
    'category',
    'employmentTypes',
    'recruitmentMethod',
    'workMode',
    'sector',
    'experienceLevel',
    'experienceMin',
    'experienceMax',
    'sourceKind',
    'sourceExternalId',
    'sourceLink',
    'applyLink',
    'allowedDegrees',
    'allowedCourses',
    'allowedSpecializations',
    'allowedPassoutYears',
    'passoutYearMin',
    'passoutYearMax',
    'allowedAvailability',
    'requiredSkills',
    'locations',
    'structuredLocations',
    'applicantLocationRequirements',
    'eligibleGrades',
    'minimumAge',
    'maximumAge',
    'applyUrl',
    'applyEmail',
    'applyPhone',
    'externalApplyUrl',
    'applicationStartDate',
    'applicationDeadline',
    'registrationDeadline',
    'startsAt',
    'endsAt',
    'deadline',
    'expiresAt',
    'postedAt',
    'publishedAt',
    'status',
    'organizationId',
    'trustLevel',
    'linkHealth',
    'walkInDate',
    'walkInTime',
    'walkInVenue',
    'contactPerson',
    'contactEmail',
    'contactPhone',
    'stipend',
    'ctc',
    'salaryMin',
    'salaryMax',
    'salaryRange',
    'salaryPeriod',
    'incentives',
    'jobFunction',
    'selectionProcess',
    'notesHighlights',
    'documentsRequired',
    'numberOfOpenings',
    'isFeatured',
    'isUrgent',
    'isVerified',
    'sourceUrl',
    'sourceName',
    'notes',
    'tags',
    'attributes',
    'applicationDetails',
    'driveDetails',
] as const;

/**
 * Build the Prisma update payload for an opportunity edit from a request body,
 * dropping any key that is not explicitly editable.
 */
export function buildOpportunityUpdateData(
    data: Record<string, unknown>,
    existing: { id: string; title: string; company: string }
): Prisma.OpportunityUpdateInput {
    const updateData: Record<string, unknown> = {};

    for (const field of EDITABLE_OPPORTUNITY_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(data, field) && data[field] !== undefined) {
            updateData[field] = data[field];
        }
    }

    updateData.lastVerified = new Date();

    if (data.companyLogoUrl !== undefined) {
        updateData.companyLogoUrl = (data.companyLogoUrl as string) || null;
    } else if (data.companyWebsite !== undefined) {
        updateData.companyLogoUrl = generateCompanyLogoUrl(data.companyWebsite as string);
    }

    if (data.title || data.company) {
        const newTitle = (data.title || existing.title) as string;
        const newCompany = (data.company || existing.company) as string;
        updateData.slug = generateSlug(newTitle, newCompany, existing.id as string);
    }

    return updateData as Prisma.OpportunityUpdateInput;
}

export class OpportunityService {
    /**
     * Create new opportunity (starts as DRAFT)
     */
    static async createOpportunity(data: Partial<Opportunity>, adminId: string) {
        // Generate unique slug
        const tempId = crypto.randomUUID();
        const slug = generateSlug(data.title || '', data.company || '', tempId);

        const created = await prisma.opportunity.create({
            data: {
                ...(data as unknown as Prisma.OpportunityUncheckedCreateInput),
                companyLogoUrl: data.companyLogoUrl || generateCompanyLogoUrl(data.companyWebsite),
                id: tempId,
                slug,
                postedByUserId: adminId,
                status: OpportunityStatus.PUBLISHED as unknown as DbOpportunityStatus,
                category: (data.category || OpportunityCategory.EMPLOYMENT) as unknown as DbOpportunityCategory,
                employmentTypes: (data.employmentTypes?.length
                    ? data.employmentTypes
                    : [EmploymentType.FULL_TIME]) as unknown as DbEmploymentType[],
                recruitmentMethod: data.recruitmentMethod,
                title: data.title || '',
                company: data.company || '',
                description: data.description || '',
            },
            include: {
                driveDetails: true,
            },
        });


        return created;
    }

    /**
     * Publish opportunity (DRAFT → ACTIVE)
     */
    static async publishOpportunity(id: string, adminId: string) {
        const opportunity = await prisma.opportunity.findFirst({
            where: { id, deletedAt: null },
        });

        if (!opportunity) {
            throw new Error('Opportunity not found');
        }

        if (opportunity.postedByUserId !== adminId) {
            throw new Error('Unauthorized');
        }

        if (opportunity.status !== OpportunityStatus.DRAFT) {
            throw new Error('Can only publish draft opportunities');
        }

        const published = await prisma.opportunity.update({
            where: { id },
            data: {
                status: OpportunityStatus.PUBLISHED as unknown as DbOpportunityStatus,
                lastVerified: new Date(),
            },
        });

        // discoveryEmitter.trigger(); // Commented out to prevent automatic builds on publish
        return published;
    }

    /**
     * Update opportunity
     */
    static async updateOpportunity(id: string, data: Partial<Opportunity>, adminId: string) {
        const existing = await prisma.opportunity.findFirst({
            where: { id, deletedAt: null },
        });

        if (!existing) {
            throw new Error('Opportunity not found');
        }

        if (existing.postedByUserId !== adminId) {
            throw new Error('Unauthorized');
        }

        const updateData = buildOpportunityUpdateData(
            data as Record<string, unknown>,
            existing as unknown as { id: string; title: string; company: string }
        );

        const updated = await prisma.opportunity.update({
            where: { id },
            data: updateData,
            include: {
                driveDetails: true,
            },
        });

        // discoveryEmitter.trigger();
        return updated;
    }

    /**
     * Soft delete opportunity (sets deletedAt)
     */
    static async deleteOpportunity(id: string, adminId: string, reason: string) {
        // Only live rows are eligible: re-deleting an already-deleted row would
        // refresh deletedAt and erase the original deletion timestamp.
        const existing = await prisma.opportunity.findFirst({
            where: { id, deletedAt: null },
        });

        if (!existing) {
            throw new Error('Opportunity not found');
        }

        if (existing.postedByUserId !== adminId) {
            throw new Error('Unauthorized');
        }

        // Soft delete
        const deleted = await prisma.opportunity.update({
            where: { id },
            data: {
                status: OpportunityStatus.ARCHIVED as unknown as DbOpportunityStatus,
                deletedAt: new Date(),
                deletionReason: reason,
            },
        });


        // discoveryEmitter.trigger();
        return deleted;
    }

    /**
     * Expire opportunity (manual or automated)
     */
    static async expireOpportunity(id: string) {
        const expired = await prisma.opportunity.update({
            where: { id },
            data: {
                expiredAt: new Date(),
            },
        });

        // discoveryEmitter.trigger();
        return expired;
    }

    /**
     * Get all opportunities for admin (includes drafts, expired, removed)
     */
    static async getAllForAdmin(adminId?: string) {
        const where: Prisma.OpportunityWhereInput = {};

        if (adminId) {
            where.postedByUserId = adminId;
        }

        return await prisma.opportunity.findMany({
            where,
            include: {
                driveDetails: true,
                user: {
                    select: {
                        id: true,
                        fullName: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                postedAt: 'desc',
            },
        });
    }

    /**
     * Get eligible opportunities for a user (with eligibility filtering)
     */
    static async getEligibleOpportunities(userId: string) {
        // Get user profile
        const profile = await prisma.profile.findUnique({
            where: { userId },
        });

        if (!profile) {
            throw new Error('Profile not found - complete profile setup first');
        }

        // Build dynamic filters based on profile preferences
        const andConditions: Prisma.OpportunityWhereInput[] = [
            { status: OpportunityStatus.PUBLISHED as unknown as DbOpportunityStatus },
            { deletedAt: null },
            {
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } },
                ],
            }
        ];

        // Hard Gate: Engineering/Degree Match
        andConditions.push({
            OR: [
                { allowedDegrees: { has: (profile.educationLevel as unknown) as DbEducationLevel } },
                { allowedDegrees: { isEmpty: true } }
            ]
        });

        // Hard Gate: Batch/Passout Year Match
        andConditions.push({
            OR: [
                { allowedPassoutYears: { has: (profile.gradYear as number) || 0 } },
                { allowedPassoutYears: { isEmpty: true } }
            ]
        });

        // Preference Filter: Opportunity Category
        if (profile.interestedIn && (profile.interestedIn as unknown[]).length > 0) {
            andConditions.push({
                category: { in: (profile.interestedIn as unknown) as OpportunityCategory[] }
            });
        }

        // Preference Filter: Work Mode
        if (profile.workModes && (profile.workModes as unknown[]).length > 0) {
            andConditions.push({
                OR: [
                    { workMode: { in: (profile.workModes as unknown) as DbWorkMode[] } },
                    { workMode: null }
                ]
            });
        }

        // Preference Filter: Locations
        if (profile.preferredCities && (profile.preferredCities as string[]).length > 0) {
            andConditions.push({
                OR: [
                    { locations: { hasSome: profile.preferredCities as string[] } },
                    { locations: { isEmpty: true } }
                ]
            });
        }

        const opportunities = await prisma.opportunity.findMany({
            where: {
                AND: andConditions
            },
            include: {
                driveDetails: true,
            },
            orderBy: {
                postedAt: 'desc',
            },
            take: 200, // SAFETY LIMIT: Prevent memory exhaustion on free tier
        });

        // Filter by eligibility
        const eligibleOpportunities = (opportunities as unknown as Opportunity[])
            .map((opp) => {
                const match = calculateOpportunityMatch(profile as unknown as Profile, opp);
                return {
                    ...opp,
                    eligible: match.isEligible,
                    matchScore: match.score,
                };
            })
            .filter((opp) => opp.eligible)
            .sort((a, b) => {
                // Walk-ins first
                if (a.recruitmentMethod === RecruitmentMethod.WALK_IN && b.recruitmentMethod !== RecruitmentMethod.WALK_IN) return -1;
                if (b.recruitmentMethod === RecruitmentMethod.WALK_IN && a.recruitmentMethod !== RecruitmentMethod.WALK_IN) return 1;

                // Then by match score
                const scoreA = (a as unknown as { matchScore: number }).matchScore;
                const scoreB = (b as unknown as { matchScore: number }).matchScore;
                return scoreB - scoreA;
            });

        return eligibleOpportunities;
    }

    /**
     * Bulk action execution (DELETE, ARCHIVE, PUBLISH, EXPIRE)
     */
    static async executeBulkAction(ids: string[], action: 'DELETE' | 'ARCHIVE' | 'PUBLISH' | 'EXPIRE', reason?: string) {
        const now = new Date();
        let result: { count: number };
        let idsNeedingAlerts: string[] = [];

        switch (action) {
            case 'DELETE':
                // Only live rows are eligible: re-deleting an already-deleted row
                // would refresh its deletedAt and erase the original deletion
                // timestamp, breaking audit and any restore window.
                result = await prisma.opportunity.updateMany({
                    where: { id: { in: ids }, deletedAt: null },
                    data: { status: OpportunityStatus.ARCHIVED as unknown as DbOpportunityStatus, deletedAt: now, deletionReason: reason || 'Bulk deleted by admin' },
                });
                break;
            case 'ARCHIVE':
                result = await prisma.opportunity.updateMany({
                    where: { id: { in: ids }, deletedAt: null },
                    data: { status: OpportunityStatus.ARCHIVED as unknown as DbOpportunityStatus },
                });
                break;
            case 'PUBLISH': {
                // Publishing must never resurrect a soft-deleted listing. The old
                // query had no deletedAt guard while explicitly setting
                // deletedAt: null, so a bulk publish could silently un-delete rows
                // that had been removed and return them to the public feed.
                const liveIds = (await prisma.opportunity.findMany({
                    where: { id: { in: ids }, deletedAt: null },
                    select: { id: true, status: true },
                })).filter((row) =>
                    row.status !== (OpportunityStatus.PUBLISHED as unknown as DbOpportunityStatus)
                ).map((row) => row.id);

                idsNeedingAlerts = liveIds;
                result = liveIds.length > 0
                    ? await prisma.opportunity.updateMany({
                        where: { id: { in: liveIds }, deletedAt: null },
                        data: { status: OpportunityStatus.PUBLISHED as unknown as DbOpportunityStatus, expiredAt: null },
                    })
                    : { count: 0 };
                break;
            }
            case 'EXPIRE':
                result = await prisma.opportunity.updateMany({
                    where: { id: { in: ids }, deletedAt: null },
                    data: { expiredAt: now },
                });
                break;
            default:
                throw new Error('Invalid bulk action');
        }

        const oppsForTags = await prisma.opportunity.findMany({
            where: { id: { in: ids }, deletedAt: null },
            select: { id: true, slug: true, company: true, category: true, employmentTypes: true, recruitmentMethod: true, sector: true, locations: true, requiredSkills: true, title: true, allowedPassoutYears: true }
        });

        return {
            result,
            idsNeedingAlerts,
            oppsForTags,
        };
    }
}
