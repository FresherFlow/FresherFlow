import { loadEnv } from './src/config.js';
import { bootstrapState } from './src/pipeline/bootstrap.js';
import { discoverAtsJobs, discoverAggregatorJobs } from './src/pipeline/discovery.js';
import { verifyCandidates } from './src/pipeline/verifier.js';
import { persistLocalData, uploadToDataLake } from './src/pipeline/storage.js';
import { sendNotifications, writeGitHubSummary } from './src/pipeline/notifier.js';

await loadEnv();

async function run() {
    const state = await bootstrapState();

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
        await uploadToDataLake(state);

    } finally {
        if (state.browser) {
            await state.browser.close();
        }
    }
}

run().catch(console.error);
