import { chromium } from 'playwright';
import { GoogleGenAI } from '@google/genai';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFromTemplate, isTemplateSource, parseHtmlToMarkdown, cleanClickbait, setCdnMetadata } from '@fresherflow/parser';

import {
    jobSchema,
    normalizeRawJson,
    ExtractedJob,
    JobsJsonFormat,
    postProcessNormalize
} from './src/normalizer.js';

import { 
    loadCdnMetadata, 
    CANONICAL_CITIES_MAP, 
    CANONICAL_COMPANIES, 
    CANONICAL_SKILLS_MAP 
} from './src/metadata.js';

import {
    applyStealth,
    extractAtsContent,
    isBotOrError,
    trimForLlm
} from './src/browser';

import {
    extractJobWithFallback,
    formatJobDescriptionWithFallback
} from './src/providers';

import {
    postJobToApi
} from './src/api';

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

async function loadEnv(): Promise<void> {
    // Check local .env first
    let envPath = path.join(process.cwd(), '.env');
    if (!(await fileExists(envPath))) {
        envPath = path.join(process.cwd(), '../../.env');
    }
    if (!(await fileExists(envPath))) {
        envPath = path.join(process.cwd(), '../.env');
    }
    
    if (await fileExists(envPath)) {
        try {
            const envContent = await fs.readFile(envPath, 'utf8');
            for (const line of envContent.split('\n')) {
                const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
                if (match) {
                    const key = match[1];
                    let value = (match[2] || '').trim();
                    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
                    process.env[key] = value;
                }
            }
            console.log(`Loaded environment variables from ${envPath}`);
        } catch (err) {
            console.error("Failed to read .env file:", err);
        }
    }
}

async function getSystemInstruction(): Promise<string> {
    let promptPath = path.join(process.cwd(), '../../prompts/job-parser.md');
    if (!(await fileExists(promptPath))) {
        promptPath = path.join(process.cwd(), 'prompts/job-parser.md');
    }
    if (!(await fileExists(promptPath))) {
        promptPath = path.join(process.cwd(), '../prompts/job-parser.md');
    }
    
    if (await fileExists(promptPath)) {
        try {
            const content = await fs.readFile(promptPath, 'utf8');
            console.log(`Loaded system instruction prompt from ${promptPath}`);
            return content;
        } catch (err) {
            console.error("Failed to read prompt file, using default:", err);
        }
    }
    return "You are an expert recruitment assistant for FresherFlow. Your task is to parse unstructured job description text and extract key job details as a JSON object.";
}

