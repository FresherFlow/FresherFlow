import stagingPrisma from '../../src/lib/stagingPrisma';
import { IngestionDedupe } from '@fresherflow/domain';

const APPLY = process.argv.includes('--apply');

async function main() {
    const allRaw = await stagingPrisma.rawOpportunity.findMany({
        where: { sourceExternalId: { not: null } },
        select: { id: true, sourceId: true, sourceExternalId: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
    });

    const seen = new Set<string>();
    const duplicateIds: string[] = [];

    for (const item of allRaw) {
        if (!item.sourceExternalId) continue;
        const key = IngestionDedupe.generateSourceHash(item.sourceId, item.sourceExternalId);
        if (seen.has(key)) {
            duplicateIds.push(item.id);
            continue;
        }
        seen.add(key);
    }

    if (!APPLY) {
        console.log(`Dry run: ${duplicateIds.length} duplicate raw opportunities found.`);
        console.log('Run with --apply to delete duplicates.');
        return;
    }

    if (duplicateIds.length === 0) {
        console.log('No duplicates found.');
        return;
    }

    const result = await stagingPrisma.rawOpportunity.deleteMany({
        where: { id: { in: duplicateIds } },
    });

    console.log(`Deleted ${result.count} duplicate raw opportunities.`);
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await stagingPrisma.$disconnect();
    });
