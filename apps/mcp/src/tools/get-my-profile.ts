import type { McpServer } from "@modelcontextprotocol/server";
import { z } from 'zod';
import { ApiHttpError } from '../http/client.js';
import { getMyProfile, type MyProfile } from '../api/account.js';

const PROFILE_SHAPE = z.object({
    completionPercentage: z.number(),
    educationLevel: z.string().nullable(),
    gradCourse: z.string().nullable(),
    gradSpecialization: z.string().nullable(),
    gradYear: z.number().nullable(),
    pgCourse: z.string().nullable(),
    pgSpecialization: z.string().nullable(),
    pgYear: z.number().nullable(),
    tenthYear: z.number().nullable(),
    twelfthYear: z.number().nullable(),
    interestedIn: z.array(z.string()),
    preferredCities: z.array(z.string()),
    workModes: z.array(z.string()),
    availability: z.string().nullable(),
    skills: z.array(z.string()),
    headline: z.string().nullable(),
    resumeUrl: z.string().nullable(),
    willingToRelocate: z.boolean().nullable(),
});

const OUTPUT_SCHEMA = z.object({
    found: z.boolean().describe('false when this account has not created a FresherFlow profile yet'),
    completionPercentage: z.number(),
    profile: PROFILE_SHAPE.nullable(),
});

/**
 * Read tool: the candidate's own profile.
 *
 * This is the FresherFlow equivalent of Indeed's `get_resume` connector tool.
 * Without it every job search is generic: the agent cannot know the user's
 * graduation year, degree, skills or preferred cities, so it asks for them again
 * on every conversation. It is read-only and scoped to the caller's token.
 */
export function registerGetMyProfile(server: McpServer): void {
    server.registerTool(
        'get_my_profile',
        {
            title: 'Read my FresherFlow profile',
            description:
                'Read THIS signed-in user\'s FresherFlow profile: education (degree, branch, graduation year, PG), '
                + 'preferred cities, work modes, availability, skills, resume link and completion percentage. '
                + 'Call this before a personalised job search ("find jobs for me", "am I eligible?") so you can pass '
                + 'the real degree/pass-out year/city/skills to get_jobs and compare them with a listing\'s requirements. '
                + 'There is no separate eligibility tool: compare the profile with get_job\'s allowedDegrees, '
                + 'allowedCourses, allowedPassoutYears, experienceMin/Max and locations, and say clearly which '
                + 'requirement the user does or does not meet. '
                + 'found: false means the account has no profile yet — ask the user to complete it on FresherFlow; '
                + 'do not invent education or preferences. Demographic fields (date of birth, gender, category) are '
                + 'intentionally not returned.',
            inputSchema: z.object({}),
            outputSchema: OUTPUT_SCHEMA,
            annotations: {
                readOnlyHint: true,
                openWorldHint: false,
                destructiveHint: false,
            },
        },
        async () => {
            let profile: MyProfile | null;
            try {
                profile = await getMyProfile();
            } catch (error) {
                // GET /api/profile 404s when the account has no profile row yet.
                if (error instanceof ApiHttpError && error.status === 404) {
                    return {
                        structuredContent: { found: false, completionPercentage: 0, profile: null },
                        content: [{
                            type: 'text' as const,
                            text: 'This account has no FresherFlow profile yet. Ask the user to complete their profile on FresherFlow, then retry.',
                        }],
                    };
                }
                throw error;
            }

            if (!profile) {
                return {
                    structuredContent: { found: false, completionPercentage: 0, profile: null },
                    content: [{
                        type: 'text' as const,
                        text: 'This account has no FresherFlow profile yet. Ask the user to complete their profile on FresherFlow, then retry.',
                    }],
                };
            }

            const education = [
                profile.gradCourse,
                profile.gradSpecialization,
                profile.gradYear ? `graduating ${profile.gradYear}` : null,
            ].filter(Boolean).join(' ');
            const result = {
                found: true,
                completionPercentage: profile.completionPercentage,
                profile,
            };
            return {
                structuredContent: result,
                content: [{
                    type: 'text' as const,
                    text: [
                        `${profile.headline ?? 'FresherFlow profile'} — ${profile.completionPercentage}% complete`,
                        education ? `Education: ${education}` : null,
                        profile.preferredCities.length ? `Preferred cities: ${profile.preferredCities.join(', ')}` : null,
                        profile.workModes.length ? `Work modes: ${profile.workModes.join(', ')}` : null,
                        profile.skills.length ? `Skills: ${profile.skills.join(', ')}` : null,
                        profile.availability ? `Availability: ${profile.availability}` : null,
                    ].filter((line): line is string => line !== null).join('\n'),
                }],
            };
        },
    );
}
