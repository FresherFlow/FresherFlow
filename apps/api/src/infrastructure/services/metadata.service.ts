import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '@fresherflow/logger';
import { getCompanySlug } from '@fresherflow/utils';

const endpoint = process.env.R2_ENDPOINT;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME || 'fresherflow-cdn';

const s3 = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
        accessKeyId: accessKeyId || '',
        secretAccessKey: secretAccessKey || '',
    },
});

async function fetchFromR2(key: string): Promise<string | null> {
    try {
        const response = await s3.send(new GetObjectCommand({
            Bucket: bucketName,
            Key: key,
        }));
        if (!response.Body) return null;
        return await response.Body.transformToString();
    } catch (error: unknown) {
        const err = error as Error & { $metadata?: { httpStatusCode?: number } };
        if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
            return null;
        }
        logger.error(`[MetadataService] Failed to fetch ${key} from R2`, error);
        return null;
    }
}

async function uploadToR2(key: string, body: string) {
    await s3.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: body,
        ContentType: 'application/json',
    }));
}

function titleCase(str: string): string {
    return str
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
}

interface SubjectPayload {
    name?: string;
    syllabus?: string[];
}

interface TierPayload {
    name?: string;
    subjects?: SubjectPayload[];
}

interface ExamPatternPayload {
    tiers?: TierPayload[];
}

interface OpportunityPayload {
    id: string;
    company?: string | null;
    companyWebsite?: string | null;
    companyLogoUrl?: string | null;
    locations?: string[] | null;
    requiredSkills?: string[] | null;
    allowedCourses?: string[] | null;
    allowedSpecializations?: string[] | null;
    governmentJobDetails?: {
        examPattern?: ExamPatternPayload | null;
    } | null;
}

function cleanAndSplitSyllabusItem(item: string): string[] {
    if (!item || typeof item !== 'string') return [];

    const lower = item.toLowerCase().trim();
    // Filter out descriptive sentences, rules, or instructions
    if (
        lower.includes('domain knowledge') ||
        lower.includes('subject chosen') ||
        lower.includes('etc.') ||
        lower.includes('minimum') ||
        lower.includes('marks required') ||
        lower.includes('not added to final') ||
        lower.includes('final merit') ||
        lower.includes('questions based on') ||
        lower.includes('candidates must') ||
        lower.includes('mark deducted') ||
        lower.includes('wrong answer') ||
        lower.length > 70
    ) {
        return [];
    }

    let text = item.trim();

    // Strip common category prefixes ending with a colon
    const colonIndex = text.indexOf(':');
    if (colonIndex > 0 && colonIndex < 40) {
        const prefix = text.substring(0, colonIndex);
        // If the prefix does not contain commas, it's likely a header (e.g. "Mathematics:")
        if (!prefix.includes(',')) {
            text = text.substring(colonIndex + 1).trim();
        }
    }

    // Split by comma or semicolon, ignoring those inside parentheses
    return text.split(/[,;](?![^(]*\))/)
        .map(t => {
            let cleaned = t.trim();
            // Remove trailing period
            if (cleaned.endsWith('.')) {
                cleaned = cleaned.slice(0, -1).trim();
            }
            return cleaned;
        })
        .filter(t => {
            const tl = t.toLowerCase();
            return t.length > 0 &&
                tl !== 'etc' &&
                !tl.includes('etc.)') &&
                !tl.includes('etc.') &&
                !tl.includes('minimum') &&
                !tl.includes('qualify') &&
                !tl.includes('merit') &&
                !tl.includes('marks') &&
                t.length < 65;
        });
}

