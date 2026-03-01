import stagingPrisma from '../../src/lib/stagingPrisma';

async function main() {
    const recentRejected = await stagingPrisma.rawOpportunity.findMany({
        where: { status: 'REJECTED' },
        select: {
            id: true,
            title: true,
            company: true,
            fresherScore: true,
            reasonFlags: true,
            createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
    });

    const groupedByReason = await stagingPrisma.rawOpportunity.groupBy({
        by: ['reasonFlags'],
        where: { status: 'REJECTED' },
        _count: { _all: true },
        orderBy: { _count: { _all: 'desc' } },
        take: 20,
    });

    console.log('Recent rejected items (top 50):');
    console.log(JSON.stringify(recentRejected, null, 2));
    console.log('\nTop rejection reason buckets:');
    console.log(JSON.stringify(groupedByReason, null, 2));
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await stagingPrisma.$disconnect();
    });
