import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ConnectionIdentity } from './identity.js';
import { registerSubmitOpportunity } from './tools/submit-opportunity.js';
import { registerGetListingSchema } from './tools/get-listing-schema.js';
import { registerCreateListing } from './tools/create-listing.js';
import { registerUpdateListing } from './tools/update-listing.js';
import { registerGetListing } from './tools/get-listing.js';
import { registerWhoami } from './tools/whoami.js';
import { registerGetJobs } from './tools/get-jobs.js';
import { registerListMySubmissions } from './tools/list-my-submissions.js';
import { registerWithdrawSubmission } from './tools/withdraw-submission.js';
import { registerReviewQueue } from './tools/review-queue.js';
import { registerApproveSubmission } from './tools/approve-submission.js';
import { registerRejectSubmission } from './tools/reject-submission.js';

const SERVER_NAME = 'fresherflow';
const SERVER_VERSION = '1.2.0';

/**
 * The instructions a client caches with this connection.
 *
 * They are built per request from the resolved identity, because the contract
 * differs by role and an agent that gets it wrong tells a user their job is
 * live when it is only a draft. The tool list is filtered to match, so these
 * instructions describe tools that are actually registered.
 */
function buildInstructions(identity: ConnectionIdentity): string {
  const moderator = identity.role === 'moderator';
  const who = identity.username ? `@${identity.username}` : identity.displayName;

  const intro = [
    'FresherFlow lists fresher jobs, internships and walk-in drives in India.',
    '',
    'Every call on this connection is made as the FresherFlow account it signed in with. There is',
    'no anonymous or shared-service path: if a tool refuses, the account is missing the permission,',
    'and reconnecting will not change that.',
  ].join('\n');

  const roleBlock = moderator
    ? [
        `You are connected as ${who} — a FresherFlow moderator.`,
        '',
        'As a moderator:',
        '  - submit_opportunity publishes immediately. The listing is live when the response says',
        '    published: true; report it as live only then.',
        '  - create_listing and update_listing are available. create_listing defaults to PUBLISHED.',
        '  - review_queue, approve_submission and reject_submission are available. Never approve or',
        '    reject on your own judgement, and never sweep several rows at once unless asked.',
      ].join('\n')
    : [
        `You are connected as ${who} — a normal FresherFlow account, not a moderator.`,
        '',
        'As a normal account:',
        '  - submit_opportunity saves the job as a DRAFT. It is NOT live. A moderator must publish it.',
        '  - You cannot create, edit or delete listings, and you cannot review submissions; those',
        '    tools are not available to this connection, so do not promise them.',
        '  - Never tell the user a job is live unless a tool response says published: true.',
      ].join('\n');

  const reading = [
    'Reading jobs:',
    '  get_jobs — search the live listings by text, city, company or type. Use it before',
    '  submitting (to see whether a job is already listed) and whenever the user asks what is',
    '  open. It returns canonical fresherflow.in URLs.',
    '',
    'Call whoami first whenever you need to confirm the account, its role, or what it may do.',
  ].join('\n');

  const submitting = [
    'Submitting a job:',
    '  1. Read the posting yourself. Fill in every field you can see — title, company, jobUrl,',
    '     location, employmentType, category, salary, description, eligibility, skills,',
    '     passoutYears. A title and URL alone leave a listing a moderator must finish by hand.',
    '  2. Call submit_opportunity.',
    '  3. Read the response. status DRAFT means a moderator still has to publish it; status',
    '     PUBLISHED means it is live. Repeat that verdict exactly.',
  ].join('\n');

  const own = [
    'Your own submissions:',
    '  list_my_submissions — what this account has submitted, and each row\'s real state.',
    '  withdraw_submission — take back one still awaiting review. Only when asked.',
  ].join('\n');

  const listingWorkflow = [
    'Workflow for a full listing:',
    '  1. Call get_listing_schema and build the payload from the contract it returns.',
    '     Never guess field names — unknown keys are dropped without warning.',
    '  2. Call create_listing.',
    '  3. Call get_listing to confirm the fields actually stored. A successful write response',
    '     only proves the API accepted the request.',
    '',
    'To change an existing listing, call get_listing first: update_listing replaces the whole',
    'listing, so anything you leave out is cleared.',
  ].join('\n');

  return [intro, roleBlock, reading, submitting, own, ...(moderator ? [listingWorkflow] : [])]
    .join('\n\n');
}

/**
 * Build a fresh MCP server for one authenticated caller.
 *
 * A new instance is created per HTTP request (see `transport.ts`), which is why
 * the tool list can be role-filtered without any session state: a moderator's
 * connection sees the moderation and listing-editing tools, a normal account's
 * connection does not see them at all.
 *
 * Every tool still enforces its own permission on the API, so a filtered list is
 * a usability decision, not the security boundary. The boundary is RBAC.
 */
export function createFresherFlowMcpServer(identity: ConnectionIdentity): McpServer {
  const server = new McpServer(
    {
      name: SERVER_NAME,
      title: 'FresherFlow',
      version: SERVER_VERSION,
      description:
        'Add and find fresher jobs, internships and walk-in drives on FresherFlow, a job and '
        + 'walk-in opportunity platform for India. Moderator accounts publish on submit and can '
        + 'edit listings; other accounts submit drafts for review.',
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
      instructions: buildInstructions(identity),
    },
  );

  // Available to every authenticated account.
  registerWhoami(server);
  registerGetJobs(server);
  registerSubmitOpportunity(server);
  registerListMySubmissions(server);
  registerWithdrawSubmission(server);

  // Moderator surface: the submission queue and the decisions on it.
  if (identity.capabilities.reviewSubmissions && identity.capabilities.approveSubmissions) {
    registerReviewQueue(server);
    registerApproveSubmission(server);
    registerRejectSubmission(server);
  }

  // Full listing writes. Moderators hold `opportunity.edit`; a super admin holds
  // `opportunity.create` too. A normal account holds neither.
  if (identity.capabilities.createFullListing || identity.capabilities.editFullListing) {
    registerGetListingSchema(server);
    registerCreateListing(server);
    registerUpdateListing(server);
    registerGetListing(server);
  }

  return server;
}
