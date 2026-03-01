/**
 * One-time migration: copy IngestionSource rows from Neon → Supabase staging DB.
 * Safe to re-run — skips rows that already exist (matched by endpoint).
 *
 * Run with:
 *   npx ts-node scripts/migrate-sources-to-staging.ts
 */

import 'dotenv/config';
import prisma from '../src/lib/prisma';
import stagingPrisma from '../src/lib/stagingPrisma';

async function main() {
    const sources = await prisma.ingestionSource.findMany();
    console.log(`Found ${sources.length} sources in Neon.`);

    let inserted = 0;
    let skipped = 0;

    for (const source of sources) {
        const exists = await stagingPrisma.ingestionSource.findFirst({
            where: { endpoint: source.endpoint },
        });

        if (exists) {
            console.log(`  SKIP  ${source.name} (already in Supabase)`);
            skipped++;
            continue;
        }

        await stagingPrisma.ingestionSource.create({
            data: {
                id: source.id,
                name: source.name,
                sourceType: source.sourceType,
                endpoint: source.endpoint,
                enabled: source.enabled,
                runFrequencyMinutes: source.runFrequencyMinutes,
                defaultType: source.defaultType,
                createdByUserId: source.createdByUserId,
                lastRunAt: source.lastRunAt,
                lastSuccessAt: source.lastSuccessAt,
                createdAt: source.createdAt,
                updatedAt: source.updatedAt,
            },
        });

        console.log(`  OK    ${source.name}`);
        inserted++;
    }

    console.log(`\nDone. Inserted: ${inserted}, Skipped: ${skipped}`);
    await prisma.$disconnect();
    await stagingPrisma.$disconnect();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
