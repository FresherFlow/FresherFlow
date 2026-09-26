/**
 * Non-UI code for the Skills section: the selection rule.
 *
 * The section used to decide this inline, which meant the limit lived in three places (the
 * toggle, the custom-skill add, and the suggestion grid's disabled state). Stated once here so
 * they cannot disagree.
 */
import { MAX_SKILLS } from '@/features/profile/profileConstants';

export function isAtSkillLimit(skills: string[]): boolean {
    return skills.length >= MAX_SKILLS;
}

/**
 * Add or remove a skill.
 *
 * Returns the error instead of showing it, so the caller decides how to surface it and the rule
 * stays testable.
 */
export function toggleSkillSelection(skills: string[], skill: string): { next: string[]; error?: string } {
    if (skills.includes(skill)) {
        return { next: skills.filter((existing) => existing !== skill) };
    }
    if (isAtSkillLimit(skills)) {
        return { next: skills, error: `Max ${MAX_SKILLS} skills allowed.` };
    }
    return { next: [...skills, skill] };
}

/** A typed skill, normalised. Returns null when there is nothing to add. */
export function normalizeSkillInput(input: string): string | null {
    const trimmed = input.trim();
    return trimmed ? trimmed : null;
}
