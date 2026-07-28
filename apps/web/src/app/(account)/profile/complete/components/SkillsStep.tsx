import React, { RefObject } from 'react';
import { cn } from '@repo/ui/utils/cn';
import { Button } from '@/ui/Button';
import { ArrowPathIcon, CheckCircleIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface SkillsStepProps {
    skills: string[];
    removeSkill: (s: string) => void;
    skillInput: string;
    setSkillInput: (v: string) => void;
    skillOpen: boolean;
    setSkillOpen: (v: boolean) => void;
    skillHighlight: number;
    setSkillHighlight: (v: number | ((prev: number) => number)) => void;
    filteredSkillOptions: string[];
    addSkill: () => void;
    addSkillValue: (skill: string) => void;
    skillRef: RefObject<HTMLDivElement | null>;
    isLoading: boolean;
    onSubmit: () => void;
    onSkip: () => void;
}

export const SkillsStep = ({
    skills,
    removeSkill,
    skillInput,
    setSkillInput,
    skillOpen,
    setSkillOpen,
    skillHighlight,
    setSkillHighlight,
    filteredSkillOptions,
    addSkill,
    addSkillValue,
    skillRef,
    isLoading,
    onSubmit,
    onSkip
}: SkillsStepProps) => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-3 duration-300">
            <Field label="Skills">
                <div className="relative mt-1" ref={skillRef}>
                    <div className="flex gap-2">
                        <input
                            value={skillInput}
                            onChange={e => { setSkillInput(e.target.value); setSkillHighlight(-1); setSkillOpen(true); }}
                            onFocus={() => setSkillOpen(true)}
                            onKeyDown={e => {
                                if (e.key === 'ArrowDown') { e.preventDefault(); setSkillHighlight(h => Math.min(h + 1, filteredSkillOptions.length - 1)); }
                                else if (e.key === 'ArrowUp') { e.preventDefault(); setSkillHighlight(h => Math.max(h - 1, 0)); }
                                else if (e.key === 'Enter') { e.preventDefault(); addSkill(); }
                                else if (e.key === 'Escape') setSkillOpen(false);
                            }}
                            className="premium-input h-10! text-sm flex-1"
                            placeholder="e.g. React, Node.js, Python"
                        />
                        <button onClick={addSkill} className="w-10 h-10 flex items-center justify-center rounded-lg border border-border bg-card hover:bg-muted transition-colors shrink-0">
                            <PlusIcon className="w-4 h-4" />
                        </button>
                    </div>
                    {skillOpen && skillInput && filteredSkillOptions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-2xl max-h-52 overflow-y-auto">
                            {filteredSkillOptions.map((skill, idx) => (
                                <button key={skill}
                                    onMouseDown={() => addSkillValue(skill)}
                                    className={cn('w-full text-left px-4 py-2.5 text-sm font-medium transition-colors first:rounded-t-xl last:rounded-b-xl', skillHighlight === idx ? 'bg-primary/15 text-foreground' : 'hover:bg-muted')}
                                >{skill}</button>
                            ))}
                        </div>
                    )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">Type to search or enter a custom skill and press Enter.</p>
                {skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {skills.map(s => (
                            <span key={s} className="bg-success/5 text-success border border-success/20 px-3 py-1 rounded-lg text-[11px] font-bold capitalize tracking-wider flex items-center gap-1.5">
                                {s}
                                <XMarkIcon onClick={() => removeSkill(s)} className="w-3 h-3 cursor-pointer opacity-50 hover:opacity-100" />
                            </span>
                        ))}
                    </div>
                )}
            </Field>

            <div className="flex gap-3">
                <Button onClick={onSubmit} disabled={isLoading} className="flex-1 h-11 font-bold flex items-center justify-center gap-2">
                    {isLoading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <><CheckCircleIcon className="w-4 h-4" /> Finish Setup</>}
                </Button>
                <Button variant="outline" onClick={onSkip} className="h-11 px-5 text-xs font-bold capitalize tracking-wider text-muted-foreground">
                    Skip
                </Button>
            </div>
        </div>
    );
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5 w-full">
            <label className="text-[11px] font-bold text-muted-foreground capitalize tracking-wider">{label}</label>
            {children}
        </div>
    );
}
