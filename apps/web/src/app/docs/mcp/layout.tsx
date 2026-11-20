import type { Metadata } from "next";

// MDX pages compile as client components here, so `metadata` cannot be
// exported from page.mdx. Keep it in this server component instead.
export const metadata: Metadata = {
  title: "MCP Server — FresherFlow Docs",
  description:
    "Connect ChatGPT, Claude, Cursor or Codex to FresherFlow over MCP. OAuth 2.1 setup, tools, skills and rate limits.",
};

export default function McpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
