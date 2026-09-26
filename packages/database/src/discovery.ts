/**
 * @deprecated Do not create a second PrismaClient pool. The discovery pipeline
 * used to own its own client; it now re-exports the shared singleton from
 * `./index.js` so every server surface shares one pool, one adapter, and one
 * env/config path. Import `prisma` from `@fresherflow/database` (or
 * `apps/api/src/infrastructure/database/prisma`) instead.
 */
export { prisma as discoveryClient, default as discoveryClientDefault } from './index.js';
