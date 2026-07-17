import fs from 'fs';
import path from 'path';
import { scoreJobDescription } from '../src/filters/scorer.js';

interface LabeledJob {
    jobId: string;
    company: string;
    title: string;
    text: string;
    isFresher: boolean;
    reason: string[];
    reviewer: string;
}

const DATASET_PATH = path.join(process.cwd(), 'evaluation', 'dataset.jsonl');
const SNAPSHOTS_DIR = path.join(process.cwd(), 'evaluation', 'snapshots');

if (!fs.existsSync(SNAPSHOTS_DIR)) {
    fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
}

async function runEvaluation() {
    if (!fs.existsSync(DATASET_PATH)) {
        console.error("Dataset not found at", DATASET_PATH);
        return;
    }

    const lines = fs.readFileSync(DATASET_PATH, 'utf8').split('\n').filter(l => l.trim().length > 0);
    const jobs: LabeledJob[] = lines.map(l => JSON.parse(l));

    console.log(`Evaluating ${jobs.length} jobs...`);

    let totalTime = 0;
    let truePositives = 0; // isFresher: true && (HIGH | MEDIUM)
    let falsePositives = 0; // isFresher: false && (HIGH | MEDIUM)
    let trueNegatives = 0; // isFresher: false && REJECT
    let falseNegatives = 0; // isFresher: true && REJECT
    let unknownFresher = 0; // isFresher: true && UNKNOWN
    let unknownNotFresher = 0; // isFresher: false && UNKNOWN

    const failures: any[] = [];
    
    // Confidence calibration: buckets of 10
    const confidenceBuckets = Array(10).fill(0).map(() => ({ total: 0, correct: 0 }));

    for (const job of jobs) {
        const t0 = performance.now();
        const result = scoreJobDescription(job.title, job.text);
        const t1 = performance.now();
        totalTime += (t1 - t0);

        const predictedPositive = result.verdict === 'HIGH' || result.verdict === 'MEDIUM';
        const predictedNegative = result.verdict === 'REJECT';
        const predictedUnknown = false; // result.verdict === 'UNKNOWN';

        const isCorrect = (job.isFresher && predictedPositive) || (!job.isFresher && predictedNegative);
        
        // Calibration
        if (true) {
            const bucketIndex = Math.min(9, Math.floor(result.confidence / 10));
            confidenceBuckets[bucketIndex].total++;
            if (isCorrect) {
                confidenceBuckets[bucketIndex].correct++;
            }
        }

        if (predictedUnknown) {
            if (job.isFresher) unknownFresher++;
            else unknownNotFresher++;
        } else if (job.isFresher) {
            if (predictedPositive) truePositives++;
            else {
                falseNegatives++;
                failures.push({ job: job.jobId, truth: 'FRESHER', predicted: result.verdict, trace: result.decisionTrace });
            }
        } else {
            if (predictedNegative) trueNegatives++;
            else {
                falsePositives++;
                failures.push({ job: job.jobId, truth: 'NOT_FRESHER', predicted: result.verdict, trace: result.decisionTrace });
            }
        }
    }

    const total = jobs.length;
    const avgTime = totalTime / total;

    // Metrics (excluding UNKNOWN for pure Precision/Recall, but we include them in denominator for absolute Recall)
    // Recall = TP / (TP + FN + UnknownFresher)
    const actualFresher = truePositives + falseNegatives + unknownFresher;
    const actualNotFresher = trueNegatives + falsePositives + unknownNotFresher;

    const recall = actualFresher > 0 ? (truePositives / actualFresher) * 100 : 0;
    const precision = (truePositives + falsePositives) > 0 ? (truePositives / (truePositives + falsePositives)) * 100 : 0;
    const f1 = (precision + recall) > 0 ? 2 * (precision * recall) / (precision + recall) : 0;
    
    const unknownRate = ((unknownFresher + unknownNotFresher) / total) * 100;

    const report = {
        timestamp: new Date().toISOString(),
        totalJobs: total,
        avgScoringTimeMs: avgTime.toFixed(2),
        actualFresher,
        actualNotFresher,
        metrics: {
            recall: recall.toFixed(1) + "%",
            precision: precision.toFixed(1) + "%",
            f1: f1.toFixed(1) + "%",
            unknownRate: unknownRate.toFixed(1) + "%"
        },
        confusionMatrix: {
            truePositives,
            falsePositives,
            trueNegatives,
            falseNegatives,
            unknownFresher,
            unknownNotFresher
        },
        calibration: confidenceBuckets.map((b, i) => ({
            range: `${i*10}-${i*10+9}%`,
            accuracy: b.total > 0 ? ((b.correct / b.total) * 100).toFixed(1) + "%" : "N/A",
            samples: b.total
        })),
        failures: failures.slice(0, 10) // store up to 10 failures for review
    };

    console.log(JSON.stringify(report, null, 2));

    const date = new Date().toISOString().split('T')[0];
    fs.writeFileSync(path.join(SNAPSHOTS_DIR, `${date}.json`), JSON.stringify(report, null, 2));
    console.log(`Snapshot saved to snapshots/${date}.json`);
}

runEvaluation().catch(console.error);
