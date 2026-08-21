'use client';

import React from 'react';
import { PlusIcon, XMarkIcon, PencilSquareIcon, CheckIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { Profile } from '@fresherflow/types';
import { Input } from '@/ui/Input';
import { Button } from '@/ui/Button';
import toast from 'react-hot-toast';
import { cn } from '@repo/ui/utils/cn';
import { SkillPill } from '@/ui/SkillPill';

const MAX_SKILLS = 10;

interface SkillsSectionProps {
    profile?: Profile | null;
    skillInput: string;
    setSkillInput: (v: string) => void;
    filteredSkillOptions: string[];
    skills: string[];
    setSkills: (v: string[] | ((prev: string[]) => string[])) => void;
    addSkill: () => boolean;
    addSkillValue: (v: string) => void;
    isEditing: boolean;
    onToggleEdit: () => void;
    onSave: () => void;
    saving: boolean;
}

export const SkillsSection = ({
    profile, skillInput, setSkillInput, filteredSkillOptions,
    skills, setSkills, addSkillValue, isEditing, onToggleEdit, onSave, saving
}: SkillsSectionProps) => {
    const hasSkills = Boolean(profile?.skills && profile.skills.length > 0);

    const toggleSkill = (skill: string) => {
        if (skills.includes(skill)) {
            setSkills(prev => (Array.isArray(prev) ? prev.filter(s => s !== skill) : []));
        } else {
            if (skills.length >= MAX_SKILLS) { toast.error(`Max ${MAX_SKILLS} skills allowed.`); return; }
            addSkillValue(skill);
        }
    };

    const addCustomSkill = () => {
        const trimmed = skillInput.trim();
        if (!trimmed) return;
        if (skills.length >= MAX_SKILLS) { toast.error(`Max ${MAX_SKILLS} skills allowed.`); return; }
        addSkillValue(trimmed);
        setSkillInput('');
    };

    return (
        <div className="w-full bg-card rounded-2xl border border-border/60 shadow-sm p-5 sm:p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground">Skills</h3>
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border/60">
                        {isEditing ? skills.length : (profile?.skills?.length || 0)}/{MAX_SKILLS}
                    </span>
                </div>
                {!isEditing ? (
                    <Button variant="ghost" size="sm" onClick={onToggleEdit} className="h-8 px-2.5 gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                        {hasSkills ? <><PencilSquareIcon className="w-3.5 h-3.5" />Edit</> : <><PlusIcon className="w-3.5 h-3.5" />Add</>}
                    </Button>
                ) : (
                    <button onClick={onToggleEdit} className="text-muted-foreground hover:text-foreground transition-colors">
                        <XMarkIcon className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Display mode */}
            {!isEditing && (
                hasSkills ? (
                    <div className="flex flex-wrap gap-2">
                        {profile?.skills?.map(s => (
                            <SkillPill key={s} skill={s} className="px-3 py-1 border border-border/70 bg-muted/40" />
                        ))}
                    </div>
                ) : (
                    <div
                        onClick={onToggleEdit}
                        className="py-8 text-center border border-dashed border-border/80 rounded-xl bg-muted/20 hover:bg-muted/40 hover:border-primary/40 transition-all cursor-pointer"
                    >
                        <p className="text-xs font-semibold text-muted-foreground">No skills added yet</p>
                        <p className="text-[11px] text-muted-foreground/70 mt-1">Click to add your skills</p>
                    </div>
                )
            )}

            {/* Inline edit mode */}
            {isEditing && (
                <div className="space-y-4">
                    {/* Selected chips */}
                    {skills.length > 0 && (
                        <div className="flex flex-wrap gap-2 pb-3 border-b border-border/40">
                            {skills.map(s => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => toggleSkill(s)}
                                    className="inline-flex items-center gap-1 bg-primary text-primary-foreground px-2.5 py-1 rounded-lg text-xs font-semibold hover:bg-primary/80 transition-colors cursor-pointer"
                                >
                                    {s}<XMarkIcon className="w-3 h-3" />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Search */}
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                            value={skillInput}
                            onChange={e => setSkillInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomSkill(); } }}
                            placeholder="Search or type a skill…"
                            className="pl-9 h-9 text-sm"
                            disabled={saving || skills.length >= MAX_SKILLS}
                            autoFocus
                        />
                        {skillInput.trim() && (
                            <button
                                type="button"
                                onClick={addCustomSkill}
                                disabled={saving || skills.length >= MAX_SKILLS}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-md cursor-pointer"
                            >
                                Add
                            </button>
                        )}
                    </div>

                    {/* Skill grid */}
                    {filteredSkillOptions.length > 0 ? (
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                {skillInput ? 'Matching' : 'Suggested'}
                            </p>
                            <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto">
                                {filteredSkillOptions.map(skill => {
                                    const selected = skills.includes(skill);
                                    const atLimit = !selected && skills.length >= MAX_SKILLS;
                                    return (
                                        <button
                                            key={skill}
                                            type="button"
                                            onClick={() => toggleSkill(skill)}
                                            disabled={saving || atLimit}
                                            className={cn(
                                                'px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer',
                                                selected
                                                    ? 'bg-primary text-primary-foreground border-primary'
                                                    : atLimit
                                                        ? 'opacity-30 cursor-not-allowed border-border bg-muted/40 text-muted-foreground'
                                                        : 'bg-background text-foreground border-border hover:border-primary/60 hover:bg-primary/5 hover:text-primary'
                                            )}
                                        >
                                            {selected && <CheckIcon className="inline w-3 h-3 mr-1" />}{skill}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ) : skillInput.trim() ? (
                        <p className="text-xs text-muted-foreground text-center py-4">Press Enter to add "{skillInput}"</p>
                    ) : null}

                    {/* Save / Cancel */}
                    <div className="flex justify-end gap-3 pt-2 border-t border-border/40">
                        <Button variant="outline" size="sm" onClick={onToggleEdit} disabled={saving}>Cancel</Button>
                        <Button size="sm" onClick={onSave} disabled={saving}>
                            <CheckIcon className="w-3.5 h-3.5 mr-1" />Save
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
