import fs from 'node:fs/promises';
import path from 'node:path';
import { extractAtsBoard } from './src/core/ats-detector.js';
import { AtsRegistry } from './src/ats/index.js';
import { uploadToR2 } from './src/utils/r2.js';
import { loadEnv } from './src/config.js';

async function run() {
    await loadEnv();

    const dataPath = path.join(process.cwd(), '../../docs/companiesdata links.json');
    const atsPath = path.join(process.cwd(), '../../docs/ats_boards.json');

    console.log(`Loading company data from ${dataPath}...`);
    const dataRaw = await fs.readFile(dataPath, 'utf8');
    const companies = JSON.parse(dataRaw) as Array<{ company: string, sample_apply_link: string }>;

    console.log(`Loading current ATS registry from ${atsPath}...`);
    const atsRaw = await fs.readFile(atsPath, 'utf8');
    const atsRegistry = JSON.parse(atsRaw) as AtsRegistry;

    let modified = false;
    let newFound = 0;

    for (const comp of companies) {
        if (!comp.sample_apply_link) continue;
        
        const match = extractAtsBoard(comp.sample_apply_link);
        if (match) {
            const { provider, boardId } = match;
            if (!atsRegistry[provider]) atsRegistry[provider] = {};
            
            if (!atsRegistry[provider]![boardId]) {
                console.log(`🌟 Discovered NEW ATS board: ${provider} -> ${boardId} (${comp.company})`);
                atsRegistry[provider]![boardId] = comp.company;
                modified = true;
                newFound++;
            }
        }
    }

    if (modified) {
        console.log(`\nFound ${newFound} new ATS boards! Saving to ats_boards.json...`);
        await fs.writeFile(atsPath, JSON.stringify(atsRegistry, null, 2), 'utf8');
        
        const bucketName = process.env.R2_BUCKET_NAME;
        if (bucketName) {
            console.log(`Uploading to R2 bucket: ${bucketName}...`);
            await uploadToR2(atsPath, bucketName, 'ats_boards.json');
            console.log('Upload complete.');
        } else {
            console.warn('R2_BUCKET_NAME is not set. Skipping R2 upload.');
        }
    } else {
        console.log('No new ATS boards discovered.');
    }
}

run().catch(console.error);
