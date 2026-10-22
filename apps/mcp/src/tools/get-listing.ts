import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getListing } from '../api/listings.js';

/**
 * Read tool: the verification step. A successful create_listing response only
 * proves the API accepted the request; reading the listing back is what proves
 * the fields actually landed.
 *
 * Annotations:
 * - readOnlyHint: true
 * - openWorldHint: false (reads our own bounded service)
 */
export function registerGetListing(server: McpServer): void {
    server.registerTool(
        'get_listing',
        {
            title: 'Read a stored listing',
            description:
                'Read back a FresherFlow listing by id or slug, including its stored title, company, '
                + 'links, salary, eligibility, tags and any drive or government details. '
                + 'Use this to verify that a create_listing or update_listing call actually stored '
                + 'what you intended, and to read the current state before sending an update — '
                + 'update_listing is a full replace, so you need the existing values to keep them.',
            inputSchema: {
                idOrSlug: z
                    .string()
                    .trim()
                    .min(1)
                    .describe('The listing id or slug, e.g. "software-engineer-at-acme-1a2b3c4d"'),
            },
            outputSchema: {
                id: z.string(),
                slug: z.string(),
                status: z.string(),
                title: z.string().nullable().optional(),
                company: z.string().nullable().optional(),
                sourceLink: z.string().nullable().optional(),
                applyLink: z.string().nullable().optional(),
                description: z.string().nullable().optional(),
                locations: z.array(z.string()).nullable().optional(),
                workMode: z.string().nullable().optional(),
                salaryRange: z.string().nullable().optional(),
                salaryMin: z.number().nullable().optional(),
                salaryMax: z.number().nullable().optional(),
                salaryPeriod: z.string().nullable().optional(),
                stipend: z.string().nullable().optional(),
                employmentTypes: z.array(z.string()).nullable().optional(),
                requiredSkills: z.array(z.string()).nullable().optional(),
                allowedDegrees: z.array(z.string()).nullable().optional(),
                allowedCourses: z.array(z.string()).nullable().optional(),
                allowedAvailability: z.array(z.string()).nullable().optional(),
                category: z.string().nullable().optional(),
                recruitmentMethod: z.string().nullable().optional(),
                sector: z.string().nullable().optional(),
                tags: z.array(z.string()).nullable().optional(),
                jobFunction: z.string().nullable().optional(),
                selectionProcess: z.string().nullable().optional(),
                notesHighlights: z.string().nullable().optional(),
                incentives: z.string().nullable().optional(),
                experienceMin: z.number().nullable().optional(),
                experienceMax: z.number().nullable().optional(),
                expiresAt: z.string().nullable().optional(),
                driveDetails: z.record(z.string(), z.unknown()).nullable().optional(),
                governmentJobDetails: z.record(z.string(), z.unknown()).nullable().optional(),
                eventDetails: z.record(z.string(), z.unknown()).nullable().optional(),
                createdAt: z.string().nullable().optional(),
                updatedAt: z.string().nullable().optional(),
            },
            annotations: {
                readOnlyHint: true,
                openWorldHint: false,
                destructiveHint: false,
            },
        },
        async ({ idOrSlug }) => {
            const listing = await getListing(idOrSlug);
            const status = String(listing.status ?? 'UNKNOWN');
            return {
                structuredContent: listing as Record<string, unknown>,
                content: [
                    {
                        type: 'text' as const,
                        text: `${String(listing.title ?? '(untitled)')} at ${String(listing.company ?? '(unknown)')} — status ${status}`,
                    },
                ],
            };
        },
    );
}