import fs from 'node:fs/promises';
import path from 'node:path';
import { listR2Objects, downloadJsonFromR2, uploadJsonToR2 } from '@fresherflow/utils/r2';
import { ATS_PROVIDERS } from '@fresherflow/pipeline';

// State storage backend. Discovery bots are intentionally isolated:
// - 'r2' (default): shared R2 state used by the ATS discovery bot
// - 'local': local JSON files under .state/ restored/saved by GitHub Actions cache (aggregator bot)
const STATE_STORAGE = process.env.DISCOVERY_STATE_STORAGE === 'local' ? 'local' : 'r2';

function localStatePaths() {
    const dir = path.join(process.cwd(), '.state');
    return {
        dir,
        visited: path.join(dir, 'visited.json'),
        rejected: path.join(dir, 'rejected.json'),
        posted: path.join(dir, 'posted.json'),
    };
}

function getBucket(): string {
    if (!process.env.R2_BUCKET_NAME) throw new Error('R2_BUCKET_NAME is not set.');
    return process.env.R2_BUCKET_NAME;
}

// Load cached visited URLs from sharded R2 folders
export async function loadVisited(): Promise<Record<string, string[]>> {
    if (STATE_STORAGE === 'local') {
        const { visited } = localStatePaths();
        try {
            const data = JSON.parse(await fs.readFile(visited, 'utf8'));
            if (data && typeof data === 'object') {
                console.log(`Loading visited state from GitHub-cache file: ${visited}`);
                return data;
            }
        } catch {}
        console.warn(`No cached visited state at ${visited}, starting fresh.`);
        return {};
    }
    if (!process.env.R2_BUCKET_NAME) {
        console.warn('R2_BUCKET_NAME not set, using empty local visited cache.');
        return {};
    }
    const visited: Record<string, string[]> = {};
    console.log(`Loading visited state from R2 folders...`);
    const objects = await listR2Objects(getBucket(), 'discovery-state/visited/');
    
    await Promise.all(objects.map(async (obj: any) => {
        if (!obj.Key || !obj.Key.endsWith('.json')) return;
        const data = await downloadJsonFromR2(getBucket(), obj.Key);
        if (data && Array.isArray(data)) {
            // Reconstruct the provider key from the file name
            let providerName = obj.Key.split('/').pop()?.replace('.json', '') || '';
            if (providerName === 'discovered_links') providerName = '__discovered_apply_links__';
            
            if (providerName) {
                visited[providerName] = data;
            }
        }
    }));
    return visited;
}

// Save visited URLs into sharded R2 folders
export async function saveVisited(visited: Record<string, string[]>) {
    if (STATE_STORAGE === 'local') {
        const { dir, visited: file } = localStatePaths();
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(file, JSON.stringify(visited), 'utf8');
        console.log(`Saved visited state to GitHub-cache file: ${file}`);
        return;
    }
    if (!process.env.R2_BUCKET_NAME) {
        console.warn('R2_BUCKET_NAME not set, skipping saveVisited to R2.');
        return;
    }
    console.log(`Saving visited state to R2 folders...`);
    await Promise.all(Object.entries(visited).map(async ([key, arr]) => {
        if (arr.length === 0) return;
        
        let folder = 'global';
        if (ATS_PROVIDERS.includes(key)) {
            folder = 'ats';
        } else if (key !== '__discovered_apply_links__') {
            folder = 'aggregators';
        }

        const fileName = key === '__discovered_apply_links__' ? 'discovered_links' : key;
        const r2Key = `discovery-state/visited/${folder}/${fileName}.json`;
        
        await uploadJsonToR2(arr, getBucket(), r2Key);
    }));
}

// Load cached rejected reasons from sharded R2 folders
export async function loadRejectedReasons(): Promise<Record<string, string>> {
    if (STATE_STORAGE === 'local') {
        const { rejected } = localStatePaths();
        try {
            const data = JSON.parse(await fs.readFile(rejected, 'utf8'));
            if (data && typeof data === 'object') {
                console.log(`Loading rejected reasons from GitHub-cache file: ${rejected}`);
                return data;
            }
        } catch {}
        console.warn(`No cached rejected reasons at ${rejected}, starting fresh.`);
        return {};
    }
    if (!process.env.R2_BUCKET_NAME) {
        console.warn('R2_BUCKET_NAME not set, using empty local visited cache.');
        return {};
    }
    const reasons: Record<string, string> = {};
    console.log(`Loading rejected reasons from R2 folders...`);
    const objects = await listR2Objects(getBucket(), 'discovery-state/rejected/');
    
    await Promise.all(objects.map(async (obj: any) => {
        if (!obj.Key || !obj.Key.endsWith('.json')) return;
        const data = await downloadJsonFromR2(getBucket(), obj.Key);
        if (data && typeof data === 'object' && !Array.isArray(data)) {
            Object.assign(reasons, data);
        }
    }));
    return reasons;
}

// Save rejected reasons sharded by domain to R2
export async function saveRejectedReasons(reasons: Record<string, string>) {
    if (STATE_STORAGE === 'local') {
        const { dir, rejected: file } = localStatePaths();
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(file, JSON.stringify(reasons), 'utf8');
        console.log(`Saved rejected reasons to GitHub-cache file: ${file}`);
        return;
    }
    if (!process.env.R2_BUCKET_NAME) {
        console.warn('R2_BUCKET_NAME not set, skipping saveRejectedReasons to R2.');
        return;
    }
    console.log(`Saving rejected reasons to R2 folders...`);
    const sharded: Record<string, Record<string, string>> = {};
    
    // Shard by hostname
    for (const [url, reason] of Object.entries(reasons)) {
        let domain = 'unknown';
        try {
            domain = new URL(url).hostname;
        } catch {}
        
        if (!sharded[domain]) sharded[domain] = {};
        sharded[domain][url] = reason;
    }

    await Promise.all(Object.entries(sharded).map(async ([domain, data]) => {
        if (Object.keys(data).length === 0) return;
        const r2Key = `discovery-state/rejected/${domain}.json`;
        await uploadJsonToR2(data, getBucket(), r2Key);
    }));
}

// Load apply links already posted to social media — so the bot never posts the same job again
export async function loadPostedLinks(): Promise<string[]> {
    if (STATE_STORAGE === 'local') {
        const { posted } = localStatePaths();
        try {
            const data = JSON.parse(await fs.readFile(posted, 'utf8'));
            if (Array.isArray(data)) {
                console.log(`Loading posted links from GitHub-cache file: ${posted}`);
                return data;
            }
        } catch {}
        console.warn(`No cached posted links at ${posted}, starting fresh.`);
        return [];
    }
    // ATS bot never posts to social — nothing to track in R2 mode
    return [];
}

// Save apply links posted to social media
export async function savePostedLinks(posted: string[]) {
    if (STATE_STORAGE === 'local') {
        const { dir, posted: file } = localStatePaths();
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(file, JSON.stringify(posted), 'utf8');
        console.log(`Saved posted links to GitHub-cache file: ${file}`);
    }
}
