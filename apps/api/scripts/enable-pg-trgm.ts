import prisma from '../src/infrastructure/database/prisma';

async function main() {
    console.log('Enabling pg_trgm extension on database...');
    await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS pg_trgm;');
    console.log('Success: pg_trgm extension enabled.');
}

main()
    .catch((err) => {
        console.error('Failed to enable pg_trgm:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        process.exit(0);
    });
