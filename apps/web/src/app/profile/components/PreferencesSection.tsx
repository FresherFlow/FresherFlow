import React, { RefObject } from 'react';
import { CompactSection, Field } from '@/features/profile/components/ProfileSection';
import { OPPORTUNITY_TYPES, WORK_MODES } from '@fresherflow/domain';
import { cn } from '@repo/ui/utils/cn';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import { Profile } from '@fresherflow/types';

interface PreferencesSectionProps {
    profile?: Profile | null;
    interestedIn: string[];
    toggleInterestedIn: (item: string) => void;
    workModes: string[];
    toggleWorkMode: (item: string) => void;
    preferredCities: string[];
    setPreferredCities: (v: string[] | ((prev: string[]) => string[])) => void;
    cityInput: string;
    setCityInput: (v: string) => void;
    cityOpen: boolean;
    setCityOpen: (v: boolean) => void;
    filteredCityOptions: string[];
    addCity: () => void;
    togglePreferredCity: (city: string) => { ok: boolean; reason?: string };
    cityRef: RefObject<HTMLDivElement | null>;
    isEditing: boolean;
    onToggleEdit: () => void;
    onSave: () => void;
    saving: boolean;
}

export const PreferencesSection = ({
    profile,
    interestedIn,
    toggleInterestedIn,
    workModes,
    toggleWorkMode,
    preferredCities,
    setPreferredCities,
    cityInput,
    setCityInput,
    cityOpen,
    setCityOpen,
    filteredCityOptions,
    addCity,
    togglePreferredCity,
    cityRef,
    isEditing,
    onToggleEdit,
    onSave,
    saving
}: PreferencesSectionProps) => {
    return (
        <CompactSection
            title="Job Preferences"
            onSave={onSave}
            saving={saving}
            isEditing={isEditing}
            onToggleEdit={onToggleEdit}
            viewContent={
                <div className="space-y-4">
                    <div>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Goal</p>
                        <div className="flex flex-wrap gap-1.5">
                            {profile?.interestedIn?.map(t => <span key={t} className="bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{t}</span>)}
                        </div>
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Work Modes</p>
                        <div className="flex flex-wrap gap-1.5">
                            {profile?.workModes?.map(m => <span key={m} className="bg-muted border border-border px-2 py-0.5 rounded text-[10px] font-bold uppercase">{m}</span>)}
                        </div>
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Cities</p>
                        <div className="flex flex-wrap gap-1.5">
                            {profile?.preferredCities?.length ? profile.preferredCities.map(c => (
                                <span key={c} className="bg-muted px-2 py-1 rounded text-xs font-medium border border-border flex items-center gap-1"><MapPinIcon className="w-3 h-3 opacity-60" /> {c}</span>
                            )) : <span className="text-xs text-muted-foreground italic">Remote / Open</span>}
                        </div>
                    </div>
                </div>
            }
        >
            <div className="space-y-4">
                <Field label="Looking For">
                    <div className="flex flex-wrap gap-2">
                        {OPPORTUNITY_TYPES.map(type => (
                            <button key={type} onClick={() => toggleInterestedIn(type)}
                                className={cn('px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all',
                                    interestedIn.includes(type) ? 'bg-foreground text-background border-foreground shadow' : 'bg-card hover:bg-muted text-muted-foreground border-border/80')}>
                                {type}
                            </button>
                        ))}
                    </div>
                </Field>
                <Field label="Work Setup">
                    <div className="flex flex-wrap gap-2">
                        {WORK_MODES.map(mode => (
                            <button key={mode} onClick={() => toggleWorkMode(mode)}
                                className={cn('px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all',
                                    workModes.includes(mode) ? 'bg-foreground text-background border-foreground shadow' : 'bg-card hover:bg-muted text-muted-foreground border-border/80')}>
                                {mode}
                            </button>
                        ))}
                    </div>
                </Field>
                <Field label="Target Cities">
                    <div className="relative" ref={cityRef}>
                        <div className="flex gap-2 mb-2">
                            <input type="text" value={cityInput} onChange={e => { setCityInput(e.target.value); setCityOpen(true); }} onFocus={() => setCityOpen(true)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCity(); } else if (e.key === 'Escape') setCityOpen(false); }} className="premium-input text-sm h-11 md:h-10 flex-1" placeholder="Add locality..." />
                            <button onClick={addCity} className="w-11 h-11 md:w-10 md:h-10 flex items-center justify-center rounded-lg border border-border bg-card hover:bg-muted shadow-sm">
                                <PlusIcon className="w-4 h-4 text-foreground/80" />
                            </button>
                        </div>
                        {cityOpen && cityInput && filteredCityOptions.length > 0 && (
                            <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                {filteredCityOptions.map(city => (
                                    <button key={city} onMouseDown={() => {
                                        togglePreferredCity(city);
                                        // result check handled in parent or here via toast if we want to pass toast
                                        setCityInput('');
                                        setCityOpen(false);
                                    }} className="w-full text-left px-3 py-2 hover:bg-muted transition-colors text-sm font-medium border-b border-border/40 last:border-0">
                                        {city}
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="flex flex-wrap gap-1.5">
                            {preferredCities.map(city => (
                                <span key={city} className="flex items-center gap-1 bg-foreground/5 px-2 py-1 rounded-md text-[11px] font-semibold border border-foreground/10 uppercase tracking-wide">
                                    {city}
                                    <button onClick={() => setPreferredCities(prev => (Array.isArray(prev) ? prev.filter(c => c !== city) : []))} className="text-foreground/50 hover:text-destructive"><XMarkIcon className="w-3 h-3" /></button>
                                </span>
                            ))}
                        </div>
                    </div>
                </Field>
            </div>
        </CompactSection>
    );
};






