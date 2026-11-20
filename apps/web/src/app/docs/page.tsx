import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Guides and reference for the FresherFlow platform, API, MCP server and agent skills.",
};

const docs = [
  {
    title: "Overview",
    href: "/docs/overview",
    description: "What FresherFlow is, how its apps and packages fit together.",
  },
  {
    title: "Architecture",
    href: "/docs/architecture",
    description: "Monorepo layers, the feed pipeline and the boundaries between apps.",
  },
  {
    title: "API reference",
    href: "/docs/api",
    description: "HTTP endpoints, authentication and the shared listing contract.",
  },
  {
    title: "MCP server",
    href: "/docs/mcp",
    description: "Connect Claude, Codex, Cursor and ChatGPT to FresherFlow over OAuth 2.1.",
  },
  {
    title: "Agent skills",
    href: "/docs/skills",
    description: "The workflow playbooks that ship with the FresherFlow plugin.",
  },
];

export default function DocsPage() {
  return (
    <>
      <header className="border-b border-border pb-8">
        <p className="text-meta font-medium text-muted-foreground">Docs</p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          FresherFlow Docs
        </h1>
        <p className="mt-4 max-w-2xl text-pretty text-sm leading-7 text-muted-foreground sm:text-base">
          Setup and reference docs for FresherFlow — the platform, its API, the MCP
          server, and the agent skills that ship with the plugin.
        </p>
      </header>

      <nav className="mt-2" aria-label="Documentation sections">
        {docs.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group block border-b border-border py-6 transition-colors"
          >
            <h2 className="text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
              {item.title}
            </h2>
            <p className="mt-1.5 text-pretty text-sm leading-6 text-muted-foreground">
              {item.description}
            </p>
          </Link>
        ))}
      </nav>
    </>
  );
}
