import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ConnectionIdentity } from './identity.js';
import { registerSubmitOpportunity } from './tools/submit-opportunity.js';
import { registerGetListingSchema } from './tools/get-listing-schema.js';
import { registerGetListingTemplate } from './tools/get-listing-template.js';
import { registerCreateListing } from './tools/create-listing.js';
import { registerUpdateListing } from './tools/update-listing.js';
import { registerGetListing } from './tools/get-listing.js';
import { registerWhoami } from './tools/whoami.js';
import { registerGetJobs } from './tools/get-jobs.js';
import { registerGetJob } from './tools/get-job.js';
import { registerListMySubmissions } from './tools/list-my-submissions.js';
import { registerWithdrawSubmission } from './tools/withdraw-submission.js';
import { registerReviewQueue } from './tools/review-queue.js';
import { registerApproveSubmission } from './tools/approve-submission.js';
import { registerRejectSubmission } from './tools/reject-submission.js';
import { withOAuthToolMetadata } from './oauthMetadata.js';

const SERVER_NAME = 'fresherflow';
const SERVER_VERSION = '1.3.0';

/**
 * The instructions a client caches with this connection.
 *
 * They are built per request from the resolved identity, because the contract
 * differs by role and an agent that gets it wrong tells a user their job is
 * live when it is only a draft. The tool list is filtered to match, so these
 * instructions describe tools that are actually registered.
 */
function buildInstructions(identity: ConnectionIdentity | null): string {
  if (!identity) return 'FresherFlow provides public, read-only job discovery without sign-in. Connect a FresherFlow account to submit opportunities or access account and moderator tools.';
  const moderator = identity.role === 'moderator';
  const who = identity.username ? `@${identity.username}` : identity.displayName;

  // What this connection can actually do. Registration below uses the same
  // flags, so the instructions never promise a tool that is not registered —
  // including the case of a staff account whose grants are missing.
  const canPublish = identity.capabilities.submitPublishes;
  const canReview = identity.capabilities.reviewSubmissions;
  const canApprove = identity.capabilities.approveSubmissions;
  const canWriteListings =
    identity.capabilities.createFullListing || identity.capabilities.editFullListing;

  const intro = [
    'FresherFlow lists fresher jobs, internships and walk-in drives in India.',
    '',
    'Every protected call on this connection is made as the FresherFlow account it signed in with. Public job discovery does not require an account.',
  ].join('\n');

  const roleLines: string[] = [];
  if (moderator) {
    roleLines.push(`You are connected as ${who} — a FresherFlow staff account.`);
    roleLines.push('');
    if (!canPublish && !canReview && !canApprove && !canWriteListings) {
      roleLines.push(
        'This account holds a staff role but none of the moderation grants, so no moderation or listing tools are available.',
        'Ask an administrator to add opportunity.review / opportunity.publish in the admin panel. Do not claim moderation abilities.',
      );
    } else {
      roleLines.push('What this connection can do:');
      roleLines.push(
        canPublish
          ? '  - submit_opportunity publishes immediately. The listing is live when the response says published: true; report it as live only then.'
          : '  - submit_opportunity saves the job as a DRAFT. It is not live until a moderator publishes it.',
      );
      if (canWriteListings) {
        roleLines.push('  - create_listing and update_listing are available. create_listing defaults to PUBLISHED.');
      }
      if (canReview || canApprove) {
        roleLines.push(
          canApprove
            ? '  - review_queue, approve_submission and reject_submission are available. Never approve or reject on your own judgement, and never sweep several rows at once unless asked.'
            : '  - review_queue and reject_submission are available; approve_submission is not. Never reject on your own judgement, and never sweep several rows at once unless asked.',
        );
      }
    }
  } else {
    roleLines.push(
      `You are connected as ${who} — a normal FresherFlow account, not a moderator.`,
      '',
      'As a normal account:',
      '  - submit_opportunity saves the job as a DRAFT. It is NOT live. A moderator must publish it.',
      '  - You cannot create, edit or delete listings, and you cannot review submissions; those tools are not available to this connection, so do not promise them.',
      '  - Never tell the user a job is live unless a tool response says published: true.',
    );
  }
  const roleBlock = roleLines.join('\n');

  const reading = [
    'Reading jobs (public):',
    '  get_jobs — search the public live listings by text, city, company or type. Use it when the user asks what is open.',
    '  get_job — retrieve a listing by its exact id or slug for its full public details. Use a result from get_jobs first.',
    '',
    'Call whoami to confirm which FresherFlow account this connection is acting as. The role above is resolved for this connection and already decides which tools are listed.',
  ].join('\n');

  const submitting = [
    'Submitting a job:',
    '  1. Read the posting yourself. Fill in every field you can see — title, company, jobUrl, location, employmentType, category, salary, description, eligibility, skills, passoutYears. A title and URL alone leave a listing a moderator must finish by hand.',
    '  2. Call submit_opportunity.',
    '  3. Read the response. status DRAFT means a moderator still has to publish it; status PUBLISHED means it is live. Repeat that verdict exactly.',
  ].join('\n');

  const own = [
    'Your own submissions:',
    '  list_my_submissions — what this account has submitted, and each row\'s real state.',
    '  withdraw_submission — take back one still awaiting review. Only when asked.',
  ].join('\n');

  const listingWorkflow = [
    'Workflow for a full listing:',
    '  1. Call get_listing_template with the kind of listing (JOB, INTERNSHIP or WALKIN) and fill that payload from the posting. Then call get_listing_schema for the enum vocabularies. Never guess field names — the admin form\'s type / walkInDetails / salaryAmount are not API fields and are dropped without warning.',
    '  2. Call create_listing.',
    '  3. Call get_listing to confirm the fields actually stored. A successful write response only proves the API accepted the request.',
    '',
    'To change an existing listing, call get_listing first: update_listing replaces the whole listing, so anything you leave out is cleared.',
  ].join('\n');

  return [intro, roleBlock, reading, submitting, own, ...(canWriteListings ? [listingWorkflow] : [])].join('\n\n');
}

