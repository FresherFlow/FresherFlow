/**
 * The canonical profile section list.
 *
 * One home for the ids, labels and icons: the tab bar reads it, the checklist names sections
 * from it, and the typechecked `ProfileSectionId` comes from it. Adding a section means adding
 * one entry here and one panel in the page — there is no second list to keep in sync.
 */
import { Eye, UserRound, GraduationCap, Wrench, Briefcase, Link2 } from 'lucide-react';

export const PROFILE_SECTION_ITEMS = [
    { id: 'preview', label: 'Preview', icon: Eye },
    { id: 'headline', label: 'Headline & Bio', icon: UserRound },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'skills', label: 'Skills', icon: Wrench },
    { id: 'preferences', label: 'Career Preferences', icon: Briefcase },
    { id: 'social', label: 'Links & Work', icon: Link2 },
] as const;

export type ProfileSectionId = (typeof PROFILE_SECTION_ITEMS)[number]['id'];