async function run(): Promise<void> {
    console.log("Starting Job Processor...");

    // Load environment variables dynamically
    await loadEnv();
    
    // Load canonical lists from CDN
    await loadCdnMetadata();
    
    // Inject live CDN metadata into the deterministic template parser
    setCdnMetadata({
        cities: CANONICAL_CITIES_MAP,
        companies: CANONICAL_COMPANIES,
        skills: CANONICAL_SKILLS_MAP
    });

    const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();
    const GROQ_API_KEY = (process.env.GROQ_API_KEY || '').trim();
    const OPENROUTER_API_KEY = (process.env.OPENROUTER_API_KEY || '').trim();
    const API_BASE_URL = (process.env.API_BASE_URL || '').trim().replace(/\/$/, '');
    const ENABLE_API_UPLOAD = process.env.ENABLE_API_UPLOAD !== 'false' && !!API_BASE_URL;

    if (!GEMINI_API_KEY && !GROQ_API_KEY && !OPENROUTER_API_KEY) {
        console.error("Error: None of the AI API keys (GEMINI_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY) are set.");
        process.exit(1);
    }

    const systemInstruction = await getSystemInstruction();
    const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

    // Locate jobs.json input
    let jobsPath = process.argv[2] || path.join(process.cwd(), 'jobs.json');
    if (!(await fileExists(jobsPath))) {
        jobsPath = path.join(process.cwd(), '../job-discovery/discovered_jobs.json');
    }

    if (!(await fileExists(jobsPath))) {
        console.log(`No discovered jobs file found at ${jobsPath}. Nothing to process.`);
        process.exit(0);
    }

    console.log(`Reading jobs from: ${jobsPath}`);
    const fileContent = await fs.readFile(jobsPath, 'utf8');
    let parsedData: JobsJsonFormat;
    try {
        parsedData = JSON.parse(fileContent) as JobsJsonFormat;
    } catch (err) {
        console.error("Failed to parse jobs.json:", (err as Error).message);
        process.exit(1);
    }

    let jobs = parsedData.jobs || [];
    
    // Support limiting the number of jobs processed via environment variable (e.g. LIMIT=5) or CLI flag (--limit 5)
    const limitIndex = process.argv.indexOf('--limit');
    let limit = limitIndex !== -1 ? parseInt(process.argv[limitIndex + 1], 10) : undefined;
    if (process.env.LIMIT) {
        limit = parseInt(process.env.LIMIT, 10);
    }
    if (limit && !isNaN(limit)) {
        console.log(`Limiting job processing to first ${limit} jobs.`);
        jobs = jobs.slice(0, limit);
    }

    // --no-llm: skip all LLM calls, use native parser only (zero token usage)
    const NO_LLM = process.argv.includes('--no-llm') || process.env.NO_LLM === 'true';
    if (NO_LLM) console.log('🔇 NO_LLM mode: all LLM calls skipped, using native parser only.');

    // Support batching and cooldown parameters via CLI or env
    const batchSizeIndex = process.argv.indexOf('--batch-size');
    let batchSize = batchSizeIndex !== -1 ? parseInt(process.argv[batchSizeIndex + 1], 10) : 5; // default to 5
    if (process.env.BATCH_SIZE) {
        batchSize = parseInt(process.env.BATCH_SIZE, 10);
    }

    const batchDelayIndex = process.argv.indexOf('--batch-delay');
    let batchDelay = batchDelayIndex !== -1 ? parseInt(process.argv[batchDelayIndex + 1], 10) : 120; // default to 120s (2 mins)
    if (process.env.BATCH_DELAY) {
        batchDelay = parseInt(process.env.BATCH_DELAY, 10);
    }

    console.log(`Batch configuration: size = ${batchSize}, cooldown delay = ${batchDelay}s.`);

    console.log(`Loaded ${jobs.length} jobs to process.`);

    if (jobs.length === 0) {
        console.log("Zero jobs to process. Exiting.");
        process.exit(0);
    }
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
            console.log(`\n--- [${i + 1}/${jobs.length}] Processing: ${job.applyLink} ---`);

            const source = job.source || '';
            let extracted: ExtractedJob | null = null;

            try {
                // Step 1: Content Extraction
                // PRIMARY: Always scrape the company's direct applyLink (Workday, Greenhouse, etc.)
                // FALLBACK: Use aggregator text if company page blocks us
                const aggregatorText = job.aggregatorText && job.aggregatorText.length >= 150 ? job.aggregatorText : "";

                let atsText = "";
                let atsTitle = "";
                let atsContent = { title: "", text: "", html: "" };
                let isBotOrErrorValue = false;

                // Always scrape the real company career page. No aggregator fallback.
                let page = null;
                try {
                    page = await context.newPage();
                    await applyStealth(page);

                    atsContent = await extractAtsContent(page, job.applyLink);
                    isBotOrErrorValue = isBotOrError(atsContent.text, atsContent.title);

                    if (atsContent.text.length >= 600 && !isBotOrErrorValue) {
                        atsText = atsContent.text;
                        atsTitle = atsContent.title;
                        console.log(`Company page extracted successfully (${atsText.length} chars).`);
                    } else {
                        // Company page blocked — use aggregator text for structured field extraction
                        console.log(`Company page blocked or thin (${atsContent.text.length} chars). Using aggregator text.`);
                        atsText = aggregatorText;
                        atsTitle = job.aggregatorTitle || job.title;
                    }
                } catch (pageErr) {
                    console.error(`[WARNING] Failed to reach ${job.applyLink}:`, (pageErr as Error).message);
                    atsText = aggregatorText;
                    atsTitle = job.aggregatorTitle || job.title;
                } finally {
                    if (page) await page.close();
                }

                // We MUST have *some* text to proceed
                const rawText = atsText;
                const textForLlm = trimForLlm(rawText);

                if (!textForLlm || textForLlm.length < 50) {
                    console.error("Could not obtain sufficient job description text.");
                    failureList.push({ url: job.applyLink, reason: "Insufficient page text extracted" });
                    continue;
                }

                // Step 2: Structured Parsing
                // Strategy: try deterministic template parser first, LLM only as fallback.
                if (isTemplateSource(source) && aggregatorText) {
                    // Parse structured fields from the Aggregator (templates)
                    const { job: templateResult, confidence, companyWebsite: cdnWebsite } = parseFromTemplate(
                        atsText || aggregatorText,
                        atsTitle || job.aggregatorTitle || job.title || '',
                    );
                    
                    if (confidence >= 0.6) {
                        console.log(`Template parser extracted job with confidence ${(confidence * 100).toFixed(0)}% — formatting description with LLM.`);
                        
                        // For template jobs: if we have real ATS HTML, use native parser for description
                        // This avoids burning LLM tokens on formatting when we already have clean HTML
                        const finalTitle = templateResult.title || job.title || (atsTitle && atsTitle.length > 5 ? atsTitle : '');
                        let finalDescription = '';
                        let incentives = templateResult.incentives ?? '';
                        let notesHighlights = '';
                        let selectionProcess = '';
                        let customSlug = '';

                        const hasGoodAtsHtml = atsContent.html && atsContent.html.length > 500 && !isBotOrErrorValue;
                        const hasGoodAtsText = atsText && atsText.length > 300 && !isBotOrErrorValue;

                        if (hasGoodAtsHtml) {
                            // Native parse — zero LLM tokens for description
                            finalDescription = parseHtmlToMarkdown(atsContent.html);
                            console.log(`Native HTML parser: description ${finalDescription.length} chars. Calling focused LLM for notes/incentives/selectionProcess...`);
                            // Focused LLM call for soft fields only (incentives, notesHighlights, selectionProcess)
                            if (!NO_LLM) {
                                try {
                                    const trimmedForSoft = trimForLlm(atsContent.text || atsText, 3000);
                                    const softFields = await formatJobDescriptionWithFallback(ai, trimmedForSoft);
                                    if (softFields) {
                                        incentives = softFields.incentives || incentives;
                                        notesHighlights = softFields.notesHighlights || notesHighlights;
                                        selectionProcess = softFields.selectionProcess || selectionProcess;
                                        customSlug = softFields.customSlug || customSlug;
                                    }
                                } catch { /* soft fields are optional, don't block */ }
                            }
                        } else if (!NO_LLM) {
                            // Company blocked or text-only: LLM formats everything from aggregator text
                            console.log('Company page blocked — calling focused LLM on aggregator text for description + soft fields.');
                            try {
                                const trimmedForFormat = trimForLlm(atsText, 3000);
                                const formatted = await formatJobDescriptionWithFallback(ai, trimmedForFormat);
                                if (formatted) {
                                    finalDescription = formatted.description || finalDescription;
                                    incentives = formatted.incentives || incentives;
                                    notesHighlights = formatted.notesHighlights || notesHighlights;
                                    selectionProcess = formatted.selectionProcess || selectionProcess;
                                    customSlug = formatted.customSlug || customSlug;
                                }
                            } catch (formatErr) {
                                console.error('LLM formatting failed, using cleanClickbait fallback:', formatErr);
                            }
                            if (!finalDescription) finalDescription = cleanClickbait(atsText);
                        } else {
                            // NO_LLM mode
                            finalDescription = cleanClickbait(hasGoodAtsText ? atsText : (templateResult.description || ''));
                        }

                        const merged = {
                            type: templateResult.type ?? 'JOB',
                            title: finalTitle,
                            company: templateResult.company || job.company || '',
                            companyWebsite: cdnWebsite ?? '',
                            companyLogoUrl: '',
                            description: finalDescription,
                            allowedDegrees: templateResult.allowedDegrees ?? [],
                            allowedCourses: templateResult.allowedCourses ?? [],
                            allowedSpecializations: templateResult.allowedSpecializations ?? [],
                            allowedPassoutYears: templateResult.allowedPassoutYears ?? [],
                            requiredSkills: templateResult.skills ?? [],
                            locations: templateResult.locations ?? [],
                            workMode: templateResult.workMode ?? null,
                            experienceMin: templateResult.experienceMin ?? 0,
                            experienceMax: templateResult.experienceMax ?? 0,
                            salaryRange: templateResult.salaryRange ?? '',
                            salaryAmount: '',
                            salaryPeriod: templateResult.salaryPeriod ?? 'YEARLY',
                            employmentType: '',
                            jobFunction: templateResult.jobFunction ?? '',
                            incentives: incentives,
                            selectionProcess: selectionProcess,
                            notesHighlights: notesHighlights,
                            applyLink: job.applyLink,
                            customSlug: customSlug,
                            expiresAt: templateResult.expiresAt ?? '',
                            venueAddress: templateResult.venueAddress ?? '',
                            venueLink: templateResult.venueLink ?? '',
                            dateRange: templateResult.dateRange ?? '',
                            timeRange: templateResult.timeRange ?? '',
                            requiredDocuments: [],
                            contactPerson: '',
                            contactPhone: '',
                            startDate: '',
                            endDate: '',
                            startTime: '10:00',
                            endTime: '13:00',
                            walkInDetails: null,
                            applicationDetails: { method: 'DIRECT' as const },
                        };
                        try {
                            extracted = jobSchema.parse(normalizeRawJson(merged));
                        } catch (parseErr) {
                            console.warn('Template result failed Zod validation, falling back to LLM:', (parseErr as Error).message);
                        }
                    } else {
                        console.log(`Template confidence ${(confidence * 100).toFixed(0)}% too low — falling back to full LLM extraction.`);
                    }
                }

                // LLM Fallback (if not template source or confidence too low)
                if (!extracted) {
                    if (NO_LLM) {
                        // Native-only: build a minimal job from what we have
                        console.log('NO_LLM: using native parser for non-template job.');
                        const nativeDesc = atsContent.html && atsContent.html.length > 200
                            ? parseHtmlToMarkdown(atsContent.html)
                            : cleanClickbait(textForLlm);
                        const raw: Record<string, unknown> = {
                            type: 'JOB',
                            title: atsTitle || job.title,
                            company: atsTitle || job.title,
                            description: nativeDesc,
                            applyLink: job.applyLink,
                        };
                        try { extracted = jobSchema.parse(normalizeRawJson(raw)); } catch { /* skip */ }
                    } else {
                        console.log("Falling back to LLM for extraction.");
                        try {
                            extracted = await extractJobWithFallback(ai, textForLlm, job.applyLink, systemInstruction);
                        } catch (err) {
                            if ((err as Error).message === "GEMINI_DAILY_QUOTA_EXHAUSTED") {
                                console.log("\n[WARNING] Daily Gemini API quota reached and no other fallback providers succeeded. Stopping further processing for this run.");
                                break;
                            }
                            console.error("Unexpected error during job extraction:", err);
                        }
                    }
                }

                if (!extracted) {
                    failureList.push({ url: job.applyLink, reason: "Parsing or Zod validation failed" });
                    continue;
                }

                // Apply normalization brain
                extracted = postProcessNormalize(extracted, textForLlm);

                console.log("Parsed structured details:", {
                    title: extracted.title,
                    company: extracted.company,
                    type: extracted.type,
                    requiredSkills: extracted.requiredSkills,
                    locations: extracted.locations,
                });

                // Step 3: API Ingestion
                allExtracted.push(extracted); // always save locally for inspection
                if (ENABLE_API_UPLOAD) {
                    const apiSuccess = await postJobToApi(extracted, job.aggregatorUrl || job.applyLink, job.applyLink, API_BASE_URL);
                    if (apiSuccess) {
                        successList.push({ title: extracted.title, company: extracted.company, url: job.applyLink });
                    } else {
                        failureList.push({ url: job.applyLink, reason: "API POST submission rejected" });
                    }
                } else {
                    console.log("API upload is disabled (dry-run). Saving success list item.");
                    successList.push({ title: extracted.title, company: extracted.company, url: job.applyLink });
                }
            } catch (jobErr) {
                console.error(`[CRITICAL] Unexpected error processing job at ${job.applyLink}:`, jobErr);
                failureList.push({ url: job.applyLink, reason: `Unexpected crash: ${(jobErr as Error).message}` });
            }

            // Cooldown between batches
            const nextJobIndex = i + 1;
            if (nextJobIndex < jobs.length && nextJobIndex % batchSize === 0) {
                console.log(`\n[BATCH COOLDOWN] Completed batch of ${batchSize} jobs. Waiting ${batchDelay} seconds to prevent API rate limits...`);
                await new Promise(r => setTimeout(r, batchDelay * 1000));
            } else {
                // Standard spacing between individual LLM jobs
                const usedLlm = !isTemplateSource(source) || !extracted || (extracted && !job.aggregatorText);
                if (usedLlm && i < jobs.length - 1) {
                    console.log('Waiting 4.5 seconds to respect Gemini/Groq rate limits...');
                    await new Promise(r => setTimeout(r, 4500));
                }
            }
        }
    } finally {
        await browser.close();
    }

    console.log(`\n=== Processing Finished ===`);
    console.log(`Success: ${successList.length}`);
    console.log(`Failures: ${failureList.length}`);

    // Write summary for GitHub Actions
    if (process.env.GITHUB_STEP_SUMMARY) {
        let summary = `## Job Processing Bot Results\n\n`;
        summary += `Processed **${jobs.length}** jobs.\n`;
        summary += `- **Successes:** ${successList.length}\n`;
        summary += `- **Failures:** ${failureList.length}\n\n`;

        if (successList.length > 0) {
            summary += `### Successfully Processed Jobs\n`;
            successList.forEach(s => {
                summary += `- **${s.title}** @ ${s.company} (${s.url})\n`;
            });
            summary += `\n`;
        }

        if (failureList.length > 0) {
            summary += `### Failed Jobs\n`;
            failureList.forEach(f => {
                summary += `- ${f.url} (Reason: *${f.reason}*)\n`;
            });
            summary += `\n`;
        }

        await fs.appendFile(process.env.GITHUB_STEP_SUMMARY, summary);
    }
    
    // Save to test output file for comparison
    const scriptDir = path.dirname(fileURLToPath(import.meta.url));
    const rootDocsPath = path.resolve(scriptDir, '../../docs');
    await fs.mkdir(rootDocsPath, { recursive: true });
    await fs.writeFile(path.join(rootDocsPath, 'parsed_jobs_output.json'), JSON.stringify(allExtracted, null, 2), 'utf8');
}

run().catch(console.error);
