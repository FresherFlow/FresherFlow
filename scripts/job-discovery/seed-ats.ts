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

    console.log(`Loading current ATS registry from docs/ats/...`);
    const atsDir = path.join(process.cwd(), '../../docs/ats');
    const files = await fs.readdir(atsDir);
    const atsRegistry: AtsRegistry = {};
    for (const file of files) {
        if (file.endsWith('.json')) {
            const content = await fs.readFile(path.join(atsDir, file), 'utf8');
            const providerData = JSON.parse(content);
            const providerName = file.replace('.json', '');
            atsRegistry[providerName] = providerData;
        }
    }

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
        console.log(`\nFound ${newFound} new ATS boards! Saving to docs/ats/...`);
        for (const [provider, boards] of Object.entries(atsRegistry)) {
            const providerPath = path.join(atsDir, `${provider}.json`);
            await fs.writeFile(providerPath, JSON.stringify(boards, null, 2), 'utf8');
        }
        
        // Note: R2 upload would need to be updated to upload individual files if needed.
    } else {
        console.log('No new ATS boards discovered.');
    }
}

run().catch(console.error);
