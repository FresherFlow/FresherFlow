import React, { RefObject, useState } from 'react';
import { CompactSection } from '@/features/profile/components/ProfileSection';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import { Profile } from '@fresherflow/types';
import { cn } from '@repo/ui/utils/cn';

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
    profile,
    skillInput,
    setSkillInput,
    skillOpen,
    setSkillOpen,
    filteredSkillOptions,
    skills,
    setSkills,
    addSkill,
    addSkillValue,
    skillRef,
    isEditing,
    onToggleEdit,
    onSave,
    saving
}: SkillsSectionProps) => {
    const [skillHighlight, setSkillHighlight] = useState(-1);

    return (
        <CompactSection
            title="Skills & Tools"
            onSave={onSave}
            saving={saving}
            isEditing={isEditing}
            onToggleEdit={onToggleEdit}
            viewContent={
                <div className="flex flex-wrap gap-1.5">
                    {profile?.skills && profile.skills.length > 0 ? profile.skills.map(s => (
                        <span key={s} className="bg-muted border border-border/80 px-2.5 py-1 rounded-md text-[13px] font-medium text-foreground capitalize">
                            {s}
                        </span>
                    )) : <span className="text-[13px] text-muted-foreground italic">No skills added</span>}
                </div>
            }
        >
            <div className="space-y-3">
                <div className="relative" ref={skillRef}>
                    <div className="flex gap-2">
                        <input
                            value={skillInput}
                            onChange={e => { setSkillInput(e.target.value); setSkillHighlight(-1); setSkillOpen(true); }}
                            onFocus={() => { setSkillOpen(true); setSkillHighlight(-1); }}
                            onKeyDown={e => {
                                if (e.key === 'ArrowDown') { e.preventDefault(); setSkillHighlight(h => Math.min(h + 1, filteredSkillOptions.length - 1)); }
                                else if (e.key === 'ArrowUp') { e.preventDefault(); setSkillHighlight(h => Math.max(h - 1, 0)); }
                                else if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (skillHighlight >= 0 && filteredSkillOptions[skillHighlight]) {
                                        addSkillValue(filteredSkillOptions[skillHighlight]);
                                        setSkillInput('');
                                        setSkillHighlight(-1);
                                        setSkillOpen(false);
                                    } else {
                                        addSkill();
                                    }
                                }
                                else if (e.key === 'Escape') setSkillOpen(false);
                            }}
                            className="premium-input text-sm h-11 md:h-10 flex-1"
                            placeholder="Type to search and add skills..."
                        />
                        <button onClick={addSkill} className="w-11 h-11 md:w-10 md:h-10 flex items-center justify-center rounded-lg border border-border bg-card hover:bg-muted shadow-sm">
                            <PlusIcon className="w-4 h-4 text-foreground/80" />
                        </button>
                    </div>
                    {skillOpen && filteredSkillOptions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                            {filteredSkillOptions.map((skill, idx) => (
                                <button key={skill}
                                    onMouseDown={() => { addSkillValue(skill); setSkillInput(''); setSkillHighlight(-1); setSkillOpen(false); }}
                                    className={cn(
                                        "w-full text-left px-3 py-2 transition-colors text-sm font-medium border-b border-border/40 last:border-0",
                                        skillHighlight === idx ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                                    )}>
                                    {skill}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    {skills.map(s => (
                        <span key={s} className="flex items-center gap-1.5 bg-foreground/5 px-2.5 py-1 rounded-md text-[13px] font-semibold border border-foreground/10 capitalize">
                            {s}
                            <button onClick={() => setSkills(prev => (Array.isArray(prev) ? prev.filter(x => x !== s) : []))} className="text-foreground/50 hover:text-destructive">
                                <XMarkIcon className="w-3.5 h-3.5" />
                            </button>
                        </span>
                    ))}
                </div>
            </div>
        </CompactSection>
    );
};
