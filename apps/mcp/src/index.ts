import 'dotenv/config';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express, { type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { SearchJobsInput, GetJobInput, GetJobSignalsInput, GetJobCommentsInput, SubmitOpportunityInput } from './schemas.js';
import { searchJobs, getJob, getJobSignals, getJobComments, submitOpportunity } from './apiClient.js';
import { logger } from './logger.js';

// FresherFlow MCP Server - ChatGPT-facing, read-only.
// ChatGPT -> MCP (this server) -> existing FresherFlow API -> PostgreSQL
// Only two tools: search_jobs and get_job. No business logic lives here.

const SERVER_NAME = 'fresherflow';
const SERVER_VERSION = '1.0.0';

function buildMcpServer(): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions:
        'FresherFlow surfaces verified fresher jobs, internships and walk-in drives for India. ' +
        'Use search_jobs to find opportunities, then get_job with a returned job id for full details. ' +
        'To contribute, use submit_opportunity — submissions are reviewed before they appear publicly. ' +
        'All results come from the FresherFlow database; do not invent listings.',
    }
  );

  registerSearchJobs(server);
  registerGetJob(server);
  registerGetJobSignals(server);
  registerGetJobComments(server);
  registerSubmitOpportunity(server);
  return server;
}

// ---- Tool: search_jobs ----

const SearchJobsOutputShape = {
  totalHits: z.number(),
  hasMore: z.boolean(),
  jobs: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      company: z.string(),
      location: z.string(),
      salary: z.string(),
      employmentType: z.string(),
      experience: z.string(),
      postedAt: z.string(),
      jobUrl: z.string(),
      applyUrl: z.string(),
    })
  ),
};

function registerSearchJobs(server: McpServer) {
  server.registerTool(
  'search_jobs',
  {
    title: 'Search jobs',
    description:
      'Search verified fresher jobs, internships and walk-in drives on FresherFlow. ' +
      'Use when the user wants to find opportunities by role, city, job type or salary.',
    inputSchema: {
      query: SearchJobsInput.shape.query,
      location: SearchJobsInput.shape.location,
      jobType: SearchJobsInput.shape.jobType,
      minSalary: SearchJobsInput.shape.minSalary,
      maxSalary: SearchJobsInput.shape.maxSalary,
      limit: SearchJobsInput.shape.limit,
    },
    outputSchema: SearchJobsOutputShape,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  },
  async (input: SearchJobsInput) => {
    const result = await searchJobs({
      query: input.query,
      location: input.location,
      jobType: input.jobType,
      minSalary: input.minSalary,
      maxSalary: input.maxSalary,
      limit: input.limit ?? 10,
    });
    return {
      structuredContent: result,
      content: [
        {
          type: 'text' as const,
          text:
            result.jobs.length === 0
              ? 'No matching opportunities found.'
              : `Found ${result.totalHits} matching opportunities (showing ${result.jobs.length}).`,
        },
      ],
    };
  }
  );
}

// ---- Tool: get_job ----

const GetJobOutputShape = {
  job: z.object({
    id: z.string(),
    title: z.string(),
    company: z.string(),
    description: z.string(),
    requirements: z.array(z.string()),
    eligibility: z.string(),
    salary: z.string(),
    location: z.string(),
    employmentType: z.string(),
    experience: z.string(),
    source: z.string(),
    postedAt: z.string(),
    applyUrl: z.string(),
    jobUrl: z.string(),
    verification: z.string(),
  }),
};

function registerGetJob(server: McpServer) {
  server.registerTool(
  'get_job',
  {
    title: 'Get job details',
    description:
      'Get full details for one job: description, requirements, eligibility, salary, verification status and application link. ' +
      'Call this after search_jobs when the user asks about a specific job.',
    inputSchema: {
      jobId: GetJobInput.shape.jobId,
    },
    outputSchema: GetJobOutputShape,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  },
  async (input: GetJobInput) => {
    const { jobId } = GetJobInput.parse(input);
    const result = await getJob(jobId);
    return {
      structuredContent: result,
      content: [
        {
          type: 'text' as const,
          text: `${result.job.title} at ${result.job.company} - ${result.job.salary}. ${result.job.jobUrl}`,
        },
      ],
    };
  }
  );
}

// ---- Tool: get_job_signals ----

const JobSignalsOutputShape = {
  summary: z.object({
    applied: z.number(),
    interviewed: z.number(),
    offered: z.number(),
    helpful: z.number(),
    incorrect: z.number(),
  }),
  totalEngagement: z.number(),
};

function registerGetJobSignals(server: McpServer) {
  server.registerTool(
  'get_job_signals',
  {
    title: 'Get job community signals',
    description:
      'Get community engagement signals for a job: how many people applied, interviewed, received offers, found it helpful, or flagged it as incorrect. ' +
      'Useful for understanding how popular or reliable a listing is.',
    inputSchema: {
      jobId: GetJobSignalsInput.shape.jobId,
    },
    outputSchema: JobSignalsOutputShape,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  },
  async (input: GetJobSignalsInput) => {
    const { jobId } = GetJobSignalsInput.parse(input);
    const result = await getJobSignals(jobId);
    return {
      structuredContent: result,
      content: [
        {
          type: 'text' as const,
          text: `Total engagement: ${result.totalEngagement} signals. ` +
            `Applied: ${result.summary.applied}, Interviewed: ${result.summary.interviewed}, ` +
            `Offered: ${result.summary.offered}, Helpful: ${result.summary.helpful}, ` +
            `Flagged incorrect: ${result.summary.incorrect}.`,
        },
      ],
    };
  }
  );
}

// ---- Tool: get_job_comments ----

