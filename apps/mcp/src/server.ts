import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerSubmitOpportunity } from './tools/submit-opportunity.js';

const SERVER_NAME = 'fresherflow';
const SERVER_VERSION = '1.0.0';

/**
 * Build a fresh MCP server with every tool registered.
 *
 * A new instance is created per HTTP request (see `transport.ts`), so no state
 * is shared between concurrent callers. Each tool owns its registration so its
 * input/output schemas stay concrete literals and the SDK can infer their
 * types; a generic registry erases them.
 */
export function createFresherFlowMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: SERVER_NAME,
      title: 'FresherFlow',
      version: SERVER_VERSION,
      description:
        'Submit fresher jobs and internships to FresherFlow for moderator review. ' +
        'FresherFlow is a job and walk-in opportunity platform for India.',
      websiteUrl: 'https://fresherflow.in',
      icons: [
        {
          src: 'https://fresherflow.in/icon-512x512.png',
          mimeType: 'image/png',
          sizes: ['512x512'],
        },
      ],
    },
    {
      // No capabilities override: verified against SDK 1.25.2 that
      // `registerTool` advertises `tools.listChanged: true` regardless of what
      // is passed here, so passing `false` would be a lie in the handshake.
      instructions:
        'FresherFlow accepts fresher job and internship submissions for review in India. ' +
        'Use submit_opportunity when the user shares a job posting they want added. ' +
        'A new submission is NOT published — it is staged for moderator review. ' +
        'Never tell the user a submission is live unless the tool response says published: true.',
    },
  );

  registerSubmitOpportunity(server);

  return server;
}