export class MetadataService {
    static async appendOpportunityMetadata(opportunity: OpportunityPayload) {
        if (!endpoint || !accessKeyId || !secretAccessKey) {
            logger.warn('[MetadataService] R2 credentials not fully configured in environment. Skipping metadata sync.');
            return;
        }

        try {
            logger.info('[MetadataService] Syncing opportunity metadata with R2 CDN', {
                opportunityId: opportunity.id
            });

            // --- 1. Companies ---
            if (opportunity.company) {
                const targetCompany = opportunity.company.trim();
                const targetLower = targetCompany.toLowerCase();
                const isValidCompany = !targetLower.includes(',') && targetLower !== 'india' && targetLower !== 'remote' && targetLower !== 'ban';

                if (isValidCompany) {
                    const companiesContent = await fetchFromR2('companies.json');
                    let companies: Array<{ name: string; url: string | null; logo_url: string | null; slug?: string }> = [];
                    if (companiesContent) {
                        try {
                            companies = JSON.parse(companiesContent);
                        } catch (e) {
                            logger.error('[MetadataService] Failed to parse companies.json', e);
                        }
                    }

                    let updated = false;

                    // Backfill any missing slugs for existing companies
                    for (const c of companies) {
                        if (c && c.name && !c.slug) {
                            c.slug = getCompanySlug(c.name, c.url);
                            updated = true;
                        }
                    }

                    const existingIndex = companies.findIndex(c => c && c.name && c.name.toLowerCase().trim() === targetLower);
                    const newUrl = opportunity.companyWebsite ? opportunity.companyWebsite.trim() : null;
                    const newLogo = opportunity.companyLogoUrl ? opportunity.companyLogoUrl.trim() : null;

                    if (existingIndex !== -1) {
                        const existing = companies[existingIndex];
                        if (!existing.slug) {
                            existing.slug = getCompanySlug(existing.name, existing.url || newUrl);
                            updated = true;
                        }
                        if (!existing.url && newUrl) {
                            existing.url = newUrl;
                            updated = true;
                        }
                        if (!existing.logo_url && newLogo) {
                            existing.logo_url = newLogo;
                            updated = true;
                        }
                    } else {
                        companies.push({
                            name: targetCompany,
                            url: newUrl,
                            logo_url: newLogo,
                            slug: getCompanySlug(targetCompany, newUrl)
                        });
                        updated = true;
                    }

                    if (updated) {
                        companies.sort((a, b) => a.name.localeCompare(b.name));
                        await uploadToR2('companies.json', JSON.stringify(companies, null, 2));
                    }
                }
            }

            // --- 2. Locations / Cities ---
            if (opportunity.locations && Array.isArray(opportunity.locations) && opportunity.locations.length > 0) {
                const citiesContent = await fetchFromR2('cities.json');
                if (citiesContent) {
                    let cities: Record<string, string[]> = {};
                    try {
                        cities = JSON.parse(citiesContent);
                    } catch (e) {
                        logger.error('[MetadataService] Failed to parse cities.json', e);
                    }

                    let updated = false;
                    const stateKeys = Object.keys(cities);

                    for (const rawLoc of opportunity.locations) {
                        if (!rawLoc) continue;
                        const normLoc = rawLoc.trim().toLowerCase();
                        if (["across india", "remote", "all india", "india", "remote (india)", "worldwide", "ban", "pan india"].includes(normLoc)) continue;

                        const parts = rawLoc.split(/[,/]/).map(p => p.trim()).filter(Boolean);
                        
                        // Try to find a state from parts that matches one of our state keys
                        let matchedState: string | null = null;
                        let cityPart: string | null = null;

                        for (const part of parts) {
                            const partLower = part.toLowerCase();
                            const matchedKey = stateKeys.find(k => k.toLowerCase() === partLower);
                            if (matchedKey) {
                                matchedState = matchedKey;
                            } else {
                                cityPart = part;
                            }
                        }

                        // Fallback: if no state is matched but we have parts, search if any part is already in cities.json
                        if (!matchedState && cityPart) {
                            const cityLower = cityPart.toLowerCase();
                            for (const state of stateKeys) {
                                if (cities[state].some(c => c.toLowerCase() === cityLower)) {
                                    matchedState = state;
                                    break;
                                }
                            }
                        }

                        // If we matched the state, add the city if it's missing
                        if (matchedState && cityPart) {
                            const canonicalCity = titleCase(cityPart);
                            const exists = cities[matchedState].some(c => c.toLowerCase() === cityPart!.toLowerCase());
                            if (!exists) {
                                cities[matchedState].push(canonicalCity);
                                cities[matchedState].sort((a, b) => a.localeCompare(b));
                                updated = true;
                            }
                        }
                    }

                    if (updated) {
                        await uploadToR2('cities.json', JSON.stringify(cities, null, 2));
                    }
                }
            }

            // --- 3. Skills ---
            if (opportunity.requiredSkills && Array.isArray(opportunity.requiredSkills) && opportunity.requiredSkills.length > 0) {
                const skillsContent = await fetchFromR2('skills.json');
                if (skillsContent) {
                    let skills: string[] = [];
                    try {
                        skills = JSON.parse(skillsContent);
                    } catch (e) {
                        logger.error('[MetadataService] Failed to parse skills.json', e);
                    }

                    let updated = false;

                    for (const raw of opportunity.requiredSkills) {
                        if (!raw) continue;
                        const trimmed = raw.trim();
                        const trimmedLower = trimmed.toLowerCase();

                        if (trimmed.length > 1) {
                            // Match case-insensitively against existing skills
                            const match = skills.find(s => s.toLowerCase() === trimmedLower);
                            if (!match) {
                                // Apply standard Title Case for new skills
                                const formatted = titleCase(trimmed);
                                skills.push(formatted);
                                updated = true;
                            }
                        }
                    }

                    if (updated) {
                        skills.sort((a, b) => a.localeCompare(b));
                        await uploadToR2('skills.json', JSON.stringify(skills, null, 2));
                    }
                }
            }

            // --- 4. Education ---
            const hasCourses = opportunity.allowedCourses && Array.isArray(opportunity.allowedCourses) && opportunity.allowedCourses.length > 0;
            const hasSpecs = opportunity.allowedSpecializations && Array.isArray(opportunity.allowedSpecializations) && opportunity.allowedSpecializations.length > 0;

            if (hasCourses || hasSpecs) {
                const eduContent = await fetchFromR2('education.json');
                if (eduContent) {
                    let education: {
                        educationLevels: string[];
                        courses: Record<string, string[]>;
                        specializations: Record<string, string[]>;
                    } = { educationLevels: [], courses: {}, specializations: {} };
                    try {
                        education = JSON.parse(eduContent);
                    } catch (e) {
                        logger.error('[MetadataService] Failed to parse education.json', e);
                    }

                    let updated = false;

                    if (opportunity.allowedCourses && education.courses) {
                        for (const course of opportunity.allowedCourses) {
                            if (!course) continue;
                            const normCourse = course.toLowerCase().trim();
                            if (!normCourse || normCourse === 'other') continue;

                            let level: 'DIPLOMA' | 'DEGREE' | 'PG' = 'DEGREE';
                            if (normCourse.includes('diploma')) level = 'DIPLOMA';
                            else if (
                                normCourse.includes('m.tech') || normCourse.includes('mca') ||
                                normCourse.includes('mba') || normCourse.includes('phd') ||
                                normCourse.includes('ms')
                            ) {
                                level = 'PG';
                            }

                            if (education.courses[level]) {
                                const exists = education.courses[level].some((c: string) => c.toLowerCase() === normCourse);
                                if (!exists) {
                                    education.courses[level].push(course.trim());
                                    education.courses[level].sort((a: string, b: string) => a.localeCompare(b));
                                    updated = true;
                                }
                            }
                        }
                    }

                    if (opportunity.allowedSpecializations && education.specializations) {
                        for (const spec of opportunity.allowedSpecializations) {
                            if (!spec) continue;
                            const normSpec = spec.toLowerCase().trim();
                            if (!normSpec || normSpec === 'other' || normSpec === 'general') continue;

                            // Default course association
                            const targetCourse = "B.Tech / B.E.";
                            if (education.specializations[targetCourse]) {
                                const exists = education.specializations[targetCourse].some((s: string) => s.toLowerCase() === normSpec);
                                if (!exists) {
                                    education.specializations[targetCourse].push(spec.trim());
                                    education.specializations[targetCourse].sort((a: string, b: string) => a.localeCompare(b));
                                    updated = true;
                                }
                            }
                        }
                    }

                    if (updated) {
                        await uploadToR2('education.json', JSON.stringify(education, null, 2));
                    }
                }
            }

            // --- 5. Syllabus ---
            const examPattern = opportunity.governmentJobDetails?.examPattern;
            if (examPattern && examPattern.tiers && Array.isArray(examPattern.tiers)) {
                const newTopics: string[] = [];
                for (const tier of examPattern.tiers) {
                    if (tier && Array.isArray(tier.subjects)) {
                        for (const subject of tier.subjects) {
                            if (subject && Array.isArray(subject.syllabus)) {
                                for (const item of subject.syllabus) {
                                    if (item && typeof item === 'string') {
                                        const cleaned = cleanAndSplitSyllabusItem(item);
                                        newTopics.push(...cleaned);
                                    }
                                }
                            }
                        }
                    }
                }

                if (newTopics.length > 0) {
                    const syllabusContent = await fetchFromR2('syllabus.json');
                    let syllabus: string[] = [];
                    if (syllabusContent) {
                        try {
                            syllabus = JSON.parse(syllabusContent);
                        } catch (e) {
                            logger.error('[MetadataService] Failed to parse syllabus.json', e);
                        }
                    }

                    let updated = false;
                    for (const topic of newTopics) {
                        const trimmed = topic.trim();
                        if (trimmed.length > 1) {
                            const trimmedLower = trimmed.toLowerCase();
                            const exists = syllabus.some(s => s.toLowerCase() === trimmedLower);
                            if (!exists) {
                                syllabus.push(trimmed);
                                updated = true;
                            }
                        }
                    }

                    if (updated) {
                        syllabus.sort((a, b) => a.localeCompare(b));
                        await uploadToR2('syllabus.json', JSON.stringify(syllabus, null, 2));
                    }
                }
            }

            logger.info('[MetadataService] CDN metadata sync completed successfully.');
        } catch (error) {
            logger.error('[MetadataService] Failed to append metadata to R2', error);
        }
    }

