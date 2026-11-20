import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";

import { Button } from "@/ui/Button";
import { flatDocsNav } from "@/features/docs/docs-nav";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Guides and reference for the FresherFlow platform, API, MCP server and agent skills.",
};

export default function DocsPage() {
  return (
    <>
      <header className="border-b border-border pb-8">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-micro font-semibold uppercase tracking-widest text-muted-foreground">
          <span className="size-1.5 rounded-full bg-signal-live" aria-hidden="true" />
          FresherFlow developer docs
        </span>

        <h1 className="mt-5 font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
          Documentation
        </h1>
        <p className="mt-4 max-w-2xl text-pretty text-sm leading-7 text-muted-foreground sm:text-base">
          Everything you need to understand FresherFlow — the platform architecture,
          the API, the MCP server, and the agent skills that ship with the plugin.
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <Button asChild size="sm">
            <Link href="/docs/overview">
              Start with the overview
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link href="/docs/mcp">Connect an AI client</Link>
          </Button>
        </div>
      </header>

      <section className="mt-10" aria-labelledby="browse-docs">
        <h2 id="browse-docs" className="text-xl font-semibold tracking-tight text-foreground">
          Browse the docs
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Pick a topic to jump straight in.
        </p>

        <nav className="mt-5 grid gap-3 sm:grid-cols-2" aria-label="Documentation sections">
          {flatDocsNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex gap-4 rounded-xl border border-border bg-card p-5 transition-colors duration-150 ease-out [@media(hover:hover)_and_(pointer:fine)]:hover:border-primary/50"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-foreground">
                <item.icon className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                    {item.title}
                  </span>
                  {item.badge && (
                    <span className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-micro font-medium text-muted-foreground">
                      {item.badge}
                    </span>
                  )}
                  <ArrowUpRight
                    className="ml-auto size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                    aria-hidden="true"
                  />
                </span>
                <span className="mt-1.5 block text-pretty text-sm leading-6 text-muted-foreground">
                  {item.description}
                </span>
              </span>
            </Link>
          ))}
        </nav>
      </section>

      <section className="mt-12 grid gap-4 sm:grid-cols-2" aria-label="Next steps">
        <div className="rounded-xl border border-border bg-muted/40 p-5">
          <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-foreground">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-base font-semibold text-foreground">Built for agents</h2>
          <p className="mt-2 text-pretty text-sm leading-6 text-muted-foreground">
            The plugin ships workflow skills that tell an agent how to search jobs, submit
            opportunities and review submissions using the MCP tools.
          </p>
          <Link
            href="/docs/skills"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
          >
            Explore agent skills
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>

        <div className="rounded-xl border border-border bg-muted/40 p-5">
          <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-card text-foreground">
            <ArrowUpRight className="size-4" aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-base font-semibold text-foreground">Read the source</h2>
          <p className="mt-2 text-pretty text-sm leading-6 text-muted-foreground">
            FresherFlow is a monorepo. The architecture page maps each layer and shows how
            a posting travels from discovery to a public listing.
          </p>
          <Link
            href="/docs/architecture"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
          >
            Read the architecture
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  );
}
