'use client';

import React, { RefObject, useState } from 'react';
import { PlusIcon, XMarkIcon, PencilSquareIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Profile } from '@fresherflow/types';
import { Input } from '@/ui/Input';
import { Button } from '@/ui/Button';
import toast from 'react-hot-toast';
import { cn } from '@repo/ui/utils/cn';

const MAX_SKILLS = 10;

interface SkillsSectionProps {
    profile?: Profile | null;
    skillInput: string;
    setSkillInput: (v: string) => void;
    skillOpen: boolean;
    setSkillOpen: (v: boolean) => void;
    filteredSkillOptions: string[];
    skills: string[];
    setSkills: (v: string[] | ((prev: string[]) => string[])) => void;
    addSkill: () => void;
    addSkillValue: (v: string) => void;
    skillRef: RefObject<HTMLDivElement | null>;
    isEditing: boolean;
    onToggleEdit: () => void;
    onSave: () => void;
    saving: boolean;
}

export const SkillsSection = ({
    profile, skillInput, setSkillInput, skillOpen, setSkillOpen, filteredSkillOptions,
    skills, setSkills, addSkill, addSkillValue, skillRef, isEditing, onToggleEdit, onSave, saving
}: SkillsSectionProps) => {
    const [skillHighlight, setSkillHighlight] = useState(-1);
    const hasSkills = Boolean(profile?.skills && profile.skills.length > 0);

    const handleAddSkill = () => {
        if (skills.length >= MAX_SKILLS) {
            toast.error(`Maximum ${MAX_SKILLS} skills allowed.`);
            return;
        }
        addSkill();
    };

    const handleAddSkillValue = (v: string) => {
        if (skills.length >= MAX_SKILLS) {
            toast.error(`Maximum ${MAX_SKILLS} skills allowed.`);
            return;
        }
        addSkillValue(v);
    };

    return (
        <div className="group relative w-full bg-card/75 backdrop-blur-md rounded-2xl border border-border/60 shadow-sm hover:shadow-md transition-all duration-200 ease-out p-5 sm:p-6 overflow-hidden">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold tracking-tight text-foreground">Skills</h3>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-semibold bg-muted/80 text-muted-foreground border border-border/60">
                        {profile?.skills?.length || 0} / {MAX_SKILLS}
                    </span>
                </div>
                {!isEditing && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onToggleEdit}
                        className="h-8 px-2.5 gap-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/70 active:scale-[0.95] transition-all duration-150 ease-out cursor-pointer"
                    >
                        {hasSkills ? (
                            <>
                                <PencilSquareIcon className="w-3.5 h-3.5 text-primary" />
                                <span>Edit</span>
                            </>
                        ) : (
                            <>
                                <PlusIcon className="w-3.5 h-3.5 text-primary" />
                                <span>Add Skills</span>
                            </>
                        )}
                    </Button>
                )}
            </div>

            {hasSkills ? (
                <div className="flex flex-wrap gap-2 pt-1">
                    {profile?.skills?.map(s => (
                        <span
                            key={s}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-card/90 hover:bg-muted/50 border border-border/70 hover:border-primary/40 rounded-lg text-xs font-semibold text-foreground capitalize shadow-2xs transition-all duration-150 hover:-translate-y-0.5"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                            {s}
                        </span>
                    ))}
                </div>
            ) : (
                <div
                    onClick={onToggleEdit}
                    className="p-8 text-center border border-dashed border-border/80 rounded-xl bg-muted/20 hover:bg-muted/40 hover:border-primary/40 transition-all duration-200 cursor-pointer group/empty"
                >
                    <p className="text-xs font-semibold text-muted-foreground group-hover/empty:text-foreground transition-colors">No skills added yet</p>
                    <p className="text-[11px] text-muted-foreground/80 mt-1">Add your core technical and professional strengths to improve match scoring</p>
                </div>
            )}

            {isEditing && (
                <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 shadow-2xl animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border/80 shadow-2xl p-6 sm:p-8 space-y-6 relative">
                        <div className="flex justify-between items-center pb-3 border-b border-border/60">
                            <div>
                                <h3 className="font-bold text-lg text-foreground tracking-tight">Edit Skills</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">Select up to {MAX_SKILLS} key competencies ({skills.length}/{MAX_SKILLS})</p>
                            </div>
                            <button
                                onClick={onToggleEdit}
                                title="Close modal"
                                className="h-8 w-8 rounded-lg border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground active:scale-[0.95] flex items-center justify-center transition-all duration-150 ease-out cursor-pointer"
                            >
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-6 pb-44">
                            <div className="relative flex gap-3" ref={skillRef}>
                                <Input
                                    value={skillInput}
                                    className="h-10 rounded-lg border-border/80 text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary/60"
                                    onChange={e => { setSkillInput(e.target.value); setSkillHighlight(-1); setSkillOpen(true); }}
                                    onFocus={() => { setSkillOpen(true); setSkillHighlight(-1); }}
                                    onKeyDown={e => {
                                        if (e.key === 'ArrowDown') { e.preventDefault(); setSkillHighlight(h => Math.min(h + 1, filteredSkillOptions.length - 1)); }
                                        else if (e.key === 'ArrowUp') { e.preventDefault(); setSkillHighlight(h => Math.max(h - 1, 0)); }
                                        else if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (skillHighlight >= 0 && filteredSkillOptions[skillHighlight]) { handleAddSkillValue(filteredSkillOptions[skillHighlight]); setSkillInput(''); setSkillHighlight(-1); setSkillOpen(false); }
                                            else handleAddSkill();
                                        }
                                        else if (e.key === 'Escape') setSkillOpen(false);
                                    }}
                                    disabled={saving || skills.length >= MAX_SKILLS}
                                    placeholder={skills.length >= MAX_SKILLS ? `Maximum ${MAX_SKILLS} skills reached` : "Search skills (e.g. React, TypeScript, Python)..."}
                                />
                                <Button
                                    onClick={handleAddSkill}
                                    type="button"
                                    disabled={saving || skills.length >= MAX_SKILLS}
                                    variant="outline"
                                    className="w-10 h-10 rounded-lg shrink-0 active:scale-[0.96] transition-all cursor-pointer"
                                    title="Add skill"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                </Button>

                                {skillOpen && filteredSkillOptions.length > 0 && skills.length < MAX_SKILLS && (
                                    <div className="absolute z-50 left-0 right-12 top-full mt-1.5 bg-card/95 backdrop-blur-xl border border-border/80 rounded-xl shadow-lg max-h-48 overflow-y-auto p-1.5 space-y-0.5">
                                        {filteredSkillOptions.map((skill, idx) => (
                                            <button
                                                key={skill}
                                                type="button"
                                                onMouseDown={() => { handleAddSkillValue(skill); setSkillInput(''); setSkillHighlight(-1); setSkillOpen(false); }}
                                                className={cn(
                                                    "w-full text-left px-3 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer",
                                                    skillHighlight === idx ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                                                )}
                                            >
                                                {skill}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {skills.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {skills.map(s => (
                                        <span
                                            key={s}
                                            className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-lg text-xs font-semibold border border-primary/20 capitalize shadow-2xs transition-all duration-150"
                                        >
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                            <span>{s}</span>
                                            <button
                                                type="button"
                                                onClick={() => setSkills(prev => (Array.isArray(prev) ? prev.filter(x => x !== s) : []))}
                                                className="ml-1 p-0.5 rounded-md text-primary/70 hover:text-primary hover:bg-primary/15 transition-colors cursor-pointer"
                                                title="Remove skill"
                                            >
                                                <XMarkIcon className="w-3.5 h-3.5" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t border-border/60">
                                <Button variant="outline" className="h-9 px-4 rounded-lg text-xs font-semibold active:scale-[0.96] transition-all cursor-pointer" onClick={onToggleEdit} disabled={saving}>Cancel</Button>
                                <Button className="h-9 px-4 gap-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.96] shadow-sm transition-all cursor-pointer" onClick={onSave} disabled={saving}><CheckIcon className="w-3.5 h-3.5" /> Save</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
