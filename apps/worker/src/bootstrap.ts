/**
 * Explicit processor bootstrap.
 * Import this before creating any Workers to ensure all processor
 * modules are registered and guard against bundler tree-shaking.
 */
export { processEmailJob } from '@fresherflow/queue';
export { processCronJob } from '@fresherflow/queue';
export { processPushJob } from '@fresherflow/queue';
export { processTelegramJob } from '@fresherflow/queue';
export { processIngestionJob } from '@fresherflow/queue';
