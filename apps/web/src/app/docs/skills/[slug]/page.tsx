import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { DocBackLink, useMDXComponents } from "@/mdx-components";
import { getSkillDoc, listSkillDocs } from "@/lib/skills-docs";

type Props = { params: Promise<{ slug: string }> };

function titleFor(name: string) {
  return name
    .split("-")
    .map((word) => (word === "fresherflow" ? "FresherFlow" : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(" ");
}

export async function generateStaticParams() {
  const skills = await listSkillDocs();
  return skills.map((skill) => ({ slug: skill.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const skill = await getSkillDoc(slug);
  if (!skill) return { title: "Skill not found — FresherFlow Docs" };
  return {
    title: `${titleFor(skill.name)} — FresherFlow agent skill`,
    description: skill.description,
  };
}

export default async function SkillPage({ params }: Props) {
  const { slug } = await params;
  const skill = await getSkillDoc(slug);
  if (!skill) notFound();
  const components = useMDXComponents();

  return (
    <>
      <DocBackLink />
      <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground text-balance">
        {titleFor(skill.name)}
      </h1>
      {skill.description && (
        <p className="mt-4 text-pretty text-base leading-7 text-muted-foreground">
          {skill.description}
        </p>
      )}

      <div className="mt-8 overflow-hidden rounded-lg border border-border bg-muted/40">
        <div className="flex items-center gap-1.5 border-b border-border px-4 py-2.5">
          <span className="size-2 rounded-full bg-border" aria-hidden="true" />
          <span className="size-2 rounded-full bg-border" aria-hidden="true" />
          <span className="size-2 rounded-full bg-border" aria-hidden="true" />
          <span className="ml-2 text-micro font-medium text-muted-foreground">
            Runs this skill in your agent
          </span>
        </div>
        <div className="px-4 py-4 font-mono text-sm text-foreground">
          <span className="text-muted-foreground" aria-hidden="true">
            {"> "}
          </span>
          /{slug}
        </div>
      </div>

      <div className="mt-8">
        <MDXRemote source={skill.content} components={components} />
      </div>
    </>
  );
}
