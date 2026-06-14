import React, { RefObject } from 'react';
import { cn } from '@repo/ui/utils/cn';
import { OPPORTUNITY_TYPES, WORK_MODES } from '@fresherflow/domain';
import { Input } from '@/ui/Input';
import { ArrowPathIcon, CheckCircleIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface PreferencesStepProps {
    interestedIn: string[];
    setInterestedIn: (v: string[]) => void;
    workModes: string[];
    setWorkModes: (v: string[]) => void;
    preferredCities: string[];
    setPreferredCities: (v: string[]) => void;
    cityInput: string;
    setCityInput: (v: string) => void;
    cityOpen: boolean;
    setCityOpen: (v: boolean) => void;
    cityHighlight: number;
    setCityHighlight: (v: number | ((prev: number) => number)) => void;
    filteredCityOptions: string[];
    toggleItem: <T>(arr: T[], item: T) => T[];
    cityRef: RefObject<HTMLDivElement | null>;
    // Skills
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

export const PreferencesStep = ({
    interestedIn, setInterestedIn,
    workModes, setWorkModes,
    preferredCities, setPreferredCities,
    cityInput, setCityInput,
    cityOpen, setCityOpen,
    cityHighlight, setCityHighlight,
    filteredCityOptions, toggleItem, cityRef,
    skills, removeSkill,
    skillInput, setSkillInput,
    skillOpen, setSkillOpen,
    skillHighlight, setSkillHighlight,
    filteredSkillOptions, addSkill, addSkillValue, skillRef,
    isLoading, onSubmit, onSkip
}: PreferencesStepProps) => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-3 duration-300">

            {/* Section header */}
            <div className="border-b border-border pb-5">
                <h2 className="text-xl font-bold tracking-tight text-foreground">Preferences & Skills</h2>
                <p className="text-xs text-muted-foreground mt-1">Tell us what you&apos;re looking for and what you bring.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field label="Looking For">
                    <div className="flex flex-wrap gap-2 mt-1">
                        {OPPORTUNITY_TYPES.map(t => (
                            <button key={t} onClick={() => setInterestedIn(toggleItem(interestedIn, t))}
                                className={cn('px-5 h-10 rounded-xl border text-[14px] font-semibold tracking-normal transition-all duration-200 capitalize',
                                    interestedIn.includes(t) ? 'bg-primary/10 text-primary border-primary/30' : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted font-medium')}
                            >{t === 'WALKIN' ? 'Walk-in' : t.toLowerCase()}</button>
                        ))}
                    </div>
                </Field>

                <Field label="Work Mode">
                    <div className="flex flex-wrap gap-2 mt-1">
                        {WORK_MODES.map(t => (
                            <button key={t} onClick={() => setWorkModes(toggleItem(workModes, t))}
                                className={cn('px-5 h-10 rounded-xl border text-[14px] font-semibold tracking-normal transition-all duration-200 capitalize',
                                    workModes.includes(t) ? 'bg-primary/10 text-primary border-primary/30' : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted font-medium')}
                            >{t.toLowerCase()}</button>
                        ))}
                    </div>
                </Field>
            </div>

            <Field label="Preferred Cities">
                <div className="relative mt-1" ref={cityRef}>
                    <div className="flex gap-2">
                        <Input
                            value={cityInput}
                            onChange={e => { setCityInput(e.target.value); setCityHighlight(-1); setCityOpen(true); }}
                            onFocus={() => setCityOpen(true)}
                            placeholder="e.g. Hyderabad, Bangalore"
                            onKeyDown={e => {
                                if (e.key === 'ArrowDown') { e.preventDefault(); setCityHighlight(h => Math.min(h + 1, filteredCityOptions.length - 1)); }
                                else if (e.key === 'ArrowUp') { e.preventDefault(); setCityHighlight(h => Math.max(h - 1, 0)); }
                                else if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const city = cityHighlight >= 0 ? filteredCityOptions[cityHighlight] : cityInput.trim();
                                    if (city) { setPreferredCities(toggleItem(preferredCities, city)); setCityInput(''); setCityHighlight(-1); setCityOpen(false); }
                                } else if (e.key === 'Escape') setCityOpen(false);
                            }}
                        />
                        <button
                            className="h-10 px-5 bg-secondary border border-border rounded-xl text-[14px] font-semibold hover:border-primary/40 transition-all shrink-0"
                            onClick={() => { if (cityInput.trim()) { setPreferredCities(toggleItem(preferredCities, cityInput.trim())); setCityInput(''); setCityOpen(false); } }}>
                            Add
                        </button>
                    </div>
                    {cityOpen && cityInput && filteredCityOptions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-2xl max-h-52 overflow-y-auto">
                            {filteredCityOptions.map((city, idx) => (
                                <button key={city}
                                    onMouseDown={() => { setPreferredCities(toggleItem(preferredCities, city)); setCityInput(''); setCityHighlight(-1); setCityOpen(false); }}
                                    className={cn('w-full text-left px-4 py-2.5 text-sm font-medium transition-colors first:rounded-t-xl last:rounded-b-xl', cityHighlight === idx ? 'bg-primary/15 text-foreground' : 'hover:bg-muted')}
                                >{city}</button>
                            ))}
                        </div>
                    )}
                </div>
                {preferredCities.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {preferredCities.map(c => (
                            <span key={c} className="bg-secondary border border-border text-foreground px-3 py-1 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 shadow-none">
                                {c}
                                <XMarkIcon onClick={() => setPreferredCities(preferredCities.filter(x => x !== c))} className="w-3 h-3 cursor-pointer opacity-50 hover:opacity-100 transition-opacity" />
                            </span>
                        ))}
                    </div>
                )}
            </Field>

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
                                else if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (skillHighlight >= 0 && filteredSkillOptions[skillHighlight]) {
                                        addSkillValue(filteredSkillOptions[skillHighlight]);
                                    } else {
                                        addSkill();
                                    }
                                }
                                else if (e.key === 'Escape') setSkillOpen(false);
                            }}
                            className="premium-input h-10! text-sm flex-1"
                            placeholder="e.g. React, Node.js, Python"
                        />
                        <button onClick={addSkill} className="w-11 h-11 flex items-center justify-center rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all shrink-0">
                            <PlusIcon className="w-5 h-5" />
                        </button>
                    </div>
                    {skillOpen && skillInput && filteredSkillOptions.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-2xl max-h-52 overflow-y-auto">
                            {filteredSkillOptions.map((skill, idx) => (
                                <button key={skill}
                                    onMouseDown={() => addSkillValue(skill)}
                                    className={cn('w-full text-left px-4 py-2.5 text-sm font-medium transition-colors first:rounded-t-xl last:rounded-b-xl capitalize', skillHighlight === idx ? 'bg-primary/15 text-foreground' : 'hover:bg-muted')}
                                >{skill}</button>
                            ))}
                        </div>
                    )}
                </div>
                <p className="text-[13px] text-muted-foreground mt-1.5">Type to search or press Enter to add.</p>
                {skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                        {skills.map(s => (
                            <span key={s} className="bg-secondary border border-border text-foreground px-3 py-1 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 capitalize">
                                {s}
                                <XMarkIcon onClick={() => removeSkill(s)} className="w-3 h-3 cursor-pointer opacity-50 hover:opacity-100 transition-opacity" />
                            </span>
                        ))}
                    </div>
                )}
            </Field>

            <div className="flex justify-end gap-3 pt-6 border-t border-border/40">
                <button onClick={onSkip} className="px-6 h-11 text-[14px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
                    Skip This
                </button>
                <button
                    onClick={onSubmit}
                    disabled={isLoading}
                    className="px-8 h-11 bg-primary text-primary-foreground rounded-xl font-semibold flex items-center justify-center gap-2 shadow-md hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                >
                    {isLoading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <><CheckCircleIcon className="w-4 h-4" /> Finish Setup</>}
                </button>
            </div>
        </div>
    );
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5 w-full">
            <label className="text-[14px] font-bold text-muted-foreground tracking-normal">{label}</label>
            {children}
        </div>
    );
}
