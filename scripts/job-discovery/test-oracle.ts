import fs from 'node:fs/promises';
import path from 'node:path';
import { OracleAdapter } from './src/ats/OracleAdapter.js';
import { hasFresherKeyword } from './src/filters/text-filters.js';
import { AtsRegistry } from './src/ats/index.js';

async function run() {
    console.log('Testing Oracle Adapter...');
    const boardsPath = path.join(process.cwd(), '../../docs/ats_boards.json');
    const outPath = path.join(process.cwd(), '../../docs/oracle_test_results.json');
    
    let registry: AtsRegistry;
    try {
        const raw = await fs.readFile(boardsPath, 'utf8');
        registry = JSON.parse(raw);
    } catch (err) {
        console.error('Failed to read ats_boards.json:', err);
        return;
    }

    const oracleCompanies = registry.oracle || {};
    const adapter = new OracleAdapter();
    const results: any[] = [];

    for (const [url, name] of Object.entries(oracleCompanies)) {
        console.log(`\nFetching ${name} (${url})...`);
        try {
            const jobs = await adapter.fetchJobs(url, name);
            let fresherCount = 0;
            
            for (const job of jobs) {
                // If description is missing, we only have title/location
                const textToSearch = (job.title + ' ' + (job.description || '')).toLowerCase();
                if (hasFresherKeyword(textToSearch)) {
                    fresherCount++;
                }
            }

            console.log(`✅ ${name}: ${jobs.length} total jobs, ${fresherCount} fresher jobs`);
            results.push({
                company: name,
                url,
                totalJobs: jobs.length,
                fresherJobs: fresherCount,
                status: 'success'
            });
        } catch (err: any) {
            console.log(`❌ ${name}: Error - ${err.message}`);
            results.push({
                company: name,
                url,
                status: 'error',
                error: err.message
            });
        }
    }

    await fs.writeFile(outPath, JSON.stringify(results, null, 2), 'utf8');
    console.log(`\nResults saved to ${outPath}`);
}

run().catch(console.error);
