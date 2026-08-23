/* eslint-disable @typescript-eslint/no-explicit-any */
import { chromium } from 'playwright';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { setCdnMetadata } from '@fresherflow/parser';
import {
    loadCdnMetadata,
    CANONICAL_CITIES_MAP,
    CANONICAL_COMPANIES,
    GREENHOUSE_COMPANY_TO_SLUG,
    CANONICAL_SKILLS_MAP
} from '@fresherflow/parser/metadata';

import { extractExperience, extractSalary } from '@fresherflow/plugins';

import {
    jobSchema,
    normalizeRawJson,
    ExtractedJob,
    postProcessNormalize
} from '@fresherflow/pipeline';



import {
    applyStealth,
    extractAtsContent,
    isBotOrError,
    trimForLlm
} from '@fresherflow/plugins';

import { extractNativeAtsData } from '@fresherflow/pipeline';
import { applyRuleEngine } from '@fresherflow/domain';

import {
    enrichMissingFields,
    EnrichableField,
} from './src/providers';

import {
    saveJobToSupabase,
} from './src/api.js';

import { resolveCompanyWebsiteAndLogo } from '@fresherflow/utils';

import { matchFromCdn } from '@fresherflow/parser';

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

// ─── R2 helpers for processed_urls dedup state ────────────────────────────────
const R2_PROCESSED_KEY = 'processor/processed_urls.json';

function getR2Client(): S3Client | null {
    const endpoint = process.env.R2_ENDPOINT;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    if (!endpoint || !accessKeyId || !secretAccessKey) return null;
    return new S3Client({
        region: 'auto',
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
    });
}

async function loadProcessedUrls(localPath: string): Promise<Set<string>> {
    const r2 = getR2Client();
    const bucket = process.env.R2_BUCKET_NAME;
    if (r2 && bucket) {
        try {
            const res = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: R2_PROCESSED_KEY }));
            const str = await res.Body?.transformToString();
            if (str) {
                const arr = JSON.parse(str);
                console.log(`Loaded ${arr.length} processed URLs from R2.`);
                return new Set(arr);
            }
        } catch (e: any) {
            if (e.name !== 'NoSuchKey') console.warn('[R2] Could not load processed_urls:', e.message);
        }
    }
    // Fallback: local file
    if (await fileExists(localPath)) {
        try {
            const arr = JSON.parse(await fs.readFile(localPath, 'utf8'));
            if (Array.isArray(arr)) {
                console.log(`Loaded ${arr.length} processed URLs from local file.`);
                return new Set(arr);
            }
        } catch { /* ignore */ }
    }
    return new Set();
}

async function saveProcessedUrls(urls: Set<string>, localPath: string): Promise<void> {
    const arr = Array.from(urls);
    // Always save locally
    await fs.writeFile(localPath, JSON.stringify(arr, null, 2));
    // Also persist to R2 if configured
    const r2 = getR2Client();
    const bucket = process.env.R2_BUCKET_NAME;
    if (r2 && bucket) {
        try {
            await r2.send(new PutObjectCommand({
                Bucket: bucket,
                Key: R2_PROCESSED_KEY,
                Body: JSON.stringify(arr),
                ContentType: 'application/json',
            }));
        } catch (e: any) {
            console.warn('[R2] Could not save processed_urls:', e.message);
        }
    }
}

async function loadEnv(): Promise<void> {
    let envPath = path.join(process.cwd(), '.env');
    if (!(await fileExists(envPath))) envPath = path.join(process.cwd(), '../../.env');
    if (!(await fileExists(envPath))) envPath = path.join(process.cwd(), '../.env');

    if (await fileExists(envPath)) {
        try {
            const envContent = await fs.readFile(envPath, 'utf8');
            for (const line of envContent.split('\n')) {
                const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?$/);
                if (match) {
                    let value = (match[2] || '').trim();
                    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
                    process.env[match[1]] = value;
                }
            }
            console.log(`Loaded env from ${envPath}`);
        } catch (err) {
            console.error('Failed to read .env file:', err);
        }
    }
}

