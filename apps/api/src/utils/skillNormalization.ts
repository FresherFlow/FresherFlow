import { normalizeSkillList, normalizeSkillName } from '@fresherflow/constants';

export function normalizeSkills(skills: string[] | null | undefined): string[] {
    if (!Array.isArray(skills)) return [];
    return normalizeSkillList(skills.map((skill) => String(skill)));
}

export function normalizeSkill(skill: string | null | undefined): string {
    if (!skill) return '';
    return normalizeSkillName(String(skill));
}
