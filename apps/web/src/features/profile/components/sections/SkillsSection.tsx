'use client';

import { Check, Search, X } from 'lucide-react';
import type { Profile } from '@fresherflow/types';
import { Input } from '@/ui/Input';
import { Button } from '@/ui/Button';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/utils/error';
import { ProfileSectionCard } from '@/features/profile/components/sections/ProfileSectionCard';
import { SectionFooter, useSectionSave } from '@/features/profile/components/editor/SectionFooter';
import { MAX_SKILLS } from '@/features/profile/profileConstants';
import { isAtSkillLimit, toggleSkillSelection } from '@/features/profile/skills';

interface SkillsSectionProps {
    profile?: Profile | null;
    skillInput: string;
    setSkillInput: (v: string) => void;
    filteredSkillOptions: string[];
    skills: string[];
    setSkills: (v: string[] | ((prev: string[]) => string[])) => void;
    addSkill: () => boolean;
    addSkillValue: (v: string) => void;
    onSave: () => Promise<boolean>;
    /** Onboarding asks this inside its own stepped flow, so the footer hides there. */
    hideFooter?: boolean;
    /** Render fields without card chrome (stepped flows like onboarding). */
    bare?: boolean;
}

/**
 * Skills — and only skills.
 *
 * The fields are the section: your picked skills, a search, and the suggestions
 * that match what you typed. There is no read view to toggle into and back out
 * of, so nothing reshapes when you start editing — one list, one save.
 *
 * Expected CTC, the resume link and relocation used to live here because they
 * travelled in the same payload. They are career preferences and moved to that
 * section; the readiness save still sends them so they cannot be blanked.
 */
export function SkillsSection({
    profile,
    skillInput, setSkillInput, filteredSkillOptions,
    skills, setSkills, addSkillValue, onSave,
    hideFooter = false,
    bare = false,
}: SkillsSectionProps) {
    const { saving, save } = useSectionSave();
    const savedSkills = profile?.skills ?? [];
    const atLimit = isAtSkillLimit(skills);
    const isDirty =
        skills.length !== savedSkills.length || skills.some((skill) => !savedSkills.includes(skill));

    /** The limit rule lives in skills.ts — this only surfaces what it returns. */
    const toggleSkill = (skill: string) => {
        const { next, error } = toggleSkillSelection(skills, skill);
        if (error) {
            toast.error(getErrorMessage(error));
            return;
        }
        if (next.length < skills.length) {
            setSkills(next);
            return;
        }
        addSkillValue(skill);
    };

    const addCustomSkill = () => {
        const trimmed = skillInput.trim();
        if (!trimmed) return;
        if (atLimit) {
            toast.error(`Max ${MAX_SKILLS} skills allowed.`);
            return;
        }
        addSkillValue(trimmed);
        setSkillInput('');
    };

    return (
        <ProfileSectionCard
            title="Skills"
            description={
                skills.length > 0
                    ? `${skills.length} of ${MAX_SKILLS} · these drive job matching`
                    : `Up to ${MAX_SKILLS} skills · these drive job matching`
            }
            bare={bare}
        >
            <form
                className="space-y-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    void save(onSave, 'Skills saved.');
                }}
            >
                {skills.length > 0 ? (
                    <ul className="flex flex-wrap gap-2">
                        {skills.map((skill) => (
                            <li key={skill}>
                                <button
                                    type="button"
                                    onClick={() => toggleSkill(skill)}
                                    disabled={saving}
                                    className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition-colors duration-150 ease-out hover:bg-primary/20 disabled:opacity-60"
                                    aria-label={`Remove ${skill}`}
                                >
                                    {skill}
                                    <X className="h-3 w-3" aria-hidden="true" />
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        No skills yet — even three start matching you to roles.
                    </p>
                )}

                <div className="relative">
                    <Search
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden="true"
                    />
                    <Input
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                addCustomSkill();
                            }
                        }}
                        placeholder={atLimit ? `Limit reached (${MAX_SKILLS})` : 'Search or type a skill…'}
                        disabled={saving || atLimit}
                        className="pl-9 pr-16"
                        aria-label="Add a skill"
                        autoComplete="off"
                    />
                    {skillInput.trim() && !atLimit && (
                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
                            <Button type="button" size="sm" variant="ghost" onClick={addCustomSkill} disabled={saving}>
                                Add
                            </Button>
                        </div>
                    )}
                </div>

                {filteredSkillOptions.length > 0 ? (
                    <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            {skillInput ? 'Matching' : 'Suggested'}
                        </p>
                        <div className="flex max-h-52 flex-wrap gap-2 overflow-y-auto">
                            {filteredSkillOptions.map((skill) => {
                                const selected = skills.includes(skill);
                                return (
                                    <Button
                                        key={skill}
                                        type="button"
                                        variant={selected ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => toggleSkill(skill)}
                                        disabled={saving || (!selected && atLimit)}
                                    >
                                        {selected && <Check className="mr-1 h-3.5 w-3.5" aria-hidden="true" />}
                                        {skill}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>
                ) : skillInput.trim() ? (
                    <p className="text-xs text-muted-foreground">
                        Press Enter to add “{skillInput}”
                    </p>
                ) : null}

                {!hideFooter && <SectionFooter isDirty={isDirty} saving={saving} saveLabel="Save skills" />}
            </form>
        </ProfileSectionCard>
    );
}
