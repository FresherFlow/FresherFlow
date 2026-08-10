import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio";
import { z } from "zod";
import { PLUGIN_REGISTRY } from "@fresherflow/plugins";
import { runTarget } from "./lib/runner.js";

const server = new McpServer({
  name: "Ingestion Server",
  version: "1.0.0"
});

server.tool(
  "list_plugins",
  "List available ATS plugins",
  {},
  async () => {
    const plugins = Object.keys(PLUGIN_REGISTRY);
    return {
      content: [{ type: "text", text: `Available plugins:\n${plugins.join('\n')}` }]
    };
  }
);

server.tool(
  "run_scraper",
  "Run a specific scraper synchronously",
  {
    ats: z.string().describe("ATS provider (e.g., greenhouse, lever)"),
    company: z.string().describe("Company name"),
    slug: z.string().describe("Company slug used in URL"),
    dryRun: z.boolean().optional().default(true).describe("If true, doesn't save to DB"),
    noCache: z.boolean().optional().default(true).describe("If true, bypasses cache"),
  },
  async ({ ats, company, slug, dryRun, noCache }: { ats: string; company: string; slug: string; dryRun?: boolean; noCache?: boolean }) => {
    try {
      if (!PLUGIN_REGISTRY[ats]) {
        return {
          content: [{ type: "text", text: `Error: Unknown ATS provider '${ats}'` }],
          isError: true
        };
      }
      
      const result = await runTarget({
        ats,
        company,
        slug,
        dryRun,
        noCache,
        filter: true
      });
      
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: `Error running scraper: ${(error as Error).message}` }],
        isError: true
      };
    }
  }
);

server.tool(
  "search_jobs",
  "Search jobs from a company (runs scraper synchronously)",
  {
    ats: z.string(),
    slug: z.string(),
    company: z.string()
  },
  async ({ ats, slug, company }: { ats: string; slug: string; company: string }) => {
    try {
       const result = await runTarget({ ats, company, slug, dryRun: true, filter: true, noCache: false });
       return {
         content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
       };
    } catch (e) {
       return {
         content: [{ type: "text", text: `Error: ${(e as Error).message}` }],
         isError: true
       };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP Server running on stdio');
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
