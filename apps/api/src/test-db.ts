import './bootstrap';
import prisma from './infrastructure/database/prisma';
import { logger } from '@fresherflow/utils';

async function main() {
  try {
    await prisma.$connect();
    logger.info('Successfully connected to the database');
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    // One line, first meaningful sentence only. The full error carries a
    // multi-line code frame plus a stack that repeats it.
    const headline = message.split('\n').map((l) => l.trim()).find(Boolean) || 'Unknown error';
    logger.error(`Connection error: ${headline}`);
    logger.error('  -> Check DATABASE_URL / DIRECT_DATABASE_URL and database availability');
  } finally {
    await prisma.$disconnect();
  }
}

main();
