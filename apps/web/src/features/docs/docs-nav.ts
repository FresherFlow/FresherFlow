import type { LucideIcon } from "lucide-react";
import { BookOpen, Code2, Network, PlugZap, Sparkles } from "lucide-react";

export type DocsNavItem = {
  title: string;
  href: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
};

export type DocsNavSection = {
  title: string;
  items: DocsNavItem[];
};

/**
 * The single source of truth for the documentation tree.
 *
 * The sidebar, landing grid, breadcrumb and prev/next pager all read from this
 * file. Do not hand-maintain a second list of documentation pages — that is
 * exactly how the account area drifted into six copies of the same hrefs.
 */
export const docsNav: DocsNavSection[] = [
  {
    title: "Get started",
    items: [
      {
        title: "Overview",
        href: "/docs/overview",
        description: "What FresherFlow is, how it is put together and where to go next.",
        icon: BookOpen,
      },
    ],
  },
  {
    title: "Platform",
    items: [
      {
        title: "Architecture",
        href: "/docs/architecture",
        description: "Monorepo layers, the feed pipeline and the boundaries between apps.",
        icon: Network,
      },
      {
        title: "API reference",
        href: "/docs/api",
        description: "HTTP endpoints, authentication and the shared listing contract.",
        icon: Code2,
      },
      {
        title: "MCP server",
        href: "/docs/mcp",
        description: "Connect Claude, Codex, Cursor or ChatGPT with OAuth 2.1.",
        icon: PlugZap,
        badge: "Popular",
      },
    ],
  },
  {
    title: "AI & agents",
    items: [
      {
        title: "Agent skills",
        href: "/docs/skills",
        description: "The workflow playbooks that ship with the FresherFlow plugin.",
        icon: Sparkles,
      },
    ],
  },
];

export const flatDocsNav: DocsNavItem[] = docsNav.flatMap((section) => section.items);

export type SkillNavItem = { slug: string; name: string };

/** Ordered page list used by the prev/next pager, with skill pages inserted. */
export function getDocsOrder(skills: SkillNavItem[]): Array<{ href: string; title: string }> {
  const order = flatDocsNav.map((item) => ({ href: item.href, title: item.title }));
  const skillsIndex = order.findIndex((item) => item.href === "/docs/skills");
  if (skillsIndex !== -1) {
    order.splice(
      skillsIndex + 1,
      0,
      ...skills.map((skill) => ({ href: `/docs/skills/${skill.slug}`, title: skill.name }))
    );
  }
  return order;
}