async function run(): Promise<void> {
    console.log('Starting Job Processor...');

    await loadEnv();
    await loadCdnMetadata();

    setCdnMetadata({
        cities: CANONICAL_CITIES_MAP,
        companies: CANONICAL_COMPANIES,
        skills: CANONICAL_SKILLS_MAP
    });

    const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();
    const API_BASE_URL = (process.env.API_BASE_URL || '').trim().replace(/\/$/, '');
    const ENABLE_API_UPLOAD = process.env.ENABLE_API_UPLOAD === 'true';

    const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;


    const statePath = path.join(process.cwd(), 'processed_urls.json');
    const processedUrls = await loadProcessedUrls(statePath);

    const args = process.argv.slice(2);
    const positionalArgs = args.filter((arg, idx) =>
        !arg.startsWith('--') &&
        !['--chunk', '--limit', '--batch-size', '--batch-delay'].includes(args[idx - 1])
    );

    const { fetchUnprocessedFromSupabase, markDiscoveredJobStatus } = await import('@fresherflow/pipeline');
    const { isJobLive } = await import('./src/liveness.js');

    let jobs: any[] = [];
    const fromSupabase = args.includes('--from-supabase');

    if (fromSupabase) {
        const limitArg = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1], 10) : 200;
        console.log(`Fetching up to ${limitArg} unprocessed jobs from Supabase discovered_jobs...`);

        try {
            const rows = await fetchUnprocessedFromSupabase(limitArg);
            
            // Mark all as PROCESSING so parallel runs don't double-pick them
            const ids = rows.map(r => r.id);
            if (ids.length > 0) {
                // Using dynamic import of supabase to bulk update
                const { pool } = await import('@fresherflow/pipeline');
                if (pool) {
                    await pool.query(`UPDATE public.discovered_jobs SET status = 'PROCESSING' WHERE id = ANY($1)`, [ids]);
                }
            }

            jobs = rows.map(r => ({
                id: r.id,
                applyLink: r.apply_link,
                sourceLink: r.source_url || r.apply_link,
                source: r.source,
                company: r.company,
                title: r.title,
                atsText: r.ats_text || '',
                description: r.description || '',
                location: r.location || r.location_city || '',
                isRemote: r.is_remote,
                experienceYears: r.experience_years,
                employmentType: r.employment_type,
                skills: r.skills ? JSON.parse(r.skills) : [],
                postedAt: r.posted_at,
                batchYear: r.batch_year,
                degree: r.degree,
                department: r.department,
                _supabaseId: r.id,
            })).filter(j => !processedUrls.has(j.applyLink));

            console.log(`Loaded ${jobs.length} unprocessed jobs from Supabase.`);
        } catch (e: any) {
            console.error('❌ Failed to fetch from Supabase:', e.message);
            process.exit(1);
        }
    } else if (positionalArgs[0] && await fileExists(positionalArgs[0])) {
        console.log(`Reading jobs from file: ${positionalArgs[0]}`);
        const fileContent = await fs.readFile(positionalArgs[0], 'utf8');
        const parsedData = JSON.parse(fileContent);
        jobs = Array.isArray(parsedData) ? parsedData : (parsedData.jobs || []);
        jobs = jobs.filter((j: any) => !processedUrls.has(j.applyLink));
    } else {
        console.error(`❌ No input file provided. Usage: pnpm start <discovered_jobs.json> OR pnpm start --from-supabase`);
        process.exit(1);
    }

    console.log(`Loaded ${jobs.length} unprocessed jobs remaining to process.`);

    // --limit / --chunk
    const limitIndex = process.argv.findIndex(a => a === '--limit' || a === '--chunk');
    let limit = limitIndex !== -1 ? parseInt(process.argv[limitIndex + 1], 10) : undefined;
    if (process.env.LIMIT) limit = parseInt(process.env.LIMIT, 10);
    if (process.env.CHUNK) limit = parseInt(process.env.CHUNK, 10);
    if (limit && !isNaN(limit)) {
        console.log(`Limiting to first ${limit} unprocessed jobs.`);
        jobs = jobs.slice(0, limit);
    }

    // --no-llm: skip all LLM calls
    const NO_LLM = process.argv.includes('--no-llm') || process.env.NO_LLM === 'true';
    if (NO_LLM) console.log('NO_LLM mode: LLM calls skipped, using native+rules only.');

    // Batch config
    const batchSizeIndex = process.argv.indexOf('--batch-size');
    let batchSize = batchSizeIndex !== -1 ? parseInt(process.argv[batchSizeIndex + 1], 10) : 15;
    if (process.env.BATCH_SIZE) batchSize = parseInt(process.env.BATCH_SIZE, 10);

    const batchDelayIndex = process.argv.indexOf('--batch-delay');
    let batchDelay = batchDelayIndex !== -1 ? parseInt(process.argv[batchDelayIndex + 1], 10) : 5;
    if (process.env.BATCH_DELAY) batchDelay = parseInt(process.env.BATCH_DELAY, 10);

    console.log(`Batch config: size=${batchSize}, cooldown=${batchDelay}s`);
    console.log(`Processing ${jobs.length} jobs...`);

    if (jobs.length === 0) {
        console.log('Zero unprocessed jobs remaining. Exiting.');
        process.exit(0);
    }

    const saveState = async (url: string, status: string = 'PROCESSED') => {
        processedUrls.add(url);
        await saveProcessedUrls(processedUrls, statePath);
    };

    const successList: { title: string; company: string; url: string }[] = [];
    const failureList: { url: string; reason: string }[] = [];
    const allExtracted: ExtractedJob[] = [];

    const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
    try {
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport: { width: 1280, height: 720 }
        });

        for (let i = 0; i < jobs.length; i++) {
            const job = jobs[i];
            console.log(`\n--- [${i + 1}/${jobs.length}] ${job.applyLink} ---`);
            const source = job.source || '';

            try {
                // ─────────────────────────────────────────────────────────
                // STEP 1: CONTENT EXTRACTION
                // Priority order:
                //   1. Pre-supplied atsText from discovery phase
                //   2. Native JSON API (Lever, Greenhouse, Ashby, SmartRecruiters)
                //   3. ATS-specific Playwright adapter (Workday, Oracle, iCIMS, etc.)
                //   4. Generic Playwright scrape
                //   5. Aggregator text fallback
                // ─────────────────────────────────────────────────────────

                // LIVENESS CHECK FIRST
                const liveness = await isJobLive(job.applyLink);
                if (liveness === 'DEAD') {
                    console.log(`[DEAD] ${job.applyLink} — skipping`);
                    failureList.push({ url: job.applyLink, reason: 'Dead link (404)' });
                    await saveState(job.applyLink, 'REJECTED');
                    if (job._supabaseId) await markDiscoveredJobStatus(job._supabaseId, 'REJECTED');
                    continue;
                }

                let atsContent: { title: string; text: string; html: string; externalApplyUrl?: string | null } = { title: '', text: '', html: '', externalApplyUrl: null };
                let nativeData = null;

                if ((job.atsText && job.atsText.length > 50) || (job.description && job.description.length > 50)) {
                    // Pre-supplied text from discovery phase
                    atsContent.text = job.atsText || job.description;
                    atsContent.title = job.title;
                    console.log(`Pre-supplied ATS text (${atsContent.text.length} chars). Skipping Playwright.`);
                    
                    // Try to get structured API data (Greenhouse/Lever etc) without browser
                    const companySlug = GREENHOUSE_COMPANY_TO_SLUG.get((job.company || '').toLowerCase().trim())
                        ?? CANONICAL_COMPANIES.get((job.company || '').toLowerCase().trim())?.slug;
                    nativeData = await extractNativeAtsData(job.applyLink, source, undefined, companySlug);
                    
                    if (nativeData?.text === '{"error":"Job not found"}' || nativeData?.title === 'Job not found') {
                        console.log(`[DEAD] Native ATS API returned not found — skipping`);
                        failureList.push({ url: job.applyLink, reason: 'Native ATS API - Job not found' });
                        await saveState(job.applyLink, 'REJECTED');
                        if (job._supabaseId) await markDiscoveredJobStatus(job._supabaseId, 'REJECTED');
                        continue;
                    }
                } else {
                    let page = null;
                    try {
                        page = await context.newPage();
                        await applyStealth(page);

                        // Pass page handle so Playwright adapters can use it when JSON API fails.
                        // Since all companies on the same ATS share the same HTML structure,
                        // one adapter covers ALL companies on that platform.
                        const companySlug = GREENHOUSE_COMPANY_TO_SLUG.get((job.company || '').toLowerCase().trim())
                            ?? CANONICAL_COMPANIES.get((job.company || '').toLowerCase().trim())?.slug;
                        nativeData = await extractNativeAtsData(job.applyLink, source, page, companySlug);

                        if (nativeData?.text === '{"error":"Job not found"}' || nativeData?.title === 'Job not found') {
                            console.log(`[DEAD] Native ATS API returned not found — skipping`);
                            failureList.push({ url: job.applyLink, reason: 'Native ATS API - Job not found' });
                            await saveState(job.applyLink, 'REJECTED');
                            if (job._supabaseId) await markDiscoveredJobStatus(job._supabaseId, 'REJECTED');
                            continue;
                        }

                        if (nativeData && (nativeData.html.length > 200 || nativeData.text.length > 200)) {
                            atsContent = { title: nativeData.title, text: nativeData.text, html: nativeData.html };
                            console.log(`[ATS Adapter] ${source || 'detected'}: ${atsContent.text.length} chars.`);
                        } else {
                            // No specific adapter matched — fall back to generic Playwright
                            atsContent = await extractAtsContent(page, job.applyLink);
                            const blocked = isBotOrError(atsContent.text, atsContent.title);
                            if (blocked || atsContent.text.length < 600) {
                                console.log(`Generic scrape thin/blocked (${atsContent.text.length} chars). No fallback available.`);
                                atsContent.title = job.aggregatorTitle || job.title;
                            } else {
                                console.log(`Generic Playwright succeeded (${atsContent.text.length} chars).`);
                            }
                        }
                    } catch (pageErr) {
                        console.error(`[WARNING] Playwright failed: ${(pageErr as Error).message}`);
                        atsContent.title = job.aggregatorTitle || job.title;
                    } finally {
                        if (page) await page.close();
                    }
                }

                const rawText = atsContent.text || '';
                const textForLlm = trimForLlm(rawText);

                if (!textForLlm || textForLlm.length < 50) {
                    console.error('Insufficient job description text obtained.');
                    failureList.push({ url: job.applyLink, reason: 'Insufficient page text extracted' });
                    await saveState(job.applyLink, 'FAILED');
                    if (job._supabaseId) await markDiscoveredJobStatus(job._supabaseId, 'FAILED');
                    continue;
                }

                // ─────────────────────────────────────────────────────────
                // STEP 2: DETERMINISTIC FIELD MAPPING
                // Native ATS data + Rule Engine → build job object
                // No LLM at this stage.
                // ─────────────────────────────────────────────────────────

                // 2a. Rule engine: title → type, experience, workMode
                const rules = applyRuleEngine({
                    title: nativeData?.title || atsContent.title || job.title || '',
                    department: nativeData?.department,
                    description: textForLlm,
                    location: nativeData?.locations.join(', '),
                    employmentType: nativeData?.employmentType,
                });

                let parsedLocation: string[] = [];
                if (job.location) {
                    if (job.location.startsWith('[')) {
                        try { parsedLocation = JSON.parse(job.location); }
                        catch (e) { parsedLocation = [job.location]; }
                    } else {
                        parsedLocation = job.location.split(',').map((s: string) => s.trim()).filter(Boolean);
                    }
                }
                const dbLocations = parsedLocation.length > 0 ? parsedLocation : (job.locationCity ? [job.locationCity] : []);
                const dbSalary = job.salaryMin ? `${job.salaryCurrency || 'INR'} ${job.salaryMin}${job.salaryMax ? '-' + job.salaryMax : ''} / ${job.salaryInterval || 'year'}` : '';
                const dbWorkMode = job.workFromHomeType ? (job.workFromHomeType.toUpperCase().includes('REMOTE') ? 'REMOTE' : job.workFromHomeType.toUpperCase().includes('HYBRID') ? 'HYBRID' : 'ONSITE') : (job.isRemote ? 'REMOTE' : null);

                const extractedExp = extractExperience(textForLlm);
                const extractedSal = extractSalary(textForLlm);
                const pluginSalary = extractedSal ? `${extractedSal.currency || 'INR'} ${extractedSal.minSalary || ''}${extractedSal.maxSalary ? '-' + extractedSal.maxSalary : ''} / ${extractedSal.interval || 'year'}` : '';

                // 2b. Build job from native structured data + local pipeline.db enriched data + rules
                // Track whether data came from native ATS API (skip LLM) or Playwright scrape (need LLM)
                const isNativeAtsData = !!(nativeData?.title || atsContent.title);

                const nativeJob: Record<string, unknown> = {
                    type: rules.type ?? 'JOB',
                    title: nativeData?.title || atsContent.title || job.title || '',
                    company: nativeData?.company || job.company || '',
                    companyId: job.companyId || job.company_id || null,
                    companyWebsite: job.companyUrl || job.companyWebsite || '',
                    companyLogoUrl: job.companyLogo || job.companyLogoUrl || '',
                    applyLink: nativeData?.applyLink || atsContent.externalApplyUrl || job.applyLink,
                    sourceLink: job.sourceLink || job.source_url || job.aggregatorUrl || job.jobUrlDirect || job.applyLink,
                    locations: (nativeData?.locations && nativeData.locations.length > 0) ? nativeData.locations : dbLocations,
                    requiredSkills: (nativeData?.nativeSkills && nativeData.nativeSkills.length > 0) ? nativeData.nativeSkills : (Array.isArray(job.skills) ? job.skills : []),
                    workMode: nativeData?.workplaceType ?? dbWorkMode ?? rules.workMode ?? null,
                    descriptionSource: isNativeAtsData ? 'API' : (atsContent.text ? 'HTML' : 'NONE'),
                    experienceMin: nativeData?.experienceMin ?? (typeof job.experienceYears === 'number' ? job.experienceYears : (rules.experienceMin ?? extractedExp?.minExperienceYears ?? 0)),
                    experienceMax: nativeData?.experienceMax ?? (typeof job.experienceYears === 'number' ? job.experienceYears + 2 : (rules.experienceMax ?? extractedExp?.maxExperienceYears ?? 0)),
                    employmentType: rules.employmentType || nativeData?.employmentType || job.employmentType || '',
                    salaryRange: nativeData?.salaryRange || dbSalary || pluginSalary || '',
                    allowedPassoutYears: rules.inferredBatches ?? (job.batchYear ? [parseInt(job.batchYear, 10)].filter(n => !isNaN(n)) : []),
                    allowedDegrees: nativeData?.allowedDegrees ?? (job.degree ? [job.degree] : []),
                    allowedCourses: nativeData?.allowedCourses ?? [],
                    incentives: nativeData?.incentives ?? '',
                    selectionProcess: nativeData?.selectionProcess ?? '',
                    jobFunction: job.jobFunction || job.department || null,
                    description: nativeData?.text || atsContent.text || job.atsText || textForLlm,
                };

                // 2c. CDN matcher: fill remaining fields using CDN JSON data
                //     Runs BEFORE LLM to reduce tokens spent.
                const cdnMatch = matchFromCdn(textForLlm, nativeJob.locations as string[]);

                if (!(nativeJob.requiredSkills as string[]).length && cdnMatch.requiredSkills.length)
                    nativeJob.requiredSkills = cdnMatch.requiredSkills;
                if (!(nativeJob.allowedDegrees as string[]).length && cdnMatch.allowedDegrees.length)
                    nativeJob.allowedDegrees = cdnMatch.allowedDegrees;
                if (!(nativeJob.allowedCourses as string[]).length && cdnMatch.allowedCourses.length)
                    nativeJob.allowedCourses = cdnMatch.allowedCourses;
                if (!(nativeJob.allowedPassoutYears as number[]).length && cdnMatch.allowedPassoutYears.length)
                    nativeJob.allowedPassoutYears = cdnMatch.allowedPassoutYears;
                if (!nativeJob.salaryRange && cdnMatch.salaryRange)
                    nativeJob.salaryRange = cdnMatch.salaryRange;
                if (!nativeJob.workMode && cdnMatch.workMode)
                    nativeJob.workMode = cdnMatch.workMode;
                if ((nativeJob.experienceMin === undefined || nativeJob.experienceMin === 0) && cdnMatch.experienceMin !== undefined)
                    nativeJob.experienceMin = cdnMatch.experienceMin;
                if ((nativeJob.experienceMax === undefined || nativeJob.experienceMax === 0) && cdnMatch.experienceMax !== undefined)
                    nativeJob.experienceMax = cdnMatch.experienceMax;
                // Overwrite native locations with the fully cleaned CDN locations
                if (cdnMatch.locations.length > 0) {
                    nativeJob.locations = cdnMatch.locations;
                }

                // Identify what's still missing after CDN matching (for logging)
                const missingFields: string[] = [];
                if (!(nativeJob.requiredSkills as string[]).length) missingFields.push('requiredSkills');
                
                // Only ask the LLM for salary/incentives if we are truly lacking data or it's a raw page scrape.
                // If it's a native ATS JSON job, it's a massive waste of LLM quota to ask for optional fields.
                if (nativeJob.descriptionSource !== 'API') {
                    if (!nativeJob.salaryRange) missingFields.push('salaryRange');
                    if (!nativeJob.incentives) missingFields.push('incentives');
                    if (!nativeJob.selectionProcess) missingFields.push('selectionProcess');
                }

                console.log(`CDN match done. Missing ${missingFields.length} fields: [${missingFields.join(', ')}]`);

                // ─────────────────────────────────────────────────────────
                // STEP 3: LLM ENRICHMENT — ONLY for Playwright-scraped pages
                // Native ATS JSON already has everything the API provides.
                // LLM guessing salary/incentives for API data is waste of quota.
                // ─────────────────────────────────────────────────────────
                if (isNativeAtsData) {
                    // Skip LLM entirely for native ATS jobs — data is already complete from the plugin
                } else if (missingFields.length > 0 && ai) {
                    console.log(`Calling LLM enrichment for fields: ${missingFields.join(', ')}`);
                    try {
                        const enrichment = await enrichMissingFields(ai, textForLlm, missingFields as EnrichableField[]);
                        if (enrichment) {
                            if (enrichment.requiredSkills?.length) nativeJob.requiredSkills = [...new Set([...(nativeJob.requiredSkills as string[]), ...enrichment.requiredSkills])];
                            if (enrichment.salaryRange) nativeJob.salaryRange = enrichment.salaryRange;
                            if (enrichment.incentives) nativeJob.incentives = enrichment.incentives;
                            if (enrichment.selectionProcess) nativeJob.selectionProcess = enrichment.selectionProcess;
                        }
                    } catch (err) {
                        console.warn('LLM enrichment failed, falling back to native data:', (err as Error).message);
                    }
                }


                // ─────────────────────────────────────────────────────────
                // STEP 4: VALIDATE + NORMALIZE
                // ─────────────────────────────────────────────────────────
                let extracted: ExtractedJob | null = null;
                try {
                    extracted = jobSchema.parse(normalizeRawJson(nativeJob));
                } catch (parseErr) {
                    console.warn('Zod validation failed:', (parseErr as Error).message);
                    failureList.push({ url: job.applyLink, reason: 'Zod validation failed' });
                    if (job._supabaseId) await markDiscoveredJobStatus(job._supabaseId, 'FAILED');
                    continue;
                }

                extracted = postProcessNormalize(extracted, textForLlm);



                // India/Remote filter
                if (extracted.structuredLocations && extracted.structuredLocations.length > 0) {
                    const hasIndia = extracted.structuredLocations.some(
                        (loc: any) => loc.country === 'IN' || loc.name.toLowerCase() === 'pan india'
                    );
                    const hasRemote = extracted.structuredLocations.some(
                        (loc: any) => loc.type === 'remote'
                    );
                    // Any unmapped fallback string (e.g. "Austin, TX", "Hybrid") is considered foreign
                    const hasForeign = extracted.structuredLocations.some(
                        (loc: any) => !loc.country && loc.type !== 'remote' && loc.name.toLowerCase() !== 'pan india'
                    );

                    // Accept if it explicitly has an Indian location.
                    // If no Indian location, but has Remote, accept ONLY if it doesn't have an explicit foreign location.
                    const ok = hasIndia || (hasRemote && !hasForeign);

                    if (!ok) {
                        console.log(`[FILTER] International job skipped: ${JSON.stringify(extracted.structuredLocations)}`);
                        failureList.push({ url: job.applyLink, reason: 'International/unsupported location' });
                        if (job._supabaseId) await markDiscoveredJobStatus(job._supabaseId, 'REJECTED');
                        continue;
                    }
                }

                // Fresher-only gate: skip non-fresher roles
                if ((extracted.experienceMin ?? 0) >= 3) {
                    console.log(`[FILTER] Non-fresher skipped: experienceMin=${extracted.experienceMin}`);
                    failureList.push({ url: job.applyLink, reason: 'Non-fresher (experienceMin >= 3)' });
                    if (job._supabaseId) await markDiscoveredJobStatus(job._supabaseId, 'REJECTED');
                    continue;
                }

                // Domain scorer gate
                const { scoreJobDescription } = await import('@fresherflow/domain');
                const scoreResult = scoreJobDescription(extracted.title || '', extracted.description || '');
                if (scoreResult.verdict === 'REJECT') {
                    console.log(`[FILTER] Domain Scorer rejected: ${scoreResult.metadata.blockingRule || 'Low Score'}`);
                    failureList.push({ url: job.applyLink, reason: `Domain Scorer rejected: ${scoreResult.metadata.blockingRule || 'Low Score'}` });
                    if (job._supabaseId) await markDiscoveredJobStatus(job._supabaseId, 'REJECTED');
                    continue;
                }

                console.log('Job extracted:', {
                    title: extracted.title,
                    company: extracted.company,
                    type: extracted.type,
                    skills: extracted.requiredSkills.slice(0, 5),
                    locations: extracted.locations,
                    workMode: extracted.workMode,
                    exp: `${extracted.experienceMin}-${extracted.experienceMax}yr`,
                });

                const { website, logoUrl } = resolveCompanyWebsiteAndLogo(extracted.company, extracted.applyLink, extracted.companyWebsite);
                extracted.companyWebsite = website || extracted.companyWebsite;
                extracted.companyLogoUrl = logoUrl || extracted.companyLogoUrl;

                allExtracted.push(extracted);
                
                if (ENABLE_API_UPLOAD) {
                    const sourceUrl = job.sourceLink || job.source_url || job.aggregatorUrl || job.jobUrlDirect || extracted.sourceLink || extracted.applyLink;
                    const apiSuccess = await saveJobToSupabase(extracted, sourceUrl, extracted.applyLink);
                    if (apiSuccess) {
                        successList.push({ title: extracted.title, company: extracted.company, url: extracted.applyLink });
                        await saveState(job.applyLink, 'PROCESSED');
                        if (job._supabaseId) await markDiscoveredJobStatus(job._supabaseId, 'PROCESSED');
                    } else {
                        failureList.push({ url: job.applyLink, reason: 'Supabase API insert rejected' });
                        await saveState(job.applyLink, 'FAILED');
                        if (job._supabaseId) await markDiscoveredJobStatus(job._supabaseId, 'FAILED');
                    }
                } else {
                    console.log('Dry-run: skipping API upload.');
                    successList.push({ title: extracted.title, company: extracted.company, url: job.applyLink });
                    await saveState(job.applyLink, 'PROCESSED');
                    if (job._supabaseId) await markDiscoveredJobStatus(job._supabaseId, 'PROCESSED');
                }

            } catch (jobErr) {
                console.error(`[CRITICAL] Error processing ${job.applyLink}:`, jobErr);
                failureList.push({ url: job.applyLink, reason: `Crash: ${(jobErr as Error).message}` });
                await saveState(job.applyLink, 'FAILED');
                if (job._supabaseId) await markDiscoveredJobStatus(job._supabaseId, 'FAILED');
            }

            // Cooldown between batches
            const nextJobIndex = i + 1;
            if (nextJobIndex < jobs.length && nextJobIndex % batchSize === 0) {
                console.log(`\n[BATCH COOLDOWN] Waiting ${batchDelay}s...`);
                await new Promise(r => setTimeout(r, batchDelay * 1000));
            } else if (!NO_LLM && i < jobs.length - 1) {
                await new Promise(r => setTimeout(r, 3000));
            }
        }
    } finally {
        await browser.close();
    }

    console.log(`\n=== Done === Success: ${successList.length} | Failures: ${failureList.length}`);

    // GitHub Actions summary
    if (process.env.GITHUB_STEP_SUMMARY) {
        let summary = `# ⚙️ Job Processing Bot Results\n\n`;
        summary += `| Metric | Value |\n`;
        summary += `|---|---|\n`;
        summary += `| **Total Input Candidates** | **${jobs.length}** |\n`;
        summary += `| **✅ Successfully Processed & Saved** | **${successList.length}** |\n`;
        summary += `| **❌ Processing Failures** | ${failureList.length} |\n\n`;

        if (successList.length > 0) {
            summary += `## 🎯 Successfully Processed Jobs (${successList.length})\n\n`;
            summary += `| # | Role Title | Company | Status | Apply Link |\n`;
            summary += `|---|---|---|---|---|\n`;
            successList.forEach((s, idx) => {
                const title = (s.title || 'Job Opportunity').replace(/\|/g, '&#124;');
                const company = (s.company || 'Company').replace(/\|/g, '&#124;');
                summary += `| ${idx + 1} | ${title} | ${company} | ✅ Saved to DB | [Apply Link](${s.url}) |\n`;
            });
            summary += `\n`;
        }

        if (failureList.length > 0) {
            summary += `## ⚠️ Failures (${failureList.length})\n\n`;
            summary += `| # | URL | Failure Reason |\n`;
            summary += `|---|---|---|\n`;
            failureList.forEach((f, idx) => {
                summary += `| ${idx + 1} | [Job URL](${f.url}) | \`${f.reason}\` |\n`;
            });
            summary += `\n`;
        }

        await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
    }

    // Save output for local inspection
    const scriptDir = path.dirname(fileURLToPath(import.meta.url));
    const rootDocsPath = path.resolve(scriptDir, '../../docs');
    await fs.mkdir(rootDocsPath, { recursive: true });
    await fs.writeFile(
        path.join(rootDocsPath, 'parsed_jobs_output.json'),
        JSON.stringify(allExtracted, null, 2),
        'utf8'
    );

}

run().then(() => {
    console.log('Process completed safely. Exiting.');
    process.exit(0);
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
