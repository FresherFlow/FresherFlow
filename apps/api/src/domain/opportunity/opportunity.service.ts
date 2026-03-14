import prisma, { Prisma } from '../../lib/prisma';

import { OpportunityStatus, OpportunityType } from '@fresherflow/types';
import { EligibilityService } from '../eligibility/eligibility.service';
import { generateSlug, generateCompanyLogoUrl } from '@fresherflow/utils';
import { searchOpportunitiesQuery, SearchResult, SearchOptions } from '@fresherflow/search';
import { logger } from '@fresherflow/logger';

/**
 * Opportunity Service - Business Logic Layer
 * 
 * Responsibilities:
 * - CRUD operations with business rules
 * - Eligibility filtering
 * - Status management
 * - Soft delete handling
 */

export class OpportunityService {
    /**
     * Search Opportunities using PostgreSQL Full-Text Search.
     */
    static async searchOpportunities(query: string, options: SearchOptions = {}): Promise<SearchResult> {
        return searchOpportunitiesQuery(query, options);
    }



    /**
     * Create new opportunity (starts as DRAFT)
     */
    static async createOpportunity(data: any, adminId: string) {
        // Generate unique slug
        const tempId = crypto.randomUUID();
        const slug = generateSlug(data.title, data.company, tempId);

        const created = await prisma.opportunity.create({
            data: {
                ...data,
                companyLogoUrl: generateCompanyLogoUrl(data.companyWebsite),
                id: tempId,
                slug,
                postedByUserId: adminId,
                status: OpportunityStatus.PUBLISHED, // Default to published for admin ease
            },
            include: {
                walkInDetails: true,
            },
        });


        return created;
    }

    /**
     * Publish opportunity (DRAFT → ACTIVE)
     */
    static async publishOpportunity(id: string, adminId: string) {
        const opportunity = await prisma.opportunity.findUnique({
            where: { id },
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
                status: OpportunityStatus.PUBLISHED,
                lastVerified: new Date(),
            },
        });

