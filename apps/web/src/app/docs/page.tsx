import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation — FresherFlow",
  description:
    "Documentation for FresherFlow: architecture, API, MCP, and guides",
};

export default function DocsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
        Documentation
      </h1>

      <nav className="mt-8 space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Sections
        </h2>

        <ul className="space-y-2">
          <li>
            <Link
              href="/docs/overview"
              className="underline underline-offset-4 hover:text-primary transition-colors"
            >
              Overview
            </Link>
          </li>
          <li>
            <Link
              href="/docs/architecture"
              className="underline underline-offset-4 hover:text-primary transition-colors"
            >
              Architecture
            </Link>
          </li>
          <li>
            <Link
              href="/docs/api"
              className="underline underline-offset-4 hover:text-primary transition-colors"
            >
              API Reference
            </Link>
          </li>
          <li>
            <Link
              href="/docs/mcp"
              className="underline underline-offset-4 hover:text-primary transition-colors"
            >
              MCP Guide
            </Link>
          </li>
        </ul>
      </nav>

      <p className="mt-10 text-base text-muted-foreground">
        Comprehensive documentation for the FresherFlow platform. Explore the
        architecture, API reference, MCP integration guides, and onboarding material.
      </p>
    </main>
  );
}