import prisma from '../lib/prisma';
import { OpportunityType, OpportunityStatus } from '@fresherflow/types';
import { Prisma } from '@fresherflow/database';

type OpportunityWithWalkin = Prisma.OpportunityGetPayload<{
    include: { walkInDetails: true }
}>;

/**
 * Walk-in Service - Walk-in Event Management
 * 
 * Responsibilities:
 * - Get upcoming walk-ins
 * - City-based filtering
 * - Date-based sorting
 * - Attendance tracking
 */

export class WalkinService {
    /**
     * Get upcoming walk-ins for a city (next N days)
     */
    static async getUpcomingWalkins(city: string, days: number = 7) {
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);

        const walkins = await prisma.opportunity.findMany({
            where: {
                type: OpportunityType.WALKIN,
                status: OpportunityStatus.PUBLISHED,
                deletedAt: null,
                locations: {
                    has: city, // Array contains city
                },
            },
            include: {
                walkInDetails: true,
            },
            orderBy: {
                postedAt: 'desc',
            },
        });

        // Filter by date match in code
        const filtered = (walkins as OpportunityWithWalkin[]).filter((w) =>
            w.walkInDetails?.dates.some((d: Date) => {
                const date = new Date(d);
                return date >= now && date <= futureDate;
            })
        );

        // Sort by nearest date
        return filtered.sort((a, b) => {
            const aNextDate = a.walkInDetails?.dates.map((d: Date) => new Date(d)).find((d: Date) => d >= now) || now;
            const bNextDate = b.walkInDetails?.dates.map((d: Date) => new Date(d)).find((d: Date) => d >= now) || now;
            return aNextDate.getTime() - bNextDate.getTime();
        });
    }

    /**
     * Get today's walk-ins for a city
     */
    static async getTodayWalkins(city: string) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const walkins = await prisma.opportunity.findMany({
            where: {
                type: OpportunityType.WALKIN,
                status: OpportunityStatus.PUBLISHED,
                deletedAt: null,
                locations: {
                    has: city,
                },
            },
            include: {
                walkInDetails: true,
            },
        });

        return (walkins as OpportunityWithWalkin[]).filter((w) =>
            w.walkInDetails?.dates.some((d: Date) => {
                const date = new Date(d);
                return date >= today && date < tomorrow;
            })
        );
    }

    /**
     * Mark user as attended a walk-in
     */
    static async markAsAttended(userId: string, walkinId: string) {
        // Check if walk-in exists and is valid
        const walkin = await prisma.opportunity.findUnique({
            where: { id: walkinId },
            include: { walkInDetails: true },
        });

        if (!walkin || walkin.type !== OpportunityType.WALKIN) {
            throw new Error('Walk-in not found');
        }

        // Create or update user action
        return await prisma.userAction.upsert({
            where: {
                userId_opportunityId: {
                    userId,
                    opportunityId: walkinId,
                },
            },
            create: {
                userId,
                opportunityId: walkinId,
                actionType: 'INTERVIEWED',
            },
            update: {
                actionType: 'INTERVIEWED',
                updatedAt: new Date(),
            },
        });
    }

    /**
     * Get all walk-ins user has attended
     */
    static async getUserAttendedWalkins(userId: string) {
        const actions = await prisma.userAction.findMany({
            where: {
                userId,
                actionType: {
                    in: ['INTERVIEWED', 'ATTENDED'],
                },
            },
            include: {
                opportunity: {
                    include: {
                        walkInDetails: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        return actions.map((action) => action.opportunity);
    }
}
