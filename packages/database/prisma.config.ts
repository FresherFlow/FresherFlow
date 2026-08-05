import { defineConfig, env } from 'prisma/config';
import 'dotenv/config';

/**
 * Prisma 7 config — connection URLs live here instead of schema.prisma.
 *
 * For `prisma generate`: no connection needed.
 * For `prisma migrate` / `prisma db push`: DIRECT_DATABASE_URL is used for the
 * direct (non-pooled) connection; DATABASE_URL is the pooled/Accelerate URL.
 */
export default defineConfig({
  earlyAccess: true,
  schema: './prisma/schema.prisma',
  datasource: {
    // The CLI requires a direct connection for migrations
    url: env('DIRECT_DATABASE_URL') || env('DATABASE_URL'),
  },
});
