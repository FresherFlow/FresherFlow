import { loadEnv } from './src/config.js';
import { bootstrapState } from './src/pipeline/bootstrap.js';
import { discoverAtsJobs, discoverAggregatorJobs } from './src/pipeline/discovery.js';
import { verifyCandidates } from './src/pipeline/verifier.js';
import { persistLocalData, uploadToDataLake } from './src/pipeline/storage.js';
import { sendNotifications, writeGitHubSummary } from './src/pipeline/notifier.js';
import { startRun, finishRun } from './src/repositories/discoveryRuns.js';

await loadEnv();

async function run() {
    const startTime = Date.now();
    const runId = await startRun();
    const state = await bootstrapState();

    let runStatus: 'COMPLETED' | 'FAILED' = 'COMPLETED';

    try {
        // 1. Discovery
        await discoverAtsJobs(state);
        
        // 2. Verification (ATS Phase)
        await verifyCandidates(state, "ATS");

        // 3. Discovery (Aggregators Phase)
        await discoverAggregatorJobs(state);

        // 4. Verification (Aggregators Phase)
        await verifyCandidates(state, "Aggregator");

        // 5. Storage & Notifications
        await persistLocalData(state);
        await sendNotifications(state);
        await writeGitHubSummary(state);
        await uploadToDataLake(state, runId); // Pass runId to storage for upserts

    } catch (err) {
        console.error("Critical error during discovery run:", err);
        runStatus = 'FAILED';
        throw err;
    } finally {
        if (state.browser) {
            await state.browser.close();
        }

        const atsJobs = state.newJobsFound.filter(j => j.sourceType === 'ATS');
        const aggJobs = state.newJobsFound.filter(j => j.sourceType === 'AGGREGATOR');
        const reviewJobs = state.newJobsFound.filter(j => j.reviewRequired);
        const accepted = state.newJobsFound.length - reviewJobs.length;
        
        await finishRun(runId, {
            total_found: state.newJobsFound.length,
            accepted: accepted,
            review_required: reviewJobs.length,
            duplicates: 0, // Handled implicitly by Supabase
            failed: state.candidateQueue.length, // Rough proxy for failed processing if left in queue
            duration_ms: Date.now() - startTime,
            status: runStatus
        });
    }
}

run().catch(console.error);
