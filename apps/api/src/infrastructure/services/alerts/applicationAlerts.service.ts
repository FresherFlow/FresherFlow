/**
 * Phase 8 — application-update alerts.
 *
 * Fired when an OpportunityApplication moves stage / records an outcome.
 * One alert per (application, stage) per day; dedupeKey carries the date bucket
 * so a candidate moved twice in one day still gets exactly one notification per
 * stage, and re-moves on later days re-notify.
 */

import prisma from '../../database/prisma';
import { AlertKind } from '@fresherflow/database';
import { logger } from '@fresherflow/utils';
import { dispatchAlert, getDispatchDateBucket, newCorrelationId } from './alertDispatch.service';
import { EmailService } from './email.service';
import { sendNewJobPush } from './push.service';

export interface ApplicationStageChange {
    userId: string;
    opportunityId: string;
    applicationId: string;
    fromStage: string | null;
    toStage: string;
    outcome?: string | null;
}

export async function notifyApplicationStageChange(change: ApplicationStageChange): Promise<void> {
    const correlationId = newCorrelationId();
    const dateBucket = getDispatchDateBucket();
    const metadata = {
        applicationId: change.applicationId,
        fromStage: change.fromStage,
        toStage: change.toStage,
        outcome: change.outcome ?? null,
    };

    try {
        const user = await prisma.user.findUnique({
            where: { id: change.userId },
            select: { email: true, fullName: true, alertPreference: { select: { enabled: true, emailEnabled: true } } },
        });
        const preference = user?.alertPreference;
        if (preference && preference.enabled === false) return;

        const opportunity = await prisma.opportunity.findUnique({
            where: { id: change.opportunityId },
            select: { title: true, company: true, slug: true, category: true },
        });

        await dispatchAlert({
            userId: change.userId,
            opportunityId: change.opportunityId,
            kind: AlertKind.APPLICATION_UPDATE,
            dedupeKeyBase: `${change.userId}:APPLICATION_UPDATE:${change.applicationId}:${change.toStage}:${dateBucket}`,
            channels: ['APP'],
            metadata,
            correlationId,
        });

        // Best-effort EMAIL + PUSH: failures are logged inside dispatchAlert's
        // callers below, never thrown into the stage-move request path.
        if (user?.email && preference?.emailEnabled !== false && opportunity) {
            try {
                await EmailService.sendApplicationUpdate(user.email, user.fullName, {
                    title: opportunity.title,
                    company: opportunity.company,
                    stage: change.toStage,
                    outcome: change.outcome ?? null,
                });
            } catch (error) {
                logger.warn('[application-alerts] Update email failed', {
                    userId: change.userId,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }

        if (opportunity) {
            try {
                await sendNewJobPush(change.userId, {
                    title: `${opportunity.title} — ${change.toStage}`,
                    company: opportunity.company,
                    opportunityId: change.opportunityId,
                    opportunitySlug: opportunity.slug,
                    category: opportunity.category as unknown as string,
                });
            } catch (error) {
                logger.warn('[application-alerts] Update push failed', {
                    userId: change.userId,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
    } catch (error) {
        logger.warn('[application-alerts] Stage-change notification failed', {
            applicationId: change.applicationId,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}
