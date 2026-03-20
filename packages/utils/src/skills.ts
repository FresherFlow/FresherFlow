import { normalizeSkillList, normalizeSkillName } from '@fresherflow/constants';

const SLASH_KEEP_TOKENS = new Set([
    'ci/cd',
    'tcp/ip',
    'c/c++',
    'agile/scrum',
]);

function splitByDelimiters(value: string): string[] {
    const rawParts = value
        .split(/[,;|]+/g)
        .map((part) => part.trim())
        .filter(Boolean);

    const expanded: string[] = [];

    for (const part of rawParts) {
        const lowered = part.toLowerCase();
        if (SLASH_KEEP_TOKENS.has(lowered)) {
            expanded.push(part);
            continue;
        }

        if (part.includes('/')) {
            const slashParts = part
                .split('/')
                .map((token) => token.trim())
                .filter(Boolean);

            if (slashParts.length > 1) {
                expanded.push(...slashParts);
                continue;
            }
        }

        expanded.push(part);
    }

    return expanded;
}

export function normalizeSkills(skills: string[] | null | undefined): string[] {
    if (!Array.isArray(skills)) return [];

    const flattened = skills.flatMap((skill) => splitByDelimiters(String(skill)));
    return normalizeSkillList(flattened);
}

export function normalizeSkill(skill: string | null | undefined): string {
    if (!skill) return '';
    return normalizeSkillName(String(skill));
}
