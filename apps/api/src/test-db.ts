import { PrismaClient } from '@prisma/client';
import { logger } from '@fresherflow/logger';

const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$connect();
    logger.info('Successfully connected to the database');
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    logger.error('Connection error:', { message });
    logger.error('Full error:', { error: e });
  } finally {
    await prisma.$disconnect();
  }
}

main();
