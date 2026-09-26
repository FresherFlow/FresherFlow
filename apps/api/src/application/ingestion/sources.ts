/**
 * Phase 13 - ingestion source management.
 *
 * Source CRUD, plus the "which sources are due" query the scheduler uses.
 * Endpoint validation happens here rather than in the route so that any
 * caller (route, seed script, worker) gets the same SSRF check.
 */

import prisma from '../../infrastructure/database/prisma';
import type { Prisma } from '@fresherflow/database';
import type { IngestionSourceType, OpportunityCategory } from '@fresherflow/database';
import { assertSafeEndpoint, UnsafeEndpointError } from './safeFetch';
import { listSupportedSourceTypes } from './connectors';

export interface SourceInput {
    name: string;
    sourceType: IngestionSourceType;
    endpoint: string;
    enabled?: boolean;
    runFrequencyMinutes?: number;
    defaultCategory?: OpportunityCategory;
    createdByUserId?: string | null;
}

export class SourceValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SourceValidationError';
    }
}

const MAX_NAME = 120;
const MAX_ENDPOINT = 1000;
const MIN_FREQUENCY = 5;
const MAX_FREQUENCY = 10_080; // one week

function validate(input: Partial<SourceInput>): void {
    const name = (input.name ?? '').trim();
    if (name.length === 0 || name.length > MAX_NAME) {
        throw new SourceValidationError(`name must be 1-${MAX_NAME} characters`);
    }

    if (!input.sourceType || !listSupportedSourceTypes().includes(input.sourceType)) {
        throw new SourceValidationError('sourceType is not supported');
    }

    const endpoint = (input.endpoint ?? '').trim();
    if (endpoint.length === 0 || endpoint.length > MAX_ENDPOINT) {
        throw new SourceValidationError(`endpoint must be 1-${MAX_ENDPOINT} characters`);
    }
    try {
        assertSafeEndpoint(endpoint);
    } catch (error) {
        if (error instanceof UnsafeEndpointError) {
            throw new SourceValidationError(error.message);
        }
        throw error;
    }

    const frequency = input.runFrequencyMinutes;
    if (
        frequency !== undefined &&
        (!Number.isInteger(frequency) || frequency < MIN_FREQUENCY || frequency > MAX_FREQUENCY)
    ) {
        throw new SourceValidationError(
            `runFrequencyMinutes must be an integer between ${MIN_FREQUENCY} and ${MAX_FREQUENCY}`
        );
    }
}

export async function createSource(input: SourceInput) {
    validate(input);
    return prisma.ingestionSource.create({
        data: {
            name: input.name.trim(),
            sourceType: input.sourceType,
            endpoint: input.endpoint.trim(),
            enabled: input.enabled ?? true,
            runFrequencyMinutes: input.runFrequencyMinutes ?? 60,
            defaultCategory: input.defaultCategory ?? 'EMPLOYMENT',
            createdByUserId: input.createdByUserId ?? null,
        },
    });
}

export async function updateSource(id: string, input: Partial<SourceInput>) {
    const existing = await prisma.ingestionSource.findUnique({
        where: { id },
        select: { id: true },
    });
    if (!existing) return null;

    // Validate the merged result, so a partial update cannot leave a source in
    // an invalid state (e.g. changing the endpoint to a private IP alone).
    if (input.name !== undefined || input.sourceType !== undefined || input.endpoint !== undefined) {
        const merged = {
            name: input.name ?? '',
            sourceType: input.sourceType ?? ('JSON_FEED' as IngestionSourceType),
            endpoint: input.endpoint ?? '',
        };
        const current = await prisma.ingestionSource.findUnique({
            where: { id },
            select: { name: true, sourceType: true, endpoint: true, runFrequencyMinutes: true },
        });
        validate({
            name: input.name ?? current?.name,
            sourceType: input.sourceType ?? current?.sourceType,
            endpoint: input.endpoint ?? current?.endpoint,
            runFrequencyMinutes: input.runFrequencyMinutes ?? current?.runFrequencyMinutes,
        });
        void merged;
    }

    const data: Prisma.IngestionSourceUpdateInput = {};
    if (input.name !== undefined) data.name = input.name.trim();
    if (input.sourceType !== undefined) data.sourceType = input.sourceType;
    if (input.endpoint !== undefined) data.endpoint = input.endpoint.trim();
    if (input.enabled !== undefined) data.enabled = input.enabled;
    if (input.defaultCategory !== undefined) data.defaultCategory = input.defaultCategory;
    if (input.runFrequencyMinutes !== undefined) {
        data.runFrequencyMinutes = input.runFrequencyMinutes;
    }

    return prisma.ingestionSource.update({ where: { id }, data });
}

export async function setSourceEnabled(id: string, enabled: boolean) {
    const updated = await prisma.ingestionSource.updateMany({
        where: { id },
        data: { enabled },
    });
    return updated.count > 0;
}

export async function deleteSource(id: string) {
    // Cascades to IngestionRun and RawOpportunity per the schema relations, so
    // deleting a source is intentionally destructive. Callers must confirm.
    const deleted = await prisma.ingestionSource.deleteMany({ where: { id } });
    return deleted.count > 0;
}

export async function listSources(options: { enabledOnly?: boolean } = {}) {
    return prisma.ingestionSource.findMany({
        where: options.enabledOnly ? { enabled: true } : undefined,
        orderBy: { name: 'asc' },
    });
}

export async function getSource(id: string) {
    return prisma.ingestionSource.findUnique({ where: { id } });
}

/**
 * Sources whose next run is due.
 *
 * A source that has never run is immediately due. Frequency is per-source, so
 * a high-frequency source can poll often while a partner feed polls daily.
 */
export async function listDueSources(now: Date = new Date()) {
    const sources = await prisma.ingestionSource.findMany({
        where: { enabled: true },
        select: {
            id: true,
            name: true,
            sourceType: true,
            endpoint: true,
            defaultCategory: true,
            runFrequencyMinutes: true,
            lastRunAt: true,
        },
    });

    return sources.filter((source) => {
        if (!source.lastRunAt) return true;
        const dueAt = new Date(
            source.lastRunAt.getTime() + source.runFrequencyMinutes * 60_000
        );
        return dueAt <= now;
    });
}
