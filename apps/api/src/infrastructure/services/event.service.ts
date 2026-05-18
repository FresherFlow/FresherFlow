import { PlatformEventType, Prisma } from '@fresherflow/database';
import prisma from '../database/prisma';
import { logger } from '@fresherflow/logger';
import { Redis } from 'ioredis';
import { env } from '@fresherflow/config';

// Buffered Event System
// Decouples tracking hits from DB writes using Redis
class EventService {
    private redis: Redis | null = null;
    private readonly QUEUE_KEY = 'platform:events:buffer';
    private readonly BATCH_SIZE = 50;

    constructor() {
        if (env.REDIS_ENABLED !== false && env.REDIS_URL) {
            try {
                this.redis = new Redis(env.REDIS_URL, {
                    maxRetriesPerRequest: 1,
                    enableOfflineQueue: false
                });
                this.redis.on('error', (err) => logger.warn('Redis Event Buffer error', err));
            } catch {
                logger.warn('Failed to initialize Redis for Event Buffer, falling back to direct DB');
            }
        }
    }

    /**
     * Records a platform event.
     * Uses Redis buffer if available, otherwise direct DB write (fallback).
     */
    async track(params: {
        type: PlatformEventType;
        opportunityId?: string;
        userId?: string;
        sessionId?: string;
        source?: string;
        metadata?: Record<string, unknown>;
    }) {
        const eventData = {
            ...params,
            createdAt: new Date().toISOString(),
        };

        // 1. Try Redis Buffer (Fast Path)
        if (this.redis) {
            try {
                await this.redis.lpush(this.QUEUE_KEY, JSON.stringify(eventData));

                // If buffer is getting large, we could trigger an async flush here,
                // but usually a cron/worker handles this.
                return;
            } catch (e) {
                logger.warn('Redis buffer failed, falling back to direct DB write', e);
            }
        }

        // 2. Direct DB Write (Fallback Path / Sync)
        try {
            await prisma.platformEvent.create({
                data: {
                    type: params.type,
                    opportunityId: params.opportunityId,
                    userId: params.userId,
                    sessionId: params.sessionId,
                    source: params.source || 'unknown',
                    metadata: (params.metadata || {}) as Prisma.InputJsonValue,
                }
            });
        } catch (e) {
            logger.error('Failed to record platform event (Direct Fallback)', e);
        }
    }

    /**
     * Flushes buffered events from Redis to Postgres.
     * Should be called by a worker or cron job.
     */
    async flush() {
        if (!this.redis) return;

        try {
            const events: Array<{
                type: PlatformEventType;
                opportunityId?: string;
                userId?: string;
                sessionId?: string;
                source?: string;
                metadata?: Record<string, unknown>;
                createdAt: string;
            }> = [];

            // Pop in batches
            for (let i = 0; i < this.BATCH_SIZE; i++) {
                const raw = await this.redis.rpop(this.QUEUE_KEY);
                if (!raw) break;
                events.push(JSON.parse(raw));
            }

            if (events.length === 0) return;

            // Batch write to DB
            await prisma.platformEvent.createMany({
                data: events.map(e => ({
                    type: e.type,
                    opportunityId: e.opportunityId,
                    userId: e.userId,
                    sessionId: e.sessionId,
                    source: e.source || 'unknown',
                    metadata: (e.metadata || {}) as Prisma.InputJsonValue,
                    createdAt: new Date(e.createdAt)
                }))
            });

            logger.info(`Flushed ${events.length} platform events to database`);
        } catch (e) {
            logger.error('Failed to flush buffered events', e);
        }
    }
}

export const eventService = new EventService();
