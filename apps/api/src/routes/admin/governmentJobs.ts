import { Router } from 'express';
import { prisma } from '@fresherflow/database';
import { requireAdmin } from '../../middleware/auth';
import { logger } from '@fresherflow/logger';

const router = Router();

// Zod schema for the JSON payload validation can go here, but for now we'll rely on Prisma's typings 
// and a basic check since it's an admin endpoint.

router.post('/', requireAdmin, async (req, res, next) => {
    try {
        const payload = req.body;

        if (!payload.opportunityId) {
             res.status(400).json({ error: 'opportunityId is required to associate this government job data with an opportunity.' });
             return;
        }

        const govtJob = await prisma.governmentJobDetails.upsert({
            where: { opportunityId: payload.opportunityId },
            create: {
                opportunityId: payload.opportunityId,
                recruitingBody: payload.recruitingBody,
                advertisementNumber: payload.advertisementNumber,
                governmentLevel: payload.governmentLevel || 'CENTRAL',
                vacancyNature: payload.vacancyNature || 'PERMANENT',
                importantDates: payload.importantDates || [],
                applicationFee: payload.applicationFee,
                feeBreakdown: payload.feeBreakdown,
                vacancyCount: payload.vacancyCount,
                vacancyBreakdown: payload.vacancyBreakdown || [],
                ageMin: payload.ageMin,
                ageMax: payload.ageMax,
                ageRelaxationRules: payload.ageRelaxationRules || [],
                qualificationDetails: payload.qualificationDetails || [],
                physicalStandards: payload.physicalStandards,
                selectionStages: payload.selectionStages || [],
                examPattern: payload.examPattern,
                basicPay: payload.basicPay,
                payLevel: payload.payLevel,
                examCenters: payload.examCenters || [],
                applicationMode: payload.applicationMode || 'ONLINE',
                importantInstructions: payload.importantInstructions,
                notificationPdfUrl: payload.notificationPdfUrl,
                officialNotificationUrl: payload.officialNotificationUrl,
                applicationStatus: payload.applicationStatus || 'UPCOMING',
                extraMetadata: payload.extraMetadata || {}
            },
            update: {
                recruitingBody: payload.recruitingBody,
                advertisementNumber: payload.advertisementNumber,
                governmentLevel: payload.governmentLevel,
                vacancyNature: payload.vacancyNature,
                importantDates: payload.importantDates,
                applicationFee: payload.applicationFee,
                feeBreakdown: payload.feeBreakdown,
                vacancyCount: payload.vacancyCount,
                vacancyBreakdown: payload.vacancyBreakdown,
                ageMin: payload.ageMin,
                ageMax: payload.ageMax,
                ageRelaxationRules: payload.ageRelaxationRules,
                qualificationDetails: payload.qualificationDetails,
                physicalStandards: payload.physicalStandards,
                selectionStages: payload.selectionStages,
                examPattern: payload.examPattern,
                basicPay: payload.basicPay,
                payLevel: payload.payLevel,
                examCenters: payload.examCenters,
                applicationMode: payload.applicationMode,
                importantInstructions: payload.importantInstructions,
                notificationPdfUrl: payload.notificationPdfUrl,
                officialNotificationUrl: payload.officialNotificationUrl,
                applicationStatus: payload.applicationStatus,
                extraMetadata: payload.extraMetadata
            }
        });

        res.status(200).json(govtJob);
    } catch (error) {
        logger.error('Error upserting Government Job', { error, body: req.body });
        next(error);
    }
});

router.get('/', requireAdmin, async (req, res, next) => {
    try {
        const jobs = await prisma.governmentJobDetails.findMany({
            include: {
                opportunity: {
                    select: { title: true, company: true, status: true }
                }
            },
            orderBy: {
                updatedAt: 'desc'
            }
        });
        res.status(200).json(jobs);
    } catch (error) {
        logger.error('Error fetching admin government jobs', { error });
        next(error);
    }
});

export default router;
