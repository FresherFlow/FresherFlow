import Link from "next/link";
import type { Metadata } from "next";
import { DocBackLink } from "@/mdx-components";
import { listSkillDocs } from "@/lib/skills-docs";

export const metadata: Metadata = {
  title: "Agent skills — FresherFlow Docs",
  description:
    "The shipped FresherFlow agent skills: find jobs, check submissions, submit opportunities and route requests to the right workflow.",
};

function titleFor(name: string) {
  return name
    .split("-")
    .map((word) => (word === "fresherflow" ? "FresherFlow" : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(" ");
}

export default async function SkillsIndexPage() {
  const skills = await listSkillDocs();

  return (
    <>
      <DocBackLink />
      <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground text-balance">
        Agent skills
      </h1>
      <p className="mt-4 max-w-2xl text-pretty text-base leading-7 text-muted-foreground">
        Skills are instructions an AI agent loads when it needs to do one of these jobs.
        Each page below is the shipped skill, kept in sync with the plugin.
      </p>

      {skills.length === 0 ? (
        <p className="mt-8 rounded-lg border border-border bg-muted/40 p-4 text-sm text-foreground">
          No skills are installed yet. Run <code className="font-mono">pnpm skills:sync</code> to
          install the shipped skills from the plugin source.
        </p>
      ) : (
        <nav className="mt-8" aria-label="Skill guides">
          {skills.map((skill) => (
            <Link
              key={skill.slug}
              href={`/docs/skills/${skill.slug}`}
              className="group block border-b border-border py-6"
            >
              <h2 className="text-lg font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary">
                {titleFor(skill.name)}
              </h2>
              <p className="mt-1.5 text-pretty text-sm leading-6 text-muted-foreground">
                {skill.description}
              </p>
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
