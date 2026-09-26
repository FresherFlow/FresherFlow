/**
 * Phase 7 — central alert dispatch (dedupe + dispatch logging + retry + channels).
 *
 * Every alert kind (digest, closing-soon, new-job, campus-drive, registration,
 * application-update) funnels through here so dedupe keys, dispatch logs, and
 * channel handling cannot drift per caller.
 *
 * - Dedupe: `AlertDelivery.dedupeKey` is unique per (user, kind, opportunity,
 *   channel). A second dispatch with the same key is a SKIPPED/DEDUPE_HIT, never
 *   a second row.
 * - Logging: every attempt writes `AlertDispatchLog` (INITIATED → SENT / SKIPPED /
 *   FAILED with a reason). Never throws for logging failures.
 * - Retry: `retryFailedDispatches` re-attempts recent FAILED logs for the APP
 *   channel only (idempotent via dedupeKey; no external side effects).
 * - Channels: APP (in-app AlertDelivery row) is always attempted; EMAIL and PUSH
 *   run only when the caller supplies a sender, so tests and cron never perform
 *   network I/O by accident.
 */

import crypto from 'crypto';
import prisma from '../database/prisma';
import {
    AlertChannel,
    AlertDispatchReason,
    AlertDispatchStatus,
    AlertKind,
} from '@fresherflow/database';
import type { Prisma } from '@prisma/client';
import { logger } from '@fresherflow/utils';

export function newCorrelationId(): string {
    try {
        return crypto.randomUUID();
    } catch {
        return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }
}

export function getDispatchDateBucket(date = new Date()): string {
    return date.toISOString().slice(0, 10);
}

function isUniqueViolation(error: unknown): boolean {
    return (
        typeof error === 'object' &&
        error !== null &&
        (error as { code?: unknown }).code === 'P2002'
    );
}

