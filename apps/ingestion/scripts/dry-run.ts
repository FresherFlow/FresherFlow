import { LeverConnector } from '../src/connectors/lever.connector';
import { GreenhouseConnector } from '../src/connectors/greenhouse.connector';
import { ParserService } from '../src/services/parser.service';
import { DedupeService } from '../src/services/dedupe.service';

/**
 * A dry-run CLI tool to test the Crawler/Ingestion logic locally 
 * without spinning up Express servers, connecting to Redis queues, or touching the database!
 */
async function testIngestionPipeline() {
    console.log("==========================================");
    console.log("🚀 STARTING DRY-RUN CRAWLER TEST");
    console.log("==========================================\n");

    const greenhouse = new GreenhouseConnector();

    // We will use a known tech company that uses Greenhouse
    const testCompanyId = 'airbnb';

    console.log(`📡 Fetching live jobs from Greenhouse ATS -> [Company: ${testCompanyId}]...`);

    try {
        const jobs = await greenhouse.fetchJobs(testCompanyId);

        console.log(`✅ Successfully pulled ${jobs.length} jobs!\n`);

        if (jobs.length === 0) {
            console.log("No jobs found to process for this ATS.");
            return;
        }

        // We only process the first 3 jobs in dry-run mode to prevent terminal flooding
        const sampleJobs = jobs.slice(0, 3);

        for (const job of sampleJobs) {
            console.log("------------------------------------------");

            // Raw properties scraped directly from the Greenhouse JSON:
            const rawTitle = job.title;
            const location = job.location?.name || "Remote";
            const hostedUrl = job.absolute_url;
            const description = job.content || '';

            console.log(`🔸 RAW TITLE:       ${rawTitle}`);
            console.log(`🔸 LOCATION:        ${location}`);
            console.log(`🔸 URL:             ${hostedUrl}`);

            // Step 1: Normalization (Dedupe Pre-processing)
            // This prevents "Sr. Engineer" and "Senior Engineer" from creating duplicate DB rows
            const normalizedTitle = DedupeService.normalizeTitle(rawTitle);
            console.log(`\n🧹 NORMALIZED TITLE: ${normalizedTitle}`);

            // Step 2: NLP Categorization Engine
            // Reads the title and description to figure out if it's a JOB, INTERNSHIP, or WALKIN
            console.log(`\n🧠 RUNNING NLP PARSER...`);
            const parsed = ParserService.parse(`${rawTitle}\n${description}`);

            console.log(`   -> Extracted Type:  [${parsed.type}]`);
            console.log(`   -> Extracted Skills: ${parsed.skills?.slice(0, 5).join(', ') || 'None found'}...`);

            // This is the point where the server would normally call 'enqueueIngestionPayload({ ... })'
            console.log("\n📦 Action: Ready to transmit to BullMQ Worker for database insertion.");
        }

        console.log("------------------------------------------");
        console.log("\n✅ Dry run completed successfully! No jobs were added to the actual database.");

    } catch (error: any) {
        console.error("❌ Dry run failed:", error.message || error);
    }
}

testIngestionPipeline();
