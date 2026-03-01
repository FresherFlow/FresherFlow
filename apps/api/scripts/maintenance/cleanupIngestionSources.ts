import stagingPrisma from '../../src/lib/stagingPrisma';

type Mode = 'invalid' | 'failed' | 'empty';

const APPLY = process.argv.includes('--apply');
const modeArg = process.argv.find((arg) => arg.startsWith('--mode='))?.split('=')[1] as Mode | undefined;
const mode: Mode = modeArg ?? 'invalid';

const allowlist = new Set(
    (process.argv.find((arg) => arg.startsWith('--allowlist='))?.split('=')[1] ?? '')
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
);

function isInvalidNameOrEndpoint(name: string, endpoint: string) {
    return name.includes('"') || name.includes(']') || name.includes(';') || endpoint.includes('"');
}

async function main() {
    const sources = await stagingPrisma.ingestionSource.findMany({
        include: {
            runs: {
                select: { status: true, fetchedCount: true, draftCreatedCount: true, errorCount: true },
            },
        },
    });

    const targetIds: string[] = [];

    for (const source of sources) {
        if (allowlist.has(source.name.toLowerCase())) continue;

        const hasFailures = source.runs.some((run) => run.status === 'FAILED' || run.errorCount > 0);
        const hasData = source.runs.some((run) => run.fetchedCount > 0 || run.draftCreatedCount > 0);

        const shouldDelete =
            (mode === 'invalid' && isInvalidNameOrEndpoint(source.name, source.endpoint)) ||
            (mode === 'failed' && hasFailures) ||
            (mode === 'empty' && !hasData);

        if (shouldDelete) targetIds.push(source.id);
    }

    if (!APPLY) {
        console.log(`Dry run (${mode}): ${targetIds.length} ingestion sources matched.`);
        console.log('Run with --apply to delete matches.');
        return;
    }

    if (targetIds.length === 0) {
        console.log(`No sources matched mode=${mode}.`);
        return;
    }

    const result = await stagingPrisma.ingestionSource.deleteMany({
        where: { id: { in: targetIds } },
    });

    console.log(`Deleted ${result.count} sources (mode=${mode}).`);
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await stagingPrisma.$disconnect();
    });