    /**
     * One-off backfill to generate and save slugs for all companies currently in companies.json
     */
    static async backfillCompanySlugs(): Promise<void> {
        try {
            logger.info('[MetadataService] Starting company slugs backfill on CDN...');
            const companiesContent = await fetchFromR2('companies.json');
            if (!companiesContent) {
                logger.warn('[MetadataService] No companies.json found on R2.');
                return;
            }

            let companies: Array<{ name: string; url: string | null; logo_url: string | null; slug?: string }> = [];
            try {
                companies = JSON.parse(companiesContent);
            } catch (e) {
                logger.error('[MetadataService] Failed to parse companies.json during backfill', e);
                return;
            }

            let updatedCount = 0;
            for (const c of companies) {
                if (c && c.name) {
                    const newSlug = getCompanySlug(c.name, c.url);
                    if (c.slug !== newSlug) {
                        c.slug = newSlug;
                        updatedCount++;
                    }
                }
            }

            if (updatedCount > 0) {
                companies.sort((a, b) => a.name.localeCompare(b.name));
                await uploadToR2('companies.json', JSON.stringify(companies, null, 2));
                logger.info(`[MetadataService] Backfill complete. Updated ${updatedCount} companies in companies.json on R2.`);
            } else {
                logger.info('[MetadataService] Backfill complete. All companies already have correct slugs.');
            }
        } catch (error) {
            logger.error('[MetadataService] Failed backfill of company slugs', error);
        }
    }
}

