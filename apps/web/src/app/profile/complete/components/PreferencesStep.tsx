import React, { RefObject } from 'react';
import { cn } from '@repo/ui/utils/cn';
import { OPPORTUNITY_TYPES, WORK_MODES } from '@fresherflow/domain';
import { Button } from '@/features/system/components/ui/Button';
import { Input } from '@/features/system/components/ui/Input';
import { ArrowPathIcon, ArrowRightIcon, XMarkIcon } from '@heroicons/react/24/outline';

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
    isLoading: boolean;
    onSubmit: () => void;
    onSkip: () => void;
}

export const PreferencesStep = ({
    interestedIn,
    setInterestedIn,
    workModes,
    setWorkModes,
    preferredCities,
    setPreferredCities,
    cityInput,
    setCityInput,
    cityOpen,
    setCityOpen,
    cityHighlight,
    setCityHighlight,
    filteredCityOptions,
    toggleItem,
    cityRef,
    isLoading,
    onSubmit,
    onSkip
}: PreferencesStepProps) => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-3 duration-300">
            <Field label="Looking for">
                <div className="flex flex-wrap gap-2 mt-1">
                    {OPPORTUNITY_TYPES.map(t => (
                        <button key={t} onClick={() => setInterestedIn(toggleItem(interestedIn, t))}
                            className={cn('px-4 h-9 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all',
                                interestedIn.includes(t) ? 'bg-primary border-primary text-primary-foreground shadow-md' : 'bg-muted/50 border-border text-muted-foreground hover:border-primary/40')}
                        >{t}</button>
                    ))}
                </div>
            </Field>

            <Field label="Work Mode">
                <div className="flex flex-wrap gap-2 mt-1">
                    {WORK_MODES.map(t => (
                        <button key={t} onClick={() => setWorkModes(toggleItem(workModes, t))}
                            className={cn('px-4 h-9 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all',
                                workModes.includes(t) ? 'bg-primary border-primary text-primary-foreground shadow-md' : 'bg-muted/50 border-border text-muted-foreground hover:border-primary/40')}
                        >{t}</button>
                    ))}
                </div>
            </Field>

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
                        <Button variant="outline" className="h-10 px-4 text-xs font-bold uppercase tracking-wider shrink-0"
                            onClick={() => { if (cityInput.trim()) { setPreferredCities(toggleItem(preferredCities, cityInput.trim())); setCityInput(''); setCityOpen(false); } }}>
                            Add
                        </Button>
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
                            <span key={c} className="bg-primary text-primary-foreground px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                {c}
                                <XMarkIcon onClick={() => setPreferredCities(preferredCities.filter(x => x !== c))} className="w-3 h-3 cursor-pointer opacity-70 hover:opacity-100" />
                            </span>
                        ))}
                    </div>
                )}
            </Field>

            <div className="flex gap-3">
                <Button onClick={onSubmit} disabled={isLoading} className="flex-1 h-11 font-bold flex items-center justify-center gap-2">
                    {isLoading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <>Save & Continue <ArrowRightIcon className="w-4 h-4" /></>}
                </Button>
                <Button variant="outline" onClick={onSkip} className="h-11 px-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Skip
                </Button>
            </div>
        </div>
    );
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5 w-full">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</label>
            {children}
        </div>
    );
}






