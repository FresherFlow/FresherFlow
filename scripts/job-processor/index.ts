import { chromium, Page } from 'playwright';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import fs from 'node:fs/promises';
import path from 'node:path';

// --- CONFIGURATION ---
// Configuration variables are loaded dynamically from environment files.

// --- SCHEMA & VALIDATION ---
const walkInDetailsSchema = z.object({
    dateRange: z.string().optional().default(''),
    timeRange: z.string().optional().default(''),
    reportingTime: z.string().optional().default(''),
    dates: z.array(z.string()).default([]),
    venueAddress: z.string().optional().default(''),
    venueLink: z.string().optional().default(''),
    requiredDocuments: z.array(z.string()).default([]),
    contactPerson: z.string().optional().default(''),
    contactPhone: z.string().optional().default(''),
}).optional().nullable();

const applicationDetailsSchema = z.object({
    method: z.enum(['DIRECT', 'FORM', 'ASSESSMENT']).optional().default('DIRECT'),
    platform: z.string().optional().default(''),
    estimatedMinutes: z.number().int().positive().optional(),
    requiredItems: z.array(z.string()).optional().default([])
}).optional().nullable().default({ method: 'DIRECT' });

const jobSchema = z.object({
    type: z.enum(['JOB', 'INTERNSHIP', 'WALKIN', 'REMOTE', 'GOVERNMENT', 'HACKATHONS']).catch('JOB'),
    title: z.string().min(1),
    company: z.string().min(1),
    companyWebsite: z.string().optional().default(''),
    companyLogoUrl: z.string().optional().default(''),
    description: z.string().optional().default(''),
    allowedDegrees: z.array(z.string()).default([]),
    allowedCourses: z.array(z.string()).default([]),
    allowedSpecializations: z.array(z.string()).default([]),
    allowedPassoutYears: z.array(z.number().int()).default([]),
    requiredSkills: z.array(z.string()).default([]),
    locations: z.array(z.string()).default([]),
    workMode: z.enum(['ONSITE', 'HYBRID', 'REMOTE']).optional().nullable(),
    experienceMin: z.number().optional().nullable().default(0),
    experienceMax: z.number().optional().nullable().default(0),
    salaryRange: z.string().optional().default(''),
    salaryAmount: z.string().optional().default(''),
    salaryPeriod: z.enum(['MONTHLY', 'YEARLY']).catch('YEARLY'),
    employmentType: z.string().optional().default(''),
    jobFunction: z.string().optional().default(''),
    incentives: z.string().optional().default(''),
    selectionProcess: z.string().optional().default(''),
    notesHighlights: z.string().optional().default(''),
    applyLink: z.string().optional().default(''),
    customSlug: z.string().optional().default(''),
    expiresAt: z.string().optional().default(''),
    applicationDetails: applicationDetailsSchema,
    
    // Walk-in fields
    venueAddress: z.string().optional().default(''),
    venueLink: z.string().optional().default(''),
    dateRange: z.string().optional().default(''),
    timeRange: z.string().optional().default(''),
    requiredDocuments: z.array(z.string()).default([]),
    contactPerson: z.string().optional().default(''),
    contactPhone: z.string().optional().default(''),
    startDate: z.string().optional().default(''),
    endDate: z.string().optional().default(''),
    startTime: z.string().optional().default('10:00'),
    endTime: z.string().optional().default('13:00'),
    walkInDetails: walkInDetailsSchema
});

type ExtractedJob = z.infer<typeof jobSchema>;

interface DiscoveredJob {
    title: string;
    applyLink: string;
    source: string;
    discoveredAt: string;
    reviewRequired?: boolean;
    aggregatorUrl?: string;
    aggregatorTitle?: string;
    aggregatorText?: string;
}

interface JobsJsonFormat {
    version: number;
    source: string;
    jobs: DiscoveredJob[];
}

async function fileExists(filePath: string): Promise<boolean> {
    try {
        await fs.access(filePath);
        return true;
    } catch {
        return false;
    }
}

// Extract page text using Playwright
async function extractPageText(page: Page, url: string): Promise<string> {
    try {
        console.log(`Loading job page: ${url}`);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(10000); // Let content settle / SPA render

        // Extract body text
        const bodyText = await page.locator('body').innerText().catch(() => "");
        return bodyText.trim();
    } catch (err) {
        console.error(`Failed to load/extract page text for ${url}:`, (err as Error).message);
        return "";
    }
}

