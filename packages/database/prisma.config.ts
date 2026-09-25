import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: './prisma/schema.prisma',
  // Prisma 7 reads the connection URL from here rather than the schema's
  // datasource block. Without it, CLI commands that need to talk to a real
  // database - notably `migrate diff`, which also needs a shadow database to
  // replay the migrations folder - fail with
  // "The following required arguments were not provided: --datasource"
  // and silently produce no output.
  datasource: {
    url: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? '',
    // `migrate diff --from-migrations` replays every migration into a scratch
    // database before diffing. It must be a throwaway DB, never a real one.
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
