import { loadEnv } from '@fresherflow/pipeline';
import { bootstrapState } from './src/pipeline/bootstrap.js';
import { discoverAtsJobs, discoverAggregatorJobs } from './src/pipeline/discovery.js';
import { discoverDorkerJobs } from './src/pipeline/dorker.js';
import { verifyCandidates } from './src/pipeline/verifier.js';
import { persistLocalData, uploadToDataLake } from './src/pipeline/storage.js';
import { sendNotifications, writeGitHubSummary } from './src/pipeline/notifier.js';
import { startRun, finishRun } from '@fresherflow/pipeline';

await loadEnv();

async function run() {
    const startTime = Date.now();
    const runId = await startRun();
    const state = await bootstrapState();

    const TIMEOUT_MS = 80 * 60 * 1000; // 80 minutes (to safely exit before 90m GH Action limit)
    state.isTimeUp = () => (Date.now() - startTime) > TIMEOUT_MS;

    let runStatus: 'COMPLETED' | 'FAILED' = 'COMPLETED';

    try {
        let isDiscoveryRunning = true;

        // Start the verifier daemon in parallel
        const verifierPromise = verifyCandidates(state, () => isDiscoveryRunning);

        // Run all three discovery phases concurrently — dorker doesn't block aggregators
        await Promise.all([
            discoverAtsJobs(state),
            discoverDorkerJobs(state),
            discoverAggregatorJobs(state),
        ]);

        // Signal that discovery is complete
        isDiscoveryRunning = false;

        // Wait for verification daemon to finish processing the queue
        await verifierPromise;

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
            status: runStatus,
            metadata: {
                company_resolved: state.stats.company_resolved,
                company_new: state.stats.company_new,
                company_matched: state.stats.company_matched,
                company_unresolved: state.stats.company_unresolved,
                company_ats_yield: state.stats.company_ats_yield
            }
        });
    }
}

run().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
