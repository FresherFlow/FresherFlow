import fs from 'fs';
import path from 'path';

export function logDecision(result: any, jobId: string, company: string) {
    try {
        const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const logDir = path.join(process.cwd(), 'logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        const logFile = path.join(logDir, `${date}.jsonl`);
        
        const logEntry = {
            timestamp: new Date().toISOString(),
            jobId,
            company,
            ...result
        };
        
        fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    } catch (e) {
        console.error("Failed to log decision to JSONL:", e);
    }
}
