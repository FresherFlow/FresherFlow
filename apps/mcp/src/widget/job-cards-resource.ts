import type { McpServer } from '@modelcontextprotocol/server';
import jobCardsHtml from './job-cards-html.js';

export const JOB_CARDS_URI = 'ui://fresherflow/job-cards-v2.html';
export const LEGACY_JOB_CARDS_URI = 'ui://fresherflow/job-cards-v1.html';
export const JOB_CARDS_MIME_TYPE = 'text/html;profile=mcp-app';

/**
 * One self-contained HTML App for four views: compact job cards, full job
 * detail, company profile and submission result. No network access is needed;
 * external image origins are the FresherFlow CDN and Clearbit (company logos).
 */
const meta = {
  ui: {
    prefersBorder: true,
    csp: { connectDomains: [], resourceDomains: ['https://cdn.fresherflow.in', 'https://logo.clearbit.com'] },
  },
  'openai/ui': { availableDisplayModes: ['inline'] },
  'openai/widgetDescription':
    'FresherFlow job cards, job details, company profile and submission status, rendered from tool data only.',
} as const;

const LEGACY_HTML = '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>FresherFlow</title></head><body><p>Reconnect the FresherFlow connector to use this widget.</p></body></html>';

export function registerJobCardsResource(server: McpServer): void {
  server.registerResource(
    'FresherFlow UI',
    JOB_CARDS_URI,
    { title: 'FresherFlow UI', mimeType: JOB_CARDS_MIME_TYPE, _meta: meta },
    async () => ({
      contents: [
        {
          uri: JOB_CARDS_URI,
          mimeType: JOB_CARDS_MIME_TYPE,
          text: jobCardsHtml,
          _meta: meta,
        },
      ],
    }),
  );

  // Clients holding a cached v1 reference must be told to reconnect, not fed a
  // document that silently ignores the new views.
  server.registerResource(
    'FresherFlow UI (legacy)',
    LEGACY_JOB_CARDS_URI,
    { title: 'FresherFlow UI (legacy)', mimeType: JOB_CARDS_MIME_TYPE },
    async () => ({
      contents: [
        {
          uri: LEGACY_JOB_CARDS_URI,
          mimeType: JOB_CARDS_MIME_TYPE,
          text: LEGACY_HTML,
        },
      ],
    }),
  );
}
