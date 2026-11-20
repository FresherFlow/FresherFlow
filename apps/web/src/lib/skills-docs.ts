import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Reads the shipped agent skills from their tracked source of truth:
 * `plugins/fresherflow/skills/<name>/SKILL.md`. The local `.agents/skills/`
 * install is deliberately not read here — it is gitignored, so it can never be
 * the source for public documentation.
 */

export type SkillDoc = {
    slug: string;
    name: string;
    description: string;
    content: string;
};

const SKILLS_DIR = path.resolve(process.cwd(), "../../plugins/fresherflow/skills");
const SLUG_PATTERN = /^[a-z0-9-]+$/;

function parseFrontmatter(raw: string): { meta: Record<string, string>; content: string } {
    const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw);
    if (!match) return { meta: {}, content: raw };

    const meta: Record<string, string> = {};
    for (const line of match[1].split(/\r?\n/)) {
        const colon = line.indexOf(":");
        if (colon === -1) continue;
        const key = line.slice(0, colon).trim();
        let value = line.slice(colon + 1).trim();
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        meta[key] = value;
    }
    return { meta, content: match[2] };
}

export async function listSkillDocs(): Promise<Pick<SkillDoc, "slug" | "name" | "description">[]> {
    let entries;
    try {
        entries = await fs.readdir(SKILLS_DIR, { withFileTypes: true });
    } catch {
        return [];
    }

    const docs = await Promise.all(
        entries
            .filter((entry) => entry.isDirectory() && SLUG_PATTERN.test(entry.name))
            .map(async (entry) => {
                const raw = await fs
                    .readFile(path.join(SKILLS_DIR, entry.name, "SKILL.md"), "utf8")
                    .catch(() => null);
                if (!raw) return null;
                const { meta } = parseFrontmatter(raw);
                if (!meta.name) return null;
                return {
                    slug: entry.name,
                    name: meta.name,
                    description: meta.description || "",
                };
            })
    );

    return docs
        .filter((doc): doc is Pick<SkillDoc, "slug" | "name" | "description"> => Boolean(doc))
        .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getSkillDoc(slug: string): Promise<SkillDoc | null> {
    if (!SLUG_PATTERN.test(slug)) return null;

    const raw = await fs
        .readFile(path.join(SKILLS_DIR, slug, "SKILL.md"), "utf8")
        .catch(() => null);
    if (!raw) return null;

    const { meta, content: rawContent } = parseFrontmatter(raw);
    // The shipped SKILL.md starts with its own `# Title`. The docs page renders
    // the title from frontmatter, so drop that first heading to avoid a duplicate.
    const content = rawContent.replace(/^\s*#\s+[^\r\n]*\r?\n/, "");
    return {
        slug,
        name: meta.name || slug,
        description: meta.description || "",
        content,
    };
}
