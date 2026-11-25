import type { Metadata } from 'next';

// MDX pages compile as Client Components, so `metadata` cannot be exported
// from page.mdx. The route layout is the Server Component that owns it.
export const metadata: Metadata = {
  title: 'MCP server',
  description:
    'Connect ChatGPT, Claude and other AI clients to FresherFlow with MCP. Endpoints, authentication, tools and limits.',
  alternates: {
    canonical: '/docs/mcp',
  },
};

export default function McpDocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