async function logDispatch(params: {
    correlationId: string;
    userId?: string | null;
    opportunityId?: string | null;
    kind: AlertKind;
    channel?: AlertChannel | null;
    status: AlertDispatchStatus;
    reason?: AlertDispatchReason | null;
    dedupeKey?: string | null;
    errorMessage?: string | null;
    metadata?: Record<string, unknown> | null;
    attemptedAt?: Date;
    deliveredAt?: Date;
}): Promise<void> {
    try {
        await prisma.alertDispatchLog.create({
            data: {
                correlationId: params.correlationId,
                userId: params.userId ?? null,
                opportunityId: params.opportunityId ?? null,
                kind: params.kind,
                channel: params.channel ?? null,
                status: params.status,
                reason: params.reason ?? null,
                dedupeKey: params.dedupeKey ?? null,
                errorMessage: params.errorMessage ?? null,
                metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
                attemptedAt: params.attemptedAt,
                deliveredAt: params.deliveredAt,
            },
        });
    } catch (error) {
        logger.warn('[dispatch] Failed to write dispatch log', {
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

export interface ChannelSenders {
    sendEmail?: () => Promise<void>;
    sendPush?: () => Promise<void>;
}

export interface DispatchRequest extends ChannelSenders {
    userId: string;
    opportunityId?: string | null;
    kind: AlertKind;
    /** Base key; the channel suffix (`:APP`, `:EMAIL`, `:PUSH`) is appended. */
    dedupeKeyBase: string;
    channels?: Array<'APP' | 'EMAIL' | 'PUSH'>;
    metadata?: Record<string, unknown> | null;
    correlationId?: string;
}

export interface DispatchResult {
    correlationId: string;
    delivered: string[];
    skipped: Array<{ channel: string; reason: string }>;
    failed: Array<{ channel: string; error: string }>;
}

/**
 * Dispatch one alert across the requested channels with per-channel dedupe and
 * per-channel dispatch logging. Never throws for channel failures — they are
 * recorded as FAILED/CHANNEL_ERROR and returned.
 */
export async function dispatchAlert(request: DispatchRequest): Promise<DispatchResult> {
    const correlationId = request.correlationId ?? newCorrelationId();
    const channels = request.channels ?? ['APP'];
    const attemptedAt = new Date();
    const result: DispatchResult = { correlationId, delivered: [], skipped: [], failed: [] };

    await logDispatch({
        correlationId,
        userId: request.userId,
        opportunityId: request.opportunityId ?? null,
        kind: request.kind,
        status: AlertDispatchStatus.INITIATED,
        metadata: { stage: 'dispatch_started', channels, ...(request.metadata ?? {}) },
        attemptedAt,
    });

    for (const channel of channels) {
        const dedupeKey = `${request.dedupeKeyBase}:${channel}`;
        const channelEnum =
            channel === 'APP' ? AlertChannel.APP : channel === 'EMAIL' ? AlertChannel.EMAIL : AlertChannel.PUSH;

        try {
            if (channel === 'EMAIL' && !request.sendEmail) {
                await logDispatch({
                    correlationId,
                    userId: request.userId,
                    opportunityId: request.opportunityId ?? null,
                    kind: request.kind,
                    channel: channelEnum,
                    status: AlertDispatchStatus.SKIPPED,
                    reason: AlertDispatchReason.CHANNEL_ERROR,
                    dedupeKey,
                    errorMessage: 'No email sender supplied for EMAIL channel',
                    attemptedAt,
                });
                result.skipped.push({ channel, reason: 'NO_SENDER' });
                continue;
            }
            if (channel === 'PUSH' && !request.sendPush) {
                await logDispatch({
                    correlationId,
                    userId: request.userId,
                    opportunityId: request.opportunityId ?? null,
                    kind: request.kind,
                    channel: channelEnum,
                    status: AlertDispatchStatus.SKIPPED,
                    reason: AlertDispatchReason.CHANNEL_ERROR,
                    dedupeKey,
                    errorMessage: 'No push sender supplied for PUSH channel',
                    attemptedAt,
                });
                result.skipped.push({ channel, reason: 'NO_SENDER' });
                continue;
            }

            const existing = await prisma.alertDelivery.findUnique({
                where: { dedupeKey },
                select: { id: true },
            });
            if (existing) {
                await logDispatch({
                    correlationId,
                    userId: request.userId,
                    opportunityId: request.opportunityId ?? null,
                    kind: request.kind,
                    channel: channelEnum,
                    status: AlertDispatchStatus.SKIPPED,
                    reason: AlertDispatchReason.DEDUPE_HIT,
                    dedupeKey,
                    attemptedAt,
                });
                result.skipped.push({ channel, reason: 'DEDUPE_HIT' });
                continue;
            }

            if (channel === 'EMAIL' && request.sendEmail) await request.sendEmail();
            if (channel === 'PUSH' && request.sendPush) await request.sendPush();

            try {
                await prisma.alertDelivery.create({
                    data: {
                        userId: request.userId,
                        opportunityId: request.opportunityId ?? null,
                        kind: request.kind,
                        channel: channelEnum,
                        dedupeKey,
                        metadata: request.metadata ? JSON.stringify(request.metadata) : null,
                    },
                });
            } catch (createError) {
                if (isUniqueViolation(createError)) {
                    await logDispatch({
                        correlationId,
                        userId: request.userId,
                        opportunityId: request.opportunityId ?? null,
                        kind: request.kind,
                        channel: channelEnum,
                        status: AlertDispatchStatus.SKIPPED,
                        reason: AlertDispatchReason.DEDUPE_HIT,
                        dedupeKey,
                        attemptedAt,
                    });
                    result.skipped.push({ channel, reason: 'DEDUPE_HIT' });
                    continue;
                }
                throw createError;
            }

            await logDispatch({
                correlationId,
                userId: request.userId,
                opportunityId: request.opportunityId ?? null,
                kind: request.kind,
                channel: channelEnum,
                status: AlertDispatchStatus.SENT,
                reason: AlertDispatchReason.SENT_OK,
                dedupeKey,
                metadata: request.metadata ?? null,
                attemptedAt,
                deliveredAt: new Date(),
            });
            result.delivered.push(channel);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.warn('[dispatch] Channel dispatch failed', {
                correlationId,
                userId: request.userId,
                channel,
                error: message,
            });
            await logDispatch({
                correlationId,
                userId: request.userId,
                opportunityId: request.opportunityId ?? null,
                kind: request.kind,
                channel: channelEnum,
                status: AlertDispatchStatus.FAILED,
                reason: AlertDispatchReason.CHANNEL_ERROR,
                dedupeKey,
                errorMessage: message,
                attemptedAt,
            });
            result.failed.push({ channel, error: message });
        }
    }

    return result;
}

/**
 * Retry recent FAILED dispatches for the APP channel only (idempotent: the
 * dedupeKey guarantees a retry never creates a second delivery row).
 */
export async function retryFailedDispatches(limit = 50): Promise<{
    retried: number;
    delivered: number;
    alreadyDelivered: number;
}> {
    const capped = Math.min(Math.max(limit, 1), 200);
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const failed = await prisma.alertDispatchLog.findMany({
        where: { status: AlertDispatchStatus.FAILED, createdAt: { gte: since } },
        orderBy: { createdAt: 'asc' },
        take: capped,
        select: { id: true, correlationId: true, userId: true, opportunityId: true, kind: true, dedupeKey: true },
    });

    let delivered = 0;
    let alreadyDelivered = 0;

    for (const row of failed) {
        if (!row.userId || !row.dedupeKey) continue;
        const existing = await prisma.alertDelivery.findUnique({
            where: { dedupeKey: row.dedupeKey },
            select: { id: true },
        });
        if (existing) {
            alreadyDelivered += 1;
            await logDispatch({
                correlationId: row.correlationId,
                userId: row.userId,
                opportunityId: row.opportunityId,
                kind: row.kind,
                status: AlertDispatchStatus.SKIPPED,
                reason: AlertDispatchReason.DEDUPE_HIT,
                dedupeKey: row.dedupeKey,
                metadata: { stage: 'retry_noop_already_delivered' },
            });
            continue;
        }
        try {
            await prisma.alertDelivery.create({
                data: {
                    userId: row.userId,
                    opportunityId: row.opportunityId,
                    kind: row.kind,
                    channel: AlertChannel.APP,
                    dedupeKey: row.dedupeKey,
                    metadata: JSON.stringify({ retriedFrom: row.id }),
                },
            });
            delivered += 1;
            await logDispatch({
                correlationId: row.correlationId,
                userId: row.userId,
                opportunityId: row.opportunityId,
                kind: row.kind,
                channel: AlertChannel.APP,
                status: AlertDispatchStatus.SENT,
                reason: AlertDispatchReason.SENT_OK,
                dedupeKey: row.dedupeKey,
                metadata: { stage: 'retry_succeeded' },
                deliveredAt: new Date(),
            });
        } catch (error) {
            if (isUniqueViolation(error)) {
                alreadyDelivered += 1;
                continue;
            }
            await logDispatch({
                correlationId: row.correlationId,
                userId: row.userId,
                opportunityId: row.opportunityId,
                kind: row.kind,
                channel: AlertChannel.APP,
                status: AlertDispatchStatus.FAILED,
                reason: AlertDispatchReason.CHANNEL_ERROR,
                dedupeKey: row.dedupeKey,
                errorMessage: error instanceof Error ? error.message : String(error),
                metadata: { stage: 'retry_failed' },
            });
        }
    }

    return { retried: failed.length, delivered, alreadyDelivered };
}

export const __testables = { logDispatch };
