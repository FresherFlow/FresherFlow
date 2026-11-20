#!/usr/bin/env node
/**
 * Keeps the shipped skills and the local agent install of them identical.
 *
 * `plugins/fresherflow/skills/<name>/SKILL.md` is the tracked source of truth: it is what
 * ships in the plugin bundle and what a fresh clone contains. `.agents/skills/<name>/` is
 * the local install that agents in this repository load, and `.agents` is gitignored, so it
 * can never be the source.
 *
 * Editing a shipped skill therefore means editing the file under `plugins/`, then running
 * `pnpm skills:sync` so this worktree's agents pick the change up.
 *
 * Usage:
 *   node scripts/skills-sync.mjs           # install shipped skills into .agents/skills
 *   node scripts/skills-sync.mjs --check   # report drift only, exit 1 if any, write nothing
 *
 * The check also asserts each skill's frontmatter `name` matches its directory, because a
 * mismatched name is the packaging mistake that silently breaks discovery. It enforces a
 * word budget on the body: long instruction dumps perform worse than a short fixed process.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHIPPED_DIR = join(ROOT, 'plugins', 'fresherflow', 'skills');
const INSTALLED_DIR = join(ROOT, '.agents', 'skills');

// OpenSEO measured a 3,600-word caution-heavy skill performing worse than a
// 2,200-word process-driven one. A budget keeps skills as procedures, not
// instruction dumps that dilute the steps that actually change the output.
const MAX_SKILL_WORDS = 2500;

const checkOnly = process.argv.includes('--check');

function shippedSkills() {
    if (!existsSync(SHIPPED_DIR)) return [];
    return readdirSync(SHIPPED_DIR)
        .filter((entry) => statSync(join(SHIPPED_DIR, entry)).isDirectory())
        .filter((entry) => existsSync(join(SHIPPED_DIR, entry, 'SKILL.md')))
        .sort();
}

/** The `name:` value from a SKILL.md frontmatter block, or null when absent. */
function frontmatterName(contents) {
    const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(contents);
    if (!match) return null;
    const line = match[1].split(/\r?\n/).find((entry) => entry.startsWith('name:'));
    return line ? line.slice('name:'.length).trim() : null;
}

/** Word count of the body with the YAML frontmatter removed. */
function bodyWordCount(contents) {
    const body = contents.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
    return body.split(/\s+/).filter(Boolean).length;
}

const skills = shippedSkills();
if (skills.length === 0) {
    console.error(`No shipped skills found under ${SHIPPED_DIR}`);
    process.exit(1);
}

const drifted = [];
const problems = [];

for (const name of skills) {
    const source = join(SHIPPED_DIR, name, 'SKILL.md');
    const sourceContents = readFileSync(source, 'utf8');

    const declared = frontmatterName(sourceContents);
    if (declared !== name) {
        problems.push(`${name}: frontmatter name is ${declared === null ? 'missing' : `"${declared}"`}, expected "${name}"`);
        continue;
    }

    const words = bodyWordCount(sourceContents);
    if (words > MAX_SKILL_WORDS) {
        problems.push(`${name}: SKILL.md body is ${words} words, over the ${MAX_SKILL_WORDS}-word budget — add a step, not a warning`);
    }

    const target = join(INSTALLED_DIR, name, 'SKILL.md');
    const installed = existsSync(target) ? readFileSync(target, 'utf8') : null;

    if (installed === sourceContents) {
        console.log(`in sync   ${name}`);
        continue;
    }

    drifted.push(name);
    if (checkOnly) {
        console.log(`DRIFTED   ${name} (${installed === null ? 'not installed' : 'installed copy differs'})`);
        continue;
    }

    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, sourceContents);
    console.log(`installed ${name} (${installed === null ? 'was missing' : 'updated'})`);
}

if (problems.length > 0) {
    console.error('\nSkill packaging problems:');
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
}

if (checkOnly && drifted.length > 0) {
    console.error(`\n${drifted.length} skill(s) out of date. Run: pnpm skills:sync`);
    process.exit(1);
}

console.log(
    drifted.length === 0
        ? `\nAll ${skills.length} shipped skill(s) in sync.`
        : `\n${checkOnly ? 'Checked' : 'Synced'} ${skills.length} shipped skill(s).`,
);
