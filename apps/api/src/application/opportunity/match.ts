import prisma, { Prisma, EducationLevel } from '../../infrastructure/database/prisma';
import { 
    OpportunityStatus, 
    Opportunity, 
    Profile 
} from '@fresherflow/types';
import { 
    checkEligibility, 
    rankOpportunitiesForUser, 
    RankedOpportunity 
} from '@fresherflow/domain';

/**
 * Use Case: Match Opportunities for a specific user
 */
export async function matchOpportunitiesForUser(userId: string): Promise<RankedOpportunity<Opportunity>[]> {
    const profile = (await prisma.profile.findUnique({
        where: { userId },
    })) as unknown as Profile | null;

    if (!profile) throw new Error('Profile not found');

    // SQL Tier: High-level filtering for performance
    const conditions: Prisma.OpportunityWhereInput[] = [
        { status: OpportunityStatus.PUBLISHED as unknown as Prisma.EnumOpportunityStatusFilter<"Opportunity"> },
        { deletedAt: null },
        {
            OR: [
                { expiresAt: null }, 
                { expiresAt: { gt: new Date() } },
            ],
        }
    ];

    // Basic degree check at DB level
    if (profile.educationLevel) {
        conditions.push({
            OR: [
                { allowedDegrees: { has: profile.educationLevel as unknown as EducationLevel } },
                { allowedDegrees: { isEmpty: true } }
            ]
        });
    }

    const rawOpportunities = await prisma.opportunity.findMany({
        where: { AND: conditions },
        include: { walkInDetails: true },
        orderBy: { postedAt: 'desc' },
        take: 200,
    });

    // Domain Tier: Pure business logic (matching, reasoning, ranking)
    const eligible = (rawOpportunities as unknown as Opportunity[]).filter(opp => 
        checkEligibility(opp, (profile as unknown as Profile)).eligible
    );

    return rankOpportunitiesForUser(eligible, (profile as unknown as Profile));
}
