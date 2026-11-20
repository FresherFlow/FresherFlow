import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { useMDXComponents } from "@/mdx-components";
import { getSkillDoc, listSkillDocs } from "@/lib/skills-docs";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const skills = await listSkillDocs();
  return skills.map((skill) => ({ slug: skill.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const skill = await getSkillDoc(slug);
  if (!skill) return { title: "Skill not found — FresherFlow Docs" };
  return {
    title: `${skill.name} — FresherFlow agent skill`,
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
      <div className="flex items-center gap-2">
        <span className="inline-block h-4 w-1 rounded-full bg-primary" aria-hidden="true" />
        <span className="text-meta font-medium text-muted-foreground">Agent skill</span>
      </div>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {skill.name}
      </h1>
      {skill.description && (
        <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
          {skill.description}
        </p>
      )}

      <div className="mt-10">
        <MDXRemote source={skill.content} components={components} />
      </div>
    </>
  );
}