const JobCommentsOutputShape = {
  jobId: z.string(),
  totalComments: z.number(),
  comments: z.array(z.object({
    id: z.string(),
    text: z.string(),
    type: z.string(),
    upvotes: z.number(),
    downvotes: z.number(),
    author: z.string(),
    postedAt: z.string(),
    replies: z.number(),
  })),
};

function registerGetJobComments(server: McpServer) {
  server.registerTool(
  'get_job_comments',
  {
    title: 'Get job comments',
    description:
      'Get community comments and discussions on a job listing. ' +
      'Useful for understanding candidate experiences, questions, and warnings about a specific opportunity.',
    inputSchema: {
      jobId: GetJobCommentsInput.shape.jobId,
      limit: GetJobCommentsInput.shape.limit,
    },
    outputSchema: JobCommentsOutputShape,
    annotations: { readOnlyHint: true, openWorldHint: false, destructiveHint: false },
  },
  async (input: GetJobCommentsInput) => {
    const { jobId, limit } = GetJobCommentsInput.parse(input);
    const result = await getJobComments(jobId, limit);
    return {
      structuredContent: result,
      content: [
        {
          type: 'text' as const,
          text: result.comments.length === 0
            ? 'No comments yet on this listing.'
            : `${result.totalComments} comments on this listing. Top topics: ${result.comments.slice(0, 3).map((c) => c.text.slice(0, 60)).join(' | ')}.`,
        },
      ],
    };
  }
  );
}

// ---- Tool: submit_opportunity ----
//
// Anonymous WRITE tool (plan 23 §7-9). Distinct from the read tools:
// - readOnlyHint: false (it changes FresherFlow state)
// - destructiveHint: false (it is not irreversible — submissions sit in
//   PENDING_REVIEW and are never published without moderator approval)
// - openWorldHint: false (it writes to our own bounded database; the server
//   never fetches the supplied URL)
//
// The tool description is explicit that submission ≠ publication so an AI
// agent can never falsely tell a user their job is live.

const SubmitOpportunityOutputShape = {
    submissionId: z.string(),
    slug: z.string().nullable(),
    status: z.enum(['PENDING_REVIEW', 'PUBLISHED']),
    published: z.boolean(),
    message: z.string(),
};

function registerSubmitOpportunity(server: McpServer) {
    server.registerTool(
        'submit_opportunity',
        {
            title: 'Submit an opportunity',
            description:
                'Submit a fresher job or internship to FresherFlow for review. ' +
                'Use when a user shares a job link they want added to the platform. ' +
                'IMPORTANT: this only submits the opportunity for review — it is NOT published ' +
                'until a moderator approves it. Do not tell the user the job is live. ' +
                'The jobUrl is stored as data only; FresherFlow does not fetch it.',
            inputSchema: {
                title: SubmitOpportunityInput.shape.title,
                companyName: SubmitOpportunityInput.shape.companyName,
                jobUrl: SubmitOpportunityInput.shape.jobUrl,
                location: SubmitOpportunityInput.shape.location,
                employmentType: SubmitOpportunityInput.shape.employmentType,
                salary: SubmitOpportunityInput.shape.salary,
                description: SubmitOpportunityInput.shape.description,
                eligibility: SubmitOpportunityInput.shape.eligibility,
                sourceUrl: SubmitOpportunityInput.shape.sourceUrl,
                contactEmail: SubmitOpportunityInput.shape.contactEmail,
            },
            outputSchema: SubmitOpportunityOutputShape,
            annotations: { readOnlyHint: false, openWorldHint: false, destructiveHint: false },
        },
        async (input: SubmitOpportunityInput) => {
            const result = await submitOpportunity(input);
            return {
                structuredContent: result,
                content: [
                    {
                        type: 'text' as const,
                        text: result.published
                            ? `Your opportunity "${result.submissionId}" is now live on FresherFlow.`
                            : `Your opportunity was submitted to FresherFlow for review (submission ${result.submissionId}). It has not been published yet.`,
                    },
                ],
            };
        }
    );
}

// ---- HTTP transport ----

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '300kb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'fresherflow-mcp' });
});

// OpenAI domain-verification challenge for plugin submission.
// Returns ONLY the exact token as plain text when OPENAI_APPS_CHALLENGE_TOKEN
// is set; 404 otherwise so nothing is leaked before a challenge is issued.
app.get('/.well-known/openai-apps-challenge', (_req, res) => {
  const token = (process.env.OPENAI_APPS_CHALLENGE_TOKEN ?? '').trim();
  if (!token) {
    res.status(404).type('text/plain').send('Not found');
    return;
  }
  res.status(200).type('text/plain').send(token);
});

// Rate limiting protects the upstream FresherFlow API.
const mcpLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Rate limit exceeded, slow down.' },
    id: null,
  },
});

app.use('/mcp', mcpLimiter);

// Per-request stateless transport: no sticky sessions needed.
const mcpHttpHandler = async (req: Request, res: Response) => {
  try {
    // Stateless mode: a fresh server + transport per request so concurrent
    // calls never share transport state.
    const server = buildMcpServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    res.on('close', () => {
      transport.close().catch(() => undefined);
      server.close().catch(() => undefined);
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    logger.error('MCP request failed', { error });
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null,
      });
    }
  }
};

app.post('/mcp', mcpHttpHandler);
// Streamable HTTP also uses GET (SSE stream) and DELETE (session teardown).
app.get('/mcp', mcpHttpHandler);
app.delete('/mcp', mcpHttpHandler);

const PORT = Number(process.env.PORT) || 3001;

app.listen(PORT, () => {
  logger.info(`FresherFlow MCP server listening on :${PORT} (endpoint: /mcp)`);
});
