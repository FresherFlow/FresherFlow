'use client';

import React, { RefObject, useState } from 'react';
import { PlusIcon, XMarkIcon, PencilSquareIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Profile } from '@fresherflow/types';
import { Input } from '@/ui/Input';
import { Button } from '@/ui/Button';
import toast from 'react-hot-toast';

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
        <div className="w-full bg-card rounded-xl border border-border/60 shadow-sm p-5">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-foreground">Skills ({profile?.skills?.length || 0})</h3>
                {!isEditing && (
                    <Button variant="ghost" size="sm" onClick={onToggleEdit} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                        {hasSkills ? <PencilSquareIcon className="w-4 h-4" /> : <PlusIcon className="w-4 h-4" />}
                    </Button>
                )}
            </div>

            {hasSkills ? (
                <div className="flex flex-wrap gap-2">
                    {profile?.skills?.map(s => (
                        <span key={s} className="px-2.5 py-1 bg-muted/50 border border-border rounded-md text-xs font-medium text-foreground capitalize">
                            {s}
                        </span>
                    ))}
                </div>
            ) : null}

            {isEditing && (
                <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 shadow-2xl animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border shadow-2xl p-8 space-y-6">
                        <div className="flex justify-between items-center pb-2 border-b border-border/40">
                            <div>
                                <h3 className="font-bold text-lg text-foreground">Edit Skills</h3>
                                <p className="text-xs text-muted-foreground">Select up to {MAX_SKILLS} key competencies ({skills.length}/{MAX_SKILLS})</p>
                            </div>
                            <button onClick={onToggleEdit} className="text-muted-foreground hover:text-foreground">✕</button>
                        </div>
                        <div className="space-y-6 pb-44">
                            <div className="relative flex gap-4" ref={skillRef}>
                                <Input
                                    value={skillInput}
                                    className="h-10"
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
                                    placeholder={skills.length >= MAX_SKILLS ? `Maximum ${MAX_SKILLS} skills reached` : "Search skills (e.g. React)..."}
                                />
                                <Button onClick={handleAddSkill} type="button" disabled={saving || skills.length >= MAX_SKILLS} variant="outline" className="w-10 h-10 shrink-0">
                                    <PlusIcon className="w-4 h-4" />
                                </Button>

                                {skillOpen && filteredSkillOptions.length > 0 && skills.length < MAX_SKILLS && (
                                    <div className="absolute z-50 left-0 right-12 top-full mt-1 bg-card border rounded-md shadow-lg max-h-48 overflow-y-auto p-1">
                                        {filteredSkillOptions.map((skill, idx) => (
                                            <button
                                                key={skill} type="button" onMouseDown={() => { handleAddSkillValue(skill); setSkillInput(''); setSkillHighlight(-1); setSkillOpen(false); }}
                                                className={`w-full text-left px-3 py-1.5 text-sm rounded ${skillHighlight === idx ? "bg-muted" : "hover:bg-muted"}`}
                                            >
                                                {skill}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {skills.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {skills.map(s => (
                                        <span key={s} className="flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-1 rounded-md text-xs font-medium border border-primary/20 capitalize">
                                            {s}
                                            <button type="button" onClick={() => setSkills(prev => (Array.isArray(prev) ? prev.filter(x => x !== s) : []))} className="text-primary/70 hover:text-primary">
                                                <XMarkIcon className="w-3.5 h-3.5" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="flex justify-end gap-4 pt-2">
                                <Button variant="outline" className="h-10 px-4" onClick={onToggleEdit} disabled={saving}>Cancel</Button>
                                <Button className="h-10 px-4 gap-1.5" onClick={onSave} disabled={saving}><CheckIcon className="w-3.5 h-3.5" /> Save</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
