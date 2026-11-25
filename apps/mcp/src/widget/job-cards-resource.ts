import type { McpServer } from '@modelcontextprotocol/server';
import jobCardsHtml from './job-cards-html.js';

export const JOB_CARDS_URI = 'ui://fresherflow/job-cards-v1.html';
export const JOB_CARDS_MIME_TYPE = 'text/html;profile=mcp-app';

/**
 * Static metadata for the app resource. No network access is needed: the HTML
 * is self-contained, and links are opened through the host, not fetched here.
 */
const meta = {
  ui: {
    prefersBorder: true,
    csp: { connectDomains: [], resourceDomains: [] },
  },
  'openai/ui': { availableDisplayModes: ['inline'] },
  'openai/widgetDescription':
    'A visual list of live FresherFlow jobs with company, location, deadlines and apply links. Only shows data passed in by show_job_cards.',
} as const;

export function registerJobCardsResource(server: McpServer): void {
  server.registerResource(
    'FresherFlow job cards',
    JOB_CARDS_URI,
    { title: 'FresherFlow job cards', mimeType: JOB_CARDS_MIME_TYPE, _meta: meta },
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
}