// Call Gemini API to extract structured fields (with retry)
async function extractJobWithGemini(ai: GoogleGenAI, text: string, applyLink: string, systemInstruction: string, attempt = 1): Promise<ExtractedJob | null> {
    if (!text || text.length < 50) {
        console.warn("Input text is too short to parse.");
        return null;
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Apply Link: ${applyLink}\n\nHere is the raw job description text:\n\n${text}`,
            config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: 'OBJECT',
                    properties: {
                        type: { type: 'STRING', enum: ['JOB', 'INTERNSHIP', 'WALKIN'] },
                        title: { type: 'STRING' },
                        company: { type: 'STRING' },
                        companyWebsite: { type: 'STRING' },
                        description: { type: 'STRING' },
                        allowedDegrees: { type: 'ARRAY', items: { type: 'STRING' } },
                        allowedCourses: { type: 'ARRAY', items: { type: 'STRING' } },
                        allowedSpecializations: { type: 'ARRAY', items: { type: 'STRING' } },
                        allowedPassoutYears: { type: 'ARRAY', items: { type: 'INTEGER' } },
                        requiredSkills: { type: 'ARRAY', items: { type: 'STRING' } },
                        locations: { type: 'ARRAY', items: { type: 'STRING' } },
                        workMode: { type: 'STRING', enum: ['ONSITE', 'HYBRID', 'REMOTE'] },
                        experienceMin: { type: 'INTEGER' },
                        experienceMax: { type: 'INTEGER' },
                        salaryRange: { type: 'STRING' },
                        salaryAmount: { type: 'STRING' },
                        salaryPeriod: { type: 'STRING', enum: ['MONTHLY', 'YEARLY'] },
                        employmentType: { type: 'STRING' },
                        jobFunction: { type: 'STRING' },
                        incentives: { type: 'STRING' },
                        selectionProcess: { type: 'STRING' },
                        notesHighlights: { type: 'STRING' },
                        applyLink: { type: 'STRING' },
                        customSlug: { type: 'STRING' },
                        expiresAt: { type: 'STRING' },
                        venueAddress: { type: 'STRING' },
                        venueLink: { type: 'STRING' },
                        dateRange: { type: 'STRING' },
                        timeRange: { type: 'STRING' },
                        requiredDocuments: { type: 'ARRAY', items: { type: 'STRING' } },
                        contactPerson: { type: 'STRING' },
                        contactPhone: { type: 'STRING' },
                        startDate: { type: 'STRING' },
                        endDate: { type: 'STRING' },
                        startTime: { type: 'STRING' },
                        endTime: { type: 'STRING' },
                        walkInDetails: {
                            type: 'OBJECT',
                            properties: {
                                dateRange: { type: 'STRING' },
                                timeRange: { type: 'STRING' },
                                reportingTime: { type: 'STRING' },
                                dates: { type: 'ARRAY', items: { type: 'STRING' } },
                                venueAddress: { type: 'STRING' },
                                venueLink: { type: 'STRING' },
                                requiredDocuments: { type: 'ARRAY', items: { type: 'STRING' } },
                                contactPerson: { type: 'STRING' },
                                contactPhone: { type: 'STRING' }
                            }
                        }
                    },
                    required: [
                        'type', 'title', 'company', 'companyWebsite', 'description',
                        'allowedDegrees', 'allowedCourses', 'allowedSpecializations', 'allowedPassoutYears',
                        'requiredSkills', 'locations', 'workMode',
                        'experienceMin', 'experienceMax',
                        'salaryRange', 'salaryAmount', 'salaryPeriod',
                        'employmentType', 'jobFunction', 'incentives',
                        'selectionProcess', 'notesHighlights', 'applyLink', 'customSlug', 'expiresAt',
                        'venueAddress', 'venueLink', 'dateRange', 'timeRange',
                        'requiredDocuments', 'contactPerson', 'contactPhone',
                        'startDate', 'endDate', 'startTime', 'endTime', 'walkInDetails'
                    ],
                }
            }
        });

        const jsonText = response.text;
        if (!jsonText) {
            throw new Error("Empty response from Gemini API");
        }

        const rawJson = JSON.parse(jsonText);
        const validated = jobSchema.parse(rawJson);
        return validated;
    } catch (err) {
        console.error(`Gemini attempt ${attempt}/2 failed:`, err);
        if (attempt < 2) {
            console.log("Retrying in 5 seconds...");
            await new Promise(r => setTimeout(r, 5000));
            return extractJobWithGemini(ai, text, applyLink, systemInstruction, attempt + 1);
        }
        return null;
    }
}

function resolveCompanyWebsiteAndLogo(company: string, applyLink: string, extractedWebsite: string | null | undefined): { website: string; logoUrl: string } {
    let website = (extractedWebsite || "").trim();
    
    // Check if website is valid, if not try to parse from applyLink
    if (!website || !website.startsWith('http')) {
        try {
            const url = new URL(applyLink);
            const host = url.hostname.toLowerCase();
            
            // Handle enterprise ATS subdomains (e.g. philips.wd3.myworkdayjobs.com -> philips.com)
            if (host.includes('myworkdayjobs.com') || host.includes('eightfold.ai') || host.includes('greenhouse.io') || host.includes('lever.co') || host.includes('darwinbox.in')) {
                const parts = host.split('.');
                const subdomain = parts[0];
                website = `https://${subdomain}.com`;
            } else {
                // E.g. careers.cisco.com -> cisco.com
                const parts = host.split('.');
                if (parts.length >= 2) {
                    const domain = parts.slice(-2).join('.');
                    website = `https://${domain}`;
                } else {
                    website = `https://${host}`;
                }
            }
        } catch {
            const cleanName = company.toLowerCase().replace(/[^a-z0-9]/g, '');
            website = `https://${cleanName}.com`;
        }
    }

    let logoUrl = "";
    try {
        const parsedUrl = new URL(website);
        const domain = parsedUrl.hostname.replace(/^www\./i, '');
        logoUrl = `https://logo.clearbit.com/${domain}`;
    } catch {
        // Ignore
    }

    return { website, logoUrl };
}

