import type { Profile } from '@fresherflow/types';
import type { ProfileSectionId } from '@/features/profile/profileSections';
import { getProfileChecklist } from '@/features/profile/profileChecklist';

export type ProfileGap = { label: string; section: ProfileSectionId };

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
