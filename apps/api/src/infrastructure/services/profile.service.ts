import prisma from '../database/prisma';
import { Prisma } from '@prisma/client';
import { Profile, Gender, ReservationCategory } from '@fresherflow/types';
import { calculateCompletion, normalizeProfileEducation, normalizeSkills } from '@fresherflow/domain';
import { areOpportunityUrlsEquivalent, getOpportunityUrlAliases, normalizeOpportunityUrl } from '@fresherflow/utils';
import { AppError } from '../../middleware/errorHandler';
import TelegramService from './telegram.service';
import { StaticFeedService } from './staticFeed.service';
import { FirebaseDbService } from './firebaseDb.service';

export interface ProfileUpdateData {
    fullName?: string;
    educationLevel?: string;
    tenthYear?: number;
    twelfthYear?: number;
    gradCourse?: string;
    gradSpecialization?: string;
    gradYear?: number;
    pgCourse?: string;
    pgSpecialization?: string;
    pgYear?: number;
    interestedIn?: string[];
    preferredCities?: string[];
    workModes?: string[];
    availability?: string;
    skills?: string[];
    dob?: string | Date | null;
    gender?: Gender | null;
    category?: ReservationCategory | null;
    isPwBD?: boolean | null;
    isExServicemen?: boolean | null;
    homeState?: string | null;
}

export interface ProfilePreferencesData {
    interestedIn?: string[];
    preferredCities?: string[];
    workModes?: string[];
}

export interface ProfileReadinessData {
    availability?: string;
    skills?: string[];
}

export interface ReferralData {
    title?: string;
    company?: string;
    description?: string;
    contact?: string;
    companyUrl?: string;
    eligibleBatches?: string;
    [key: string]: unknown;
}
async function hydrateProfileCompletion(userId: string, profile: Partial<Profile> | null) {
    if (!profile) return null;

    const calculatedCompletion = calculateCompletion(profile as unknown as Profile);
    if (profile.completionPercentage === calculatedCompletion) {
        return profile;
    }

    const updatedProfile = await prisma.profile.update({
        where: { userId },
        data: { completionPercentage: calculatedCompletion }
    });

    return updatedProfile;
}

export class ProfileService {
    static async getProfile(userId: string): Promise<Profile> {
        const storedProfile = await prisma.profile.findUnique({
            where: { userId }
        });

        if (!storedProfile) {
            throw new AppError('Profile not found', 404);
        }

        const profile = await hydrateProfileCompletion(userId, storedProfile);
        return profile as unknown as Profile;
    }