// POST parsed job to FresherFlow API
async function postJobToApi(job: ExtractedJob, sourceLink: string, applyLink: string, apiBaseUrl: string): Promise<boolean> {
    const url = `${apiBaseUrl}/api/opportunities/submit`;

    const { website, logoUrl } = resolveCompanyWebsiteAndLogo(job.company, applyLink, job.companyWebsite);

    const payload = {
        ...job,
        companyWebsite: website || job.companyWebsite || null,
        companyLogoUrl: logoUrl || null,
        sourceLink: null, // "dont mention source whenit was scraping, applylink is enough"
        applyLink,
        applicationDetails: job.applicationDetails || { method: "DIRECT" }
    };

    try {
        console.log(`POSTing to backend API: ${url}`);
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': process.env.INTERNAL_API_SECRET || '',
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            console.error(`API response failed (${res.status}):`, body.message || res.statusText);
            return false;
        }

        const data = await res.json();
        console.log(`API response success:`, data.message || "Submitted successfully");
        return true;
    } catch (err) {
        console.error(`Failed to POST job to API:`, (err as Error).message);
        return false;
    }
}

async function loadEnv() {
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

async function run() {
    console.log("Starting Job Processor...");

    // Load environment variables dynamically
    await loadEnv();

    const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();
    const API_BASE_URL = (process.env.API_BASE_URL || '').trim().replace(/\/$/, '');
    const ENABLE_API_UPLOAD = process.env.ENABLE_API_UPLOAD !== 'false' && !!API_BASE_URL;

    if (!GEMINI_API_KEY) {
        console.error("Error: GEMINI_API_KEY environment variable is not set.");
        process.exit(1);
    }

    const systemInstruction = await getSystemInstruction();
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

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
        parsedData = JSON.parse(fileContent);
    } catch (err) {
        console.error("Failed to parse jobs.json:", (err as Error).message);
        process.exit(1);
    }

    const jobs = parsedData.jobs || [];
    console.log(`Loaded ${jobs.length} jobs to process.`);

    if (jobs.length === 0) {
        console.log("Zero jobs to process. Exiting.");
        process.exit(0);
    }

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 }
    });

    const successList: { title: string; company: string; url: string }[] = [];
    const failureList: { url: string; reason: string }[] = [];

    for (let i = 0; i < jobs.length; i++) {
        const job = jobs[i];
        console.log(`\n--- [${i + 1}/${jobs.length}] Processing: ${job.applyLink} ---`);

        // Step 1: Extract Text
        // Priority: aggregatorText (pre-verified by discovery bot) > live apply-link page
        // Reason: many enterprise ATS portals (Cisco, Workday) block headless browsers,
        // returning nav/cookie junk that passes length checks but has no real job data.
        let jobText = "";
        if (job.aggregatorText && job.aggregatorText.length >= 150) {
            console.log("Using pre-saved aggregator page text as primary source.");
            jobText = job.aggregatorText;
        } else {
            const page = await context.newPage();
            // Stealth: Hide webdriver property from bot detection (like Cloudflare Turnstile)
            await page.addInitScript(() => {
                Object.defineProperty(navigator, 'webdriver', {
                    get: () => undefined,
                });
            });

            jobText = await extractPageText(page, job.applyLink);
            await page.close();

            if (!jobText || jobText.length < 150) {
                console.log("Apply link text was sparse. Falling back to aggregator text.");
                jobText = job.aggregatorText || "";
            }
        }

        if (!jobText || jobText.length < 50) {
            console.error("Could not obtain sufficient job description text.");
            failureList.push({ url: job.applyLink, reason: "Insufficient page text extracted" });
            continue;
        }

        // Step 2: Gemini Parsing
        console.log("Sending text to Gemini API...");
        const extracted = await extractJobWithGemini(ai, jobText, job.applyLink, systemInstruction);
        if (!extracted) {
            failureList.push({ url: job.applyLink, reason: "Gemini parsing or Zod validation failed" });
            continue;
        }

        console.log("Parsed structured details:", {
            title: extracted.title,
            company: extracted.company,
            type: extracted.type,
            requiredSkills: extracted.requiredSkills,
            locations: extracted.locations,
        });

        // Step 3: API Ingestion
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
    }

    await browser.close();

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
}

run().catch(console.error);
