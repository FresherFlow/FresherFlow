import fs from 'node:fs/promises';
import { VISITED_FILE, REJECTED_REASONS_FILE } from '../config.js';

// Load cached visited URLs
export async function loadVisited(): Promise<Record<string, string[]>> {
    try {
        const data = await fs.readFile(VISITED_FILE, 'utf-8');
        return JSON.parse(data) as Record<string, string[]>;
    } catch {
        return {};
    }
}

// Save visited URLs
export async function saveVisited(visited: Record<string, string[]>) {
    await fs.writeFile(VISITED_FILE, JSON.stringify(visited, null, 2));
}

// Load cached rejected reasons
export async function loadRejectedReasons(): Promise<Record<string, string>> {
    try {
        const data = await fs.readFile(REJECTED_REASONS_FILE, 'utf-8');
        return JSON.parse(data) as Record<string, string>;
    } catch {
        return {};
    }
}

// Save rejected reasons
export async function saveRejectedReasons(reasons: Record<string, string>) {
    await fs.writeFile(REJECTED_REASONS_FILE, JSON.stringify(reasons, null, 2));
}