/**
 * Build a fresh MCP server for one authenticated caller.
 *
 * A new instance is created per HTTP request (see `worker.ts`), which is why
 * the tool list can be role-filtered without any session state: a moderator's
 * connection sees the moderation and listing-editing tools, a normal account's
 * connection does not see them at all.
 *
 * Every tool still enforces its own permission on the API, so a filtered list is
 * a usability decision, not the security boundary. The boundary is RBAC.
 *
 * `resourceMetadataUrl` is the protected-resource document this Worker serves
 * for the resource. It is passed in rather than derived, because this module
 * never knows the Worker's own origin, and it goes into the tool-level re-link
 * challenge ChatGPT needs before it will offer to link at all.
 */
export function createFresherFlowMcpServer(identity: ConnectionIdentity | null, publicSiteUrl: string, publicFeedBaseUrl: string, cdnSignatureSecret?: string, resourceMetadataUrl?: string): McpServer {
  const server = new McpServer(
    {
      name: SERVER_NAME,
      title: 'FresherFlow',
      version: SERVER_VERSION,
      description: 'Add and find fresher jobs, internships and walk-in drives on FresherFlow, a job and walk-in opportunity platform for India. Moderator accounts publish on submit and can edit listings; other accounts submit drafts for review.',
      websiteUrl: publicSiteUrl,
      icons: [
        {
          src: `${publicSiteUrl}/icon-512x512.png`,
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

  // Before any tool is registered: the wrapper installs the `securitySchemes`
  // metadata and the 401-to-challenge conversion on `registerTool` itself, so a
  // tool registered first would carry neither.
  if (resourceMetadataUrl) {
    withOAuthToolMetadata(server, {
      resourceMetadataUrl,
      // `identity === null` only happens on the public endpoint, where the
      // read-only job tools are callable without a link.
      anonymousAllowed: identity === null,
    });
  }

  // Every tool runs as the signed-in caller. The API re-checks each permission,
  // so this filtered list is usability, not the security boundary.
  registerGetJobs(server, publicFeedBaseUrl, cdnSignatureSecret, publicSiteUrl);
  registerGetJob(server, publicFeedBaseUrl, cdnSignatureSecret, publicSiteUrl);
  if (identity) {
    registerWhoami(server);
    registerSubmitOpportunity(server);
    registerListMySubmissions(server);
    registerWithdrawSubmission(server);

    // Register from the capability the API enforced, not from the role label:
    // a staff account whose grants are missing must not be offered a tool that
    // would answer 403.
    if (identity.capabilities.reviewSubmissions) {
      registerReviewQueue(server);
      registerRejectSubmission(server);
    }
    if (identity.capabilities.approveSubmissions) {
      registerApproveSubmission(server);
    }
  }

  // Full listing writes (moderator or admin)
  if (identity && (identity.capabilities.createFullListing || identity.capabilities.editFullListing)) {
    registerGetListingSchema(server);
    registerGetListingTemplate(server);
    registerCreateListing(server);
    registerUpdateListing(server);
    registerGetListing(server);
  }

  return server;
}
