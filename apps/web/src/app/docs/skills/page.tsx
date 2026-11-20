import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { listSkillDocs } from "@/lib/skills-docs";

export const metadata: Metadata = {
  title: "Agent skills — FresherFlow Docs",
  description:
    "The shipped FresherFlow agent skills: find jobs, check submissions, submit opportunities and route requests to the right workflow.",
};

export default async function SkillsIndexPage() {
  const skills = await listSkillDocs();

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="inline-block h-4 w-1 rounded-full bg-primary" aria-hidden="true" />
        <span className="text-meta font-medium text-muted-foreground">FresherFlow docs</span>
      </div>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Agent skills
      </h1>
      <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
        Skills are instructions an AI agent loads when it needs to do one of these jobs.
        Each page below is the shipped skill, kept in sync with the plugin.
      </p>

      {skills.length === 0 ? (
        <p className="mt-8 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          No skills are installed yet. Run <code className="font-mono text-foreground">pnpm skills:sync</code>{" "}
          to install the shipped skills from the plugin source.
        </p>
      ) : (
        <nav className="mt-8 grid gap-3" aria-label="Skill guides">
          {skills.map((skill) => (
            <Link
              key={skill.slug}
              href={`/docs/skills/${skill.slug}`}
              className="group rounded-xl border border-border bg-card p-5 transition-colors duration-150 ease-out dark:border-transparent [@media(hover:hover)_and_(pointer:fine)]:hover:border-primary/50"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-semibold text-foreground">{skill.name}</h2>
                <ArrowRight
                  className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                  aria-hidden="true"
                />
              </div>
              <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
                {skill.description}
              </p>
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
