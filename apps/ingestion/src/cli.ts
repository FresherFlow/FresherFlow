#!/usr/bin/env node
import 'dotenv/config';
import { Command } from 'commander';
import { runTarget } from './lib/runner.js';
import { PLUGIN_REGISTRY } from '@fresherflow/plugins';

const program = new Command();

program
  .name('ingest-cli')
  .description('CLI to run FresherFlow scrapers locally')
  .version('1.0.0');

program
  .command('run')
  .description('Run a specific scraper synchronously')
  .requiredOption('--ats <ats>', 'ATS provider (e.g., greenhouse, lever)')
  .requiredOption('--company <company>', 'Company name')
  .requiredOption('--slug <slug>', 'Company slug used in URL')
  .option('--no-cache', 'Bypass Redis cache')
  .option('--dry-run', 'Skip saving to database')
  .option('--filter', 'Apply filtering rules', true)
  .action(async (options: Record<string, any>) => {
    console.log(`Running scraper for ${options.company} on ${options.ats}...`);
    
    if (!PLUGIN_REGISTRY[options.ats]) {
      console.error(`Error: Unknown ATS provider '${options.ats}'`);
      process.exit(1);
    }
    
    const startTime = Date.now();
    try {
      const result = await runTarget({
        ats: options.ats,
        company: options.company,
        slug: options.slug,
        noCache: !options.cache,
        dryRun: options.dryRun,
        filter: options.filter
      });
      
      console.log('\n--- Result ---');
      console.log(JSON.stringify(result, null, 2));
      console.log(`\nCompleted in ${Date.now() - startTime}ms`);
      process.exit(0);
    } catch (error) {
      console.error('Failed to run scraper:', error);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List available plugins')
  .action(() => {
    console.log('Available Plugins:');
    Object.keys(PLUGIN_REGISTRY).forEach(plugin => console.log(` - ${plugin}`));
    process.exit(0);
  });

program.parse(process.argv);
