/**
 * The single source for "what does this profile still need".
 *
 * Previously two lists existed: a 9-row strength checklist with done/undone flags, and a
 * 6-item `getProfileGaps`. They disagreed — the checklist required a resume, a project and a
 * location, while the gaps list never mentioned them, so a profile could read "3 things
 * missing" and "8 of 9 done" at the same time.
 *
 * One list now, with `shortLabel` for the places that need a chip rather than a sentence.
 */
import type { Profile } from '@fresherflow/types';
import type { ProfileSectionId } from '@/features/profile/profileSections';

export interface ProfileChecklistItem {
    id: string;
    /** Sentence form, for the checklist. */
    label: string;
    /** Chip form, for the gaps strip. Falls back to `label`. */
    shortLabel?: string;
    done: boolean;
    section: ProfileSectionId;
}

export interface ProfileGap {
    label: string;
    section: ProfileSectionId;
}

export function getProfileChecklist(profile: Profile | null | undefined): ProfileChecklistItem[] {
    const p = profile ?? null;
    const skills = p?.skills ?? [];

    return [
        {
            id: 'photo',
            label: 'Profile photo uploaded',
            shortLabel: 'Add a photo',
            done: Boolean(p?.avatarUrl),
            section: 'headline',
        },
        {
            id: 'headline',
            label: 'Headline / bio filled',
            shortLabel: 'Write a headline',
            done: Boolean(p?.headline),
            section: 'headline',
        },
        {
            id: 'skills',
            label: 'At least 1 skill added',
            shortLabel: 'Add your skills',
            done: skills.length > 0,
            section: 'skills',
        },
        {
            id: 'gradYear',
            label: 'Graduation year set (batch year)',
            shortLabel: 'Set graduation year',
            done: Boolean(p?.gradYear),
            section: 'education',
        },
        {
            id: 'degree',
            label: 'Degree & branch filled',
            shortLabel: 'Add degree & branch',
            done: Boolean(p?.gradCourse && p?.gradSpecialization),
            section: 'education',
        },
        {
            id: 'projects',
            label: 'At least 1 project added',
            shortLabel: 'Add a project',
            done: (p?.projects?.length ?? 0) > 0,
            section: 'social',
        },
        {
            id: 'linkedin',
            label: 'LinkedIn URL added',
            shortLabel: 'Add LinkedIn',
            done: Boolean(p?.linkedinUrl),
            section: 'social',
        },
        {
            // Lives with the other recruiter-facing fields, not in Skills.
            id: 'resume',
            label: 'Resume link added',
            shortLabel: 'Add your resume link',
            done: Boolean(p?.resumeUrl),
            section: 'preferences',
        },
        {
            id: 'location',
            label: 'Location set',
            shortLabel: 'Set your location',
            done: (p?.preferredCities?.length ?? 0) > 0,
            section: 'preferences',
        },
    ];
}

export function countChecklist(items: ProfileChecklistItem[]): { done: number; total: number } {
    return { done: items.filter((item) => item.done).length, total: items.length };
}

/**
 * What the public page still cannot show, each pointing at the section that fixes it.
 *
 * Derived from `getProfileChecklist` rather than maintained separately — a second hand-written
 * list is exactly how the checklist and the "N things missing" count came to disagree.
 * Uses the chip-sized label, because these render as pills rather than sentences.
 */
export function getProfileGaps(profile: Profile | null | undefined): ProfileGap[] {
    return getProfileChecklist(profile)
        .filter((item) => !item.done)
        .map((item) => ({ label: item.shortLabel ?? item.label, section: item.section }));
}