    static async updateProfile(userId: string, data: ProfileUpdateData): Promise<{ profile: Profile, newCompletion: number }> {
        const { fullName, ...profileData } = data;
        const normalizedGrad = normalizeProfileEducation(profileData.gradCourse, profileData.gradSpecialization);
        const normalizedPg = normalizeProfileEducation(profileData.pgCourse, profileData.pgSpecialization);
        const normSkills = normalizeSkills(profileData.skills);

        let dob: Date | null | undefined = undefined;
        if (profileData.dob !== undefined) {
            if (profileData.dob === null || profileData.dob === '') {
                dob = null;
            } else {
                const parsedDob = new Date(profileData.dob);
                if (isNaN(parsedDob.getTime())) {
                    throw new AppError('Invalid date of birth format', 400);
                }
                dob = parsedDob;
            }
        }

        if (profileData.gender !== undefined && profileData.gender !== null && !Object.values(Gender).includes(profileData.gender)) {
            throw new AppError('Invalid gender value', 400);
        }
        if (profileData.category !== undefined && profileData.category !== null && !Object.values(ReservationCategory).includes(profileData.category)) {
            throw new AppError('Invalid category value', 400);
        }
        if (profileData.isPwBD !== undefined && profileData.isPwBD !== null && typeof profileData.isPwBD !== 'boolean') {
            throw new AppError('isPwBD must be a boolean', 400);
        }
        if (profileData.isExServicemen !== undefined && profileData.isExServicemen !== null && typeof profileData.isExServicemen !== 'boolean') {
            throw new AppError('isExServicemen must be a boolean', 400);
        }
        if (profileData.homeState !== undefined && profileData.homeState !== null && typeof profileData.homeState !== 'string') {
            throw new AppError('homeState must be a string', 400);
        }

        // Update user if fullName is provided
        if (fullName) {
            await prisma.user.update({
                where: { id: userId },
                data: { fullName }
            });
        }

        // Update profile
        let profile = await prisma.profile.update({
            where: { userId },
            data: {
                educationLevel: profileData.educationLevel,
                tenthYear: profileData.tenthYear,
                twelfthYear: profileData.twelfthYear,
                gradCourse: normalizedGrad.course,
                gradSpecialization: normalizedGrad.specialization,
                gradYear: profileData.gradYear,
                pgCourse: normalizedPg.course || null,
                pgSpecialization: normalizedPg.specialization || null,
                pgYear: profileData.pgYear,
                interestedIn: profileData.interestedIn,
                preferredCities: profileData.preferredCities,
                workModes: profileData.workModes,
                availability: profileData.availability,
                skills: normSkills,
                dob: dob,
                gender: profileData.gender,
                category: profileData.category,
                isPwBD: profileData.isPwBD,
                isExServicemen: profileData.isExServicemen,
                homeState: profileData.homeState
            }
        });

        // Recalculate completion percentage
        const newCompletion = calculateCompletion((profile as unknown) as Profile);
        profile = await prisma.profile.update({
            where: { userId },
            data: { completionPercentage: newCompletion }
        });

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { firebase_uid: true, fullName: true }
        });
        
        if (user?.firebase_uid) {
            void FirebaseDbService.updateOnboardingRecord(user.firebase_uid, {
                fullName: user.fullName,
                profileCompleted: newCompletion === 100
            });
        }

        return {
            profile: profile as unknown as Profile,
            newCompletion
        };
    }

    static async updateEducation(userId: string, data: ProfileUpdateData): Promise<{ profile: Profile, newCompletion: number }> {
        const {
            fullName,
            educationLevel,
            tenthYear,
            twelfthYear,
            gradCourse, gradSpecialization, gradYear,
            pgCourse, pgSpecialization, pgYear,
            dob, gender, category, isPwBD, isExServicemen, homeState
        } = data;
        const normalizedGrad = normalizeProfileEducation(gradCourse, gradSpecialization);
        const normalizedPg = normalizeProfileEducation(pgCourse, pgSpecialization);

        // Update user if fullName is provided
        if (fullName) {
            await prisma.user.update({
                where: { id: userId },
                data: { fullName }
            });
        }

        // Update profile
        let profile = await prisma.profile.update({
            where: { userId },
            data: {
                educationLevel,
                tenthYear,
                twelfthYear,
                gradCourse: normalizedGrad.course,
                gradSpecialization: normalizedGrad.specialization,
                gradYear,
                pgCourse: normalizedPg.course || null,
                pgSpecialization: normalizedPg.specialization || null,
                pgYear,
                dob,
                gender,
                category,
                isPwBD,
                isExServicemen,
                homeState
            }
        });

        // Recalculate completion percentage
        const newCompletion = calculateCompletion((profile as unknown) as Profile);
        profile = await prisma.profile.update({
            where: { userId },
            data: { completionPercentage: newCompletion }
        });

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { firebase_uid: true, fullName: true }
        });

        if (user?.firebase_uid) {
            void FirebaseDbService.updateOnboardingRecord(user.firebase_uid, {
                fullName: user.fullName,
                profileCompleted: newCompletion === 100
            });
        }

        return {
            profile: profile as unknown as Profile,
            newCompletion
        };
    }

    static async updatePreferences(userId: string, data: ProfilePreferencesData): Promise<{ profile: Profile, newCompletion: number }> {
        const { interestedIn, preferredCities, workModes } = data;

        // Validate max 5 cities
        if (preferredCities && preferredCities.length > 5) {
            throw new AppError('Maximum 5 cities allowed', 400);
        }

        let profile = await prisma.profile.update({
            where: { userId },
            data: {
                interestedIn,
                preferredCities,
                workModes
            }
        });

        // Recalculate completion
        const newCompletion = calculateCompletion((profile as unknown) as Profile);
        profile = await prisma.profile.update({
            where: { userId },
            data: { completionPercentage: newCompletion }
        });

        return {
            profile: profile as unknown as Profile,
            newCompletion
        };
    }

    static async updateReadiness(userId: string, data: ProfileReadinessData): Promise<{ profile: Profile, newCompletion: number }> {
        const { availability, skills } = data;
        const normSkills = normalizeSkills(skills);

        let profile = await prisma.profile.update({
            where: { userId },
            data: {
                availability,
                skills: normSkills
            }
        });

        // Recalculate completion
        const newCompletion = calculateCompletion((profile as unknown) as Profile);
        profile = await prisma.profile.update({
            where: { userId },
            data: { completionPercentage: newCompletion }
        });

        return {
            profile: profile as unknown as Profile,
            newCompletion
        };
    }

    static async getCompletion(userId: string): Promise<{ completionPercentage: number, isComplete: boolean }> {
        const profile = await prisma.profile.findUnique({
            where: { userId }
        });

        if (!profile) {
            throw new AppError('Profile not found', 404);
        }

        return {
            completionPercentage: profile.completionPercentage,
            isComplete: profile.completionPercentage === 100
        };
    }

    static async registerPushToken(userId: string, token: string, platform: string, userAgent?: string): Promise<void> {
        await prisma.pushSubscription.upsert({
            where: { userId },
            create: {
                userId,
                endpoint: token,
                p256dh: platform === 'expo' ? 'EXPO' : 'NATIVE',
                auth: 'NONE',
                userAgent
            },
            update: {
                endpoint: token,
                p256dh: platform === 'expo' ? 'EXPO' : 'NATIVE',
                userAgent
            }
        });
    }

    static async getShares(userId: string, page: number, limit: number): Promise<{
        shares: unknown[],
        resources: unknown[],
        stats: { totalShared: number, totalPublished: number, approvalRate: number },
        total: number,
        totalResources: number,
        hasMore: boolean
    }> {
        const skip = (page - 1) * limit;

        const shares = await prisma.rawOpportunity.findMany({
            where: { createdByUserId: userId },
            include: {
                mappedOpportunity: {
                    select: {
                        id: true,
                        title: true,
                        company: true,
                        status: true,
                        publishedAt: true,
                        expiredAt: true,
                        deletedAt: true,
                        deletionReason: true,
                        clicksCount: true,
                        savesCount: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        });

        const total = await prisma.rawOpportunity.count({ where: { createdByUserId: userId } });
        
        // Also fetch user's shared resources
        const resources = await prisma.resourceCollection.findMany({
            where: { addedByUserId: userId },
            include: {
                items: true
            },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit,
        });
        const totalResources = await prisma.resourceCollection.count({ where: { addedByUserId: userId } });

        const totalShared = total;
        const totalPublished = await prisma.opportunity.count({
            where: {
                rawIngestions: { some: { createdByUserId: userId } },
                status: 'PUBLISHED'
            }
        });

        return {
            shares,
            resources,
            stats: {
                totalShared,
                totalPublished,
                approvalRate: totalShared > 0 ? Math.round((totalPublished / totalShared) * 100) : 0
            },
            total,
            totalResources,
            hasMore: skip + shares.length < total || skip + resources.length < totalResources
        };
    }

    static async createShare(userId: string, data: { url?: string | null, referral?: ReferralData, rawUrl?: string | null }): Promise<unknown> {
        const { url: rawUrl, referral } = data;
        const url = rawUrl ? normalizeOpportunityUrl(rawUrl) : null;

        if (url) {
            const aliases = getOpportunityUrlAliases(url);
            const searchConditions: Prisma.OpportunityWhereInput[] = [
                { sourceLink: { in: aliases } },
                { applyLink: { in: aliases } }
            ];

            const linkedinMatch = url.match(/linkedin\.com\/jobs\/view\/(\d+)/);
            if (linkedinMatch) {
                searchConditions.push({ sourceLink: { contains: linkedinMatch[1] } });
                searchConditions.push({ applyLink: { contains: linkedinMatch[1] } });
            }

            const naukriMatch = url.match(/naukri\.com\/job-listings-(\d+)/);
            if (naukriMatch) {
                searchConditions.push({ sourceLink: { contains: naukriMatch[1] } });
                searchConditions.push({ applyLink: { contains: naukriMatch[1] } });
            }

            // Check for existing opportunity
            const existingOpCandidates = await prisma.opportunity.findMany({
                where: {
                    OR: searchConditions,
                    deletedAt: null
                },
                take: 25,
            });
            const existingOp = existingOpCandidates.find(candidate =>
                (candidate.sourceLink && areOpportunityUrlsEquivalent(candidate.sourceLink, url)) ||
                (candidate.applyLink && areOpportunityUrlsEquivalent(candidate.applyLink, url))
            );

            if (existingOp) {
                throw new AppError('This opportunity is already live on FresherFlow', 409);
            }

            // Check for existing raw contribution
            const existingRawCandidates = await prisma.rawOpportunity.findMany({
                where: {
                    OR: searchConditions as Prisma.RawOpportunityWhereInput[]
                },
                take: 25,
            });
            const existingRaw = existingRawCandidates.find(candidate =>
                (candidate.sourceLink && areOpportunityUrlsEquivalent(candidate.sourceLink, url)) ||
                (candidate.applyLink && areOpportunityUrlsEquivalent(candidate.applyLink, url))
            );

            if (existingRaw) {
                throw new AppError('This link has already been submitted and is under review', 409);
            }
        }

        // Get or create crowdsourced ingestion source
        let ingestionSource = await prisma.ingestionSource.findFirst({
            where: { name: 'Crowdsourced Links' }
        });

        if (!ingestionSource) {
            try {
                ingestionSource = await prisma.ingestionSource.create({
                    data: {
                        name: 'Crowdsourced Links',
                        sourceType: 'CUSTOM',
                        endpoint: 'Internal Submissions',
                        defaultType: 'JOB',
                    }
                });
            } catch {
                ingestionSource = await prisma.ingestionSource.findFirst({
                    where: { name: 'Crowdsourced Links' }
                });
            }
        }

        if (!ingestionSource) {
            throw new AppError('Could not resolve ingestion source', 500);
        }

        const share = await prisma.rawOpportunity.create({
            data: {
                sourceId: ingestionSource.id as string,
                sourceLink: url,
                status: 'FETCHED',
                reasonFlags: referral ? ['USER_REFERRAL'] : ['USER_CONTRIBUTED'],
                createdByUserId: userId,
                rawPayload: {
                    url: url,
                    originalUrl: rawUrl,
                    referral: referral,
                    submittedAt: new Date().toISOString()
                }
            }
        });

        // If it's a referral, create a DRAFT Opportunity synchronously so it shows up in Admin Review Queue
        if (referral) {
            const title = referral.title || 'New Referral';
            const companyName = referral.company || 'Unknown Company';
            const baseSlug = `${title.toLowerCase().replace(/\s+/g, '-')}-at-${companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
            const uniqueSlug = `${baseSlug}-${share.id.slice(-6)}`;

            const opportunity = await prisma.opportunity.create({
                data: {
                    slug: uniqueSlug,
                    title,
                    company: companyName,
                    type: 'JOB',
                    status: 'DRAFT',
                    description: referral.description || null,
                    applyLink: referral.contact || null,
                    sourceLink: referral.companyUrl || null,
                    postedByUserId: userId,
                    sharesCount: 1,
                    notesHighlights: referral.eligibleBatches ? `Eligible Batches: ${referral.eligibleBatches}` : null,
                }
            });

            await prisma.rawOpportunity.update({
                where: { id: share.id },
                data: {
                    status: 'DRAFT_CREATED',
                    mappedOpportunityId: opportunity.id
                }
            });
        }

        // Notify via Telegram (async)
        if (url) {
            void TelegramService.notifyJobSubmission(url, `user:${userId}`);
        } else if (referral) {
            void TelegramService.notifyJobSubmission(`REFERRAL: ${referral.company}`, `user:${userId}`);
        }

        return share;
    }

    static async checkUsername(username: string): Promise<boolean> {
        if (!username || username.length < 3) return false;
        const existing = await prisma.user.findUnique({
            where: { username }
        });
        return !existing;
    }

    static async claimUsername(userId: string, username: string, cooldownDays: number): Promise<string> {
        // 1. Basic Validation
        if (!username || username.length < 3 || username.length > 20) {
            throw new AppError('Username must be 3-20 characters', 400);
        }
        if (!/^[a-z0-9_]+$/.test(username)) {
            throw new AppError('Username can only contain lowercase letters, numbers, and underscores', 400);
        }

        // 2. Cooldown Check
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { username: true, usernameUpdatedAt: true, firebase_uid: true }
        });

        if (user?.usernameUpdatedAt) {
            const lastUpdate = new Date(user.usernameUpdatedAt);
            const now = new Date();
            const daysSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
            
            if (daysSinceUpdate < cooldownDays) {
                throw new AppError(`Username can only be changed once every ${cooldownDays} days. Please wait ${Math.ceil(cooldownDays - daysSinceUpdate)} more days.`, 403);
            }
        }

        // 3. Availability Check
        const existing = await prisma.user.findUnique({
            where: { username }
        });

        if (existing && existing.id !== userId) {
            throw new AppError('Username is already taken', 409);
        }

        // 4. Update
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { 
                username,
                usernameUpdatedAt: new Date()
            }
        });

        // Sync to Firebase RTDB for cold-start caching
        if (user?.firebase_uid) {
            void FirebaseDbService.updateOnboardingRecord(user.firebase_uid, {
                username: updatedUser.username,
                skipUsernameSetup: true
            });
        }

        // Regenerate static usernames index instantly
        void StaticFeedService.refreshUsernames();

        return updatedUser.username as string;
    }
}
