/* eslint-disable @typescript-eslint/no-explicit-any */
import { chromium } from 'playwright';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setCdnMetadata } from '@fresherflow/parser';

import {
    jobSchema,
    normalizeRawJson,
    ExtractedJob,
    postProcessNormalize
} from './src/normalizer.js';

import { 
    loadCdnMetadata, 
    CANONICAL_CITIES_MAP, 
    CANONICAL_COMPANIES, 
    GREENHOUSE_COMPANY_TO_SLUG,
    CANONICAL_SKILLS_MAP 
} from './src/metadata.js';

import {
    applyStealth,
    extractAtsContent,
    isBotOrError,
    trimForLlm
} from './src/browser';

import { extractNativeAtsData } from './src/ats-native';
import { stripBoilerplate, setBoilerplateRegistry } from './src/parsers/greenhouse-parser.js';
import { applyRuleEngine } from './src/rules';

import {
    enrichMissingFields,
    EnrichableField,
} from './src/providers';

import {
    postJobToApi,
    resolveCompanyWebsiteAndLogo
} from './src/api';

import { matchFromCdn } from './src/cdn-matcher';

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
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

    /*
    try {
        const bpRes = await fetch(`${process.env.NEXT_PUBLIC_CDN_URL || process.env.CDN_URL}/boilerplate.json`);
        if (bpRes.ok) {
            const bpData = await bpRes.json();
            setBoilerplateRegistry(bpData);
            console.log('Loaded company boilerplate registry from CDN.');
        } else {
            console.log('Failed to fetch boilerplate.json from CDN, continuing without it.');
        }
    } catch (err) {
        console.log('Error fetching boilerplate.json from CDN:', (err as Error).message);
    }
    */

    setCdnMetadata({
        cities: CANONICAL_CITIES_MAP,
        companies: CANONICAL_COMPANIES,
        skills: CANONICAL_SKILLS_MAP
    });

    const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();
    const API_BASE_URL = (process.env.API_BASE_URL || '').trim().replace(/\/$/, '');
    const ENABLE_API_UPLOAD = process.env.ENABLE_API_UPLOAD === 'true';

    const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

    const args = process.argv.slice(2);
    const positionalArgs = args.filter((arg, idx) =>
        !arg.startsWith('--') &&
        !['--chunk', '--limit', '--batch-size', '--batch-delay'].includes(args[idx - 1])
    );

    let jobsPath = positionalArgs[0] || path.join(process.cwd(), 'jobs.json');
    if (!(await fileExists(jobsPath))) {
        jobsPath = path.join(process.cwd(), '../job-discovery/discovered_jobs.json');
    }
    if (!(await fileExists(jobsPath))) {
        console.log(`No discovered jobs file found at ${jobsPath}. Nothing to process.`);
        process.exit(0);
    }

    const statePath = path.join(process.cwd(), 'processed_urls.json');
    let processedUrls = new Set<string>();
    if (await fileExists(statePath)) {
        try {
            const stateData = JSON.parse(await fs.readFile(statePath, 'utf8'));
            if (Array.isArray(stateData)) processedUrls = new Set(stateData);
        } catch {
            console.error('Failed to parse processed_urls.json, starting fresh.');
        }
    }

    console.log(`Reading jobs from: ${jobsPath}`);
    const fileContent = await fs.readFile(jobsPath, 'utf8');
    let parsedData: any;
    try {
        parsedData = JSON.parse(fileContent);
    } catch (err) {
        console.error('Failed to parse jobs.json:', (err as Error).message);
        process.exit(1);
    }

    let jobs = Array.isArray(parsedData) ? parsedData : (parsedData.jobs || []);
    const totalDiscovered = jobs.length;
    jobs = jobs.filter((j: any) => !processedUrls.has(j.applyLink));
    console.log(`Loaded ${totalDiscovered} jobs. ${totalDiscovered - jobs.length} already processed. ${jobs.length} remaining.`);

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

    const saveState = async (url: string) => {
        processedUrls.add(url);
        await fs.writeFile(statePath, JSON.stringify(Array.from(processedUrls), null, 2));
    };

    const successList: { title: string; company: string; url: string }[] = [];
    const failureList: { url: string; reason: string }[] = [];
    const allExtracted: ExtractedJob[] = [];

    const browser = await chromium.launch({ headless: true });
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
                const aggregatorText = job.aggregatorText && job.aggregatorText.length >= 150
                    ? job.aggregatorText : '';

                let atsContent = { title: '', text: '', html: '' };
                let nativeData = null;

                if (job.atsText && job.atsText.length > 50) {
                    // Pre-supplied text from discovery phase (Naukri/LinkedIn aggregator)
                    atsContent.text = job.atsText;
                    atsContent.title = job.title;
                    console.log(`Pre-supplied ATS text (${job.atsText.length} chars).`);
                    
                    // Try to get structured API data (Greenhouse/Lever etc) without browser
                    const companySlug = GREENHOUSE_COMPANY_TO_SLUG.get((job.company || '').toLowerCase().trim())
                        ?? CANONICAL_COMPANIES.get((job.company || '').toLowerCase().trim())?.slug;
                    nativeData = await extractNativeAtsData(job.applyLink, source, undefined, companySlug);
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

                        if (nativeData && (nativeData.html.length > 200 || nativeData.text.length > 200)) {
                            atsContent = { title: nativeData.title, text: nativeData.text, html: nativeData.html };
                            console.log(`[ATS Adapter] ${source || 'detected'}: ${atsContent.text.length} chars.`);
                        } else {
                            // No specific adapter matched — fall back to generic Playwright
                            atsContent = await extractAtsContent(page, job.applyLink);
                            const blocked = isBotOrError(atsContent.text, atsContent.title);
                            if (blocked || atsContent.text.length < 600) {
                                console.log(`Generic scrape thin/blocked (${atsContent.text.length} chars). Using aggregator text.`);
                                atsContent.text = aggregatorText;
                                atsContent.title = job.aggregatorTitle || job.title;
                            } else {
                                console.log(`Generic Playwright succeeded (${atsContent.text.length} chars).`);
                            }
                        }
                    } catch (pageErr) {
                        console.error(`[WARNING] Playwright failed: ${(pageErr as Error).message}`);
                        atsContent.text = aggregatorText;
                        atsContent.title = job.aggregatorTitle || job.title;
                    } finally {
                        if (page) await page.close();
                    }
                }

                const rawText = atsContent.text || aggregatorText;
                const textForLlm = trimForLlm(rawText);

                if (!textForLlm || textForLlm.length < 50) {
                    console.error('Insufficient job description text obtained.');
                    failureList.push({ url: job.applyLink, reason: 'Insufficient page text extracted' });
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

                // 2b. Build job from native structured data + rules
                const nativeJob: Record<string, unknown> = {
                    type: rules.type ?? 'JOB',
                    title: nativeData?.title || atsContent.title || job.title || '',
                    company: nativeData?.company || job.company || '',
                    applyLink: job.applyLink,
                    locations: nativeData?.locations ?? [],
                    requiredSkills: nativeData?.nativeSkills ?? [],
                    workMode: nativeData?.workplaceType ?? rules.workMode ?? null,
                    experienceMin: nativeData?.experienceMin ?? rules.experienceMin ?? 0,
                    experienceMax: nativeData?.experienceMax ?? rules.experienceMax ?? 0,
                    employmentType: rules.employmentType ?? nativeData?.employmentType ?? '',
                    salaryRange: nativeData?.salaryRange ?? '',
                    allowedPassoutYears: rules.inferredBatches ?? [],
                    allowedDegrees: nativeData?.allowedDegrees ?? [],
                    allowedCourses: nativeData?.allowedCourses ?? [],
                    incentives: nativeData?.incentives ?? '',
                    selectionProcess: nativeData?.selectionProcess ?? '',
                    description: stripBoilerplate(nativeData?.text || atsContent.text || textForLlm, job.company) || stripBoilerplate(aggregatorText, job.company) || stripBoilerplate(textForLlm, job.company),
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
                // allowedDegrees and allowedPassoutYears removed as they are deterministic now
                if (!nativeJob.salaryRange) missingFields.push('salaryRange');
                if (!nativeJob.incentives) missingFields.push('incentives');
                if (!nativeJob.selectionProcess) missingFields.push('selectionProcess');


                console.log(`CDN match done. Missing ${missingFields.length} fields: [${missingFields.join(', ')}]`);

                // ─────────────────────────────────────────────────────────
                // STEP 3: LLM ENRICHMENT (Fallback for missing fields)
                // ─────────────────────────────────────────────────────────
                if (missingFields.length > 0 && ai) {
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
                    continue;
                }

                extracted = postProcessNormalize(extracted, textForLlm);



                // India/Remote filter
                if (extracted.structuredLocations && extracted.structuredLocations.length > 0) {
                    const ok = extracted.structuredLocations.some(
                        (loc: any) => loc.country === 'IN' || loc.type === 'remote' || loc.name.toLowerCase() === 'pan india'
                    );
                    if (!ok) {
                        console.log(`[FILTER] International job skipped: ${JSON.stringify(extracted.structuredLocations)}`);
                        failureList.push({ url: job.applyLink, reason: 'International/unsupported location' });
                        continue;
                    }
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

                const { website, logoUrl } = resolveCompanyWebsiteAndLogo(extracted.company, job.applyLink, extracted.companyWebsite);
                extracted.companyWebsite = website || extracted.companyWebsite;
                extracted.companyLogoUrl = logoUrl || extracted.companyLogoUrl;

                allExtracted.push(extracted);
                if (ENABLE_API_UPLOAD) {
                    const apiSuccess = await postJobToApi(extracted, job.aggregatorUrl || job.applyLink, job.applyLink, API_BASE_URL);
                    if (apiSuccess) {
                        successList.push({ title: extracted.title, company: extracted.company, url: job.applyLink });
                    } else {
                        failureList.push({ url: job.applyLink, reason: 'API POST submission rejected' });
                    }
                } else {
                    console.log('Dry-run: skipping API upload.');
                    successList.push({ title: extracted.title, company: extracted.company, url: job.applyLink });
                }

            } catch (jobErr) {
                console.error(`[CRITICAL] Error processing ${job.applyLink}:`, jobErr);
                failureList.push({ url: job.applyLink, reason: `Crash: ${(jobErr as Error).message}` });
            } finally {
                await saveState(job.applyLink);
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
        let summary = `## Job Processing Results\n\n`;
        summary += `Processed **${jobs.length}** jobs.\n`;
        summary += `- **Successes:** ${successList.length}\n`;
        summary += `- **Failures:** ${failureList.length}\n\n`;
        if (successList.length > 0) {
            summary += `### Successfully Processed\n`;
            successList.forEach(s => { summary += `- **${s.title}** @ ${s.company} (${s.url})\n`; });
        }
        if (failureList.length > 0) {
            summary += `### Failed\n`;
            failureList.forEach(f => { summary += `- ${f.url} (*${f.reason}*)\n`; });
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

run().catch(console.error);