        return published;
    }

    /**
     * Update opportunity
     */
    static async updateOpportunity(id: string, data: any, adminId: string) {
        const existing = await prisma.opportunity.findUnique({
            where: { id },
        });

        if (!existing) {
            throw new Error('Opportunity not found');
        }

        if (existing.postedByUserId !== adminId) {
            throw new Error('Unauthorized');
        }

        // Regenerate slug if title or company changed
        const updateData: any = {
            ...data,
            lastVerified: new Date(),
        };

        if (data.companyWebsite !== undefined) {
            updateData.companyLogoUrl = generateCompanyLogoUrl(data.companyWebsite);
        }

        if (data.title || data.company) {
            const newTitle = data.title || existing.title;
            const newCompany = data.company || existing.company;
            updateData.slug = generateSlug(newTitle, newCompany, existing.id);
        }

        const updated = await prisma.opportunity.update({
            where: { id },
            data: updateData,
            include: {
                walkInDetails: true,
            },
        });

        return updated;
    }

    /**
     * Soft delete opportunity (sets deletedAt)
     */
    static async deleteOpportunity(id: string, adminId: string, reason: string) {
        const existing = await prisma.opportunity.findUnique({
            where: { id },
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
                status: OpportunityStatus.ARCHIVED,
                deletedAt: new Date(),
                deletionReason: reason,
            },
        });


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

        return expired;
    }

    /**
     * Get all opportunities for admin (includes drafts, expired, removed)
     */
    static async getAllForAdmin(adminId?: string) {
        const where: any = {};

        if (adminId) {
            where.postedByUserId = adminId;
        }

        return await prisma.opportunity.findMany({
            where,
            include: {
                walkInDetails: true,
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
            { status: OpportunityStatus.PUBLISHED },
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
                { allowedDegrees: { has: profile.educationLevel as any } },
                { allowedDegrees: { isEmpty: true } }
            ]
        });

        // Hard Gate: Batch/Passout Year Match
        andConditions.push({
            OR: [
                { allowedPassoutYears: { has: profile.gradYear || 0 } },
                { allowedPassoutYears: { isEmpty: true } }
            ]
        });

        // Preference Filter: Opportunity Type
        if (profile.interestedIn && profile.interestedIn.length > 0) {
            andConditions.push({
                type: { in: profile.interestedIn as any }
            });
        }

        // Preference Filter: Work Mode
        if (profile.workModes && profile.workModes.length > 0) {
            andConditions.push({
                OR: [
                    { workMode: { in: profile.workModes as any } },
                    { workMode: null }
                ]
            });
        }

        // Preference Filter: Locations
        if (profile.preferredCities && profile.preferredCities.length > 0) {
            andConditions.push({
                OR: [
                    { locations: { hasSome: profile.preferredCities } },
                    { locations: { isEmpty: true } }
                ]
            });
        }

        const opportunities = await prisma.opportunity.findMany({
            where: {
                AND: andConditions
            },
            include: {
                walkInDetails: true,
            },
            orderBy: {
                postedAt: 'desc',
            },
        });

        // Filter by eligibility
        const eligibleOpportunities = opportunities
            .map((opp: any) => {
                const eligibility = EligibilityService.checkEligibility(
                    {
                        educationLevel: profile.educationLevel as any,
                        passoutYear: profile.gradYear || 0,
                        interestedIn: profile.interestedIn as any,
                        preferredCities: profile.preferredCities,
                        workModes: profile.workModes as any,
                        availability: profile.availability as any,
                        skills: profile.skills,
                    },
                    {
                        type: opp.type as any,
                        allowedDegrees: opp.allowedDegrees as any,
                        allowedCourses: (opp as any).allowedCourses || [],
                        allowedPassoutYears: opp.allowedPassoutYears,
                        allowedAvailability: opp.allowedAvailability as any,
                        requiredSkills: opp.requiredSkills,
                        locations: opp.locations,
                        workMode: opp.workMode as any,
                    }
                );

                return {
                    ...opp,
                    eligible: eligibility.eligible,
                    matchScore: eligibility.eligible
                        ? EligibilityService.getMatchScore(
                            {
                                educationLevel: profile.educationLevel as any,
                                passoutYear: profile.gradYear || 0,
                                interestedIn: profile.interestedIn as any,
                                preferredCities: profile.preferredCities,
                                workModes: profile.workModes as any,
                                availability: profile.availability as any,
                                skills: profile.skills,
                            },
                            {
                                type: opp.type as any,
                                allowedDegrees: opp.allowedDegrees as any,
                                allowedCourses: (opp as any).allowedCourses || [],
                                allowedPassoutYears: opp.allowedPassoutYears,
                                allowedAvailability: opp.allowedAvailability as any,
                                requiredSkills: opp.requiredSkills,
                                locations: opp.locations,
                                workMode: opp.workMode as any,
                            }
                        )
                        : 0,
                };
            })
            .filter((opp: any) => opp.eligible)
            .sort((a: any, b: any) => {
                // Walk-ins first
                if (a.type === OpportunityType.WALKIN && b.type !== OpportunityType.WALKIN) return -1;
                if (b.type === OpportunityType.WALKIN && a.type !== OpportunityType.WALKIN) return 1;

                // Then by match score
                return b.matchScore - a.matchScore;
            });

        return eligibleOpportunities;
    }

    /**
     * Get single opportunity by ID
     */
    static async getOpportunityById(id: string) {
        return await prisma.opportunity.findUnique({
            where: { id },
            include: {
                walkInDetails: true,
                user: {
                    select: {
                        fullName: true,
                        email: true,
                    },
                },
            },
        });
    }

    /**
     * Get single opportunity by slug or ID (backward compatible)
     */
    static async getBySlugOrId(slugOrId: string) {
        // Try by slug first (more common for SEO URLs)
        const bySlug = await prisma.opportunity.findUnique({
            where: { slug: slugOrId },
            include: {
                walkInDetails: true,
                user: {
                    select: {
                        fullName: true,
                        email: true,
                    },
                },
            },
        });

        if (bySlug) return bySlug;

        // Fallback to ID for backward compatibility
        return await this.getOpportunityById(slugOrId);
    }
}

