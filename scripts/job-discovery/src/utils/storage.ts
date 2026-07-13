import { listR2Objects, downloadJsonFromR2, uploadJsonToR2 } from './r2.js';
import { ATS_PROVIDERS } from '../config.js';

const r2Bucket = process.env.R2_BUCKET_NAME || 'fresherflow-cdn';

// Load cached visited URLs from sharded R2 folders
export async function loadVisited(): Promise<Record<string, string[]>> {
    const visited: Record<string, string[]> = {};
    console.log(`Loading visited state from R2 folders...`);
    const objects = await listR2Objects(r2Bucket, 'discovery-state/visited/');
    
    await Promise.all(objects.map(async (obj) => {
        if (!obj.Key || !obj.Key.endsWith('.json')) return;
        const data = await downloadJsonFromR2(r2Bucket, obj.Key);
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
        
        await uploadJsonToR2(arr, r2Bucket, r2Key);
    }));
}

// Load cached rejected reasons from sharded R2 folders
export async function loadRejectedReasons(): Promise<Record<string, string>> {
    const reasons: Record<string, string> = {};
    console.log(`Loading rejected reasons from R2 folders...`);
    const objects = await listR2Objects(r2Bucket, 'discovery-state/rejected/');
    
    await Promise.all(objects.map(async (obj) => {
        if (!obj.Key || !obj.Key.endsWith('.json')) return;
        const data = await downloadJsonFromR2(r2Bucket, obj.Key);
        if (data && typeof data === 'object' && !Array.isArray(data)) {
            Object.assign(reasons, data);
        }
    }));
    return reasons;
}

// Save rejected reasons sharded by domain to R2
export async function saveRejectedReasons(reasons: Record<string, string>) {
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
        await uploadJsonToR2(data, r2Bucket, r2Key);
    }));
}
