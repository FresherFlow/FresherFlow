'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { PlusIcon, XMarkIcon, PencilSquareIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Profile } from '@fresherflow/types';
import { TOP_TECH_HUBS } from '@fresherflow/domain';
import { Input } from '@/ui/Input';
import { Button } from '@/ui/Button';

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
    filteredCityOptions: string[];
    addCity: () => { ok: boolean; reason?: string };
    togglePreferredCity: (city: string) => { ok: boolean; reason?: string };
    isEditing: boolean;
    onToggleEdit: () => void;
    onSave: () => void;
    saving: boolean;
}

const TARGET_ROLES = [
    { value: 'JOB', label: 'Job' },
    { value: 'INTERNSHIP', label: 'Internship' },
    { value: 'WALKIN', label: 'Walk-In' }
];

const WORK_SETUP = [
    { value: 'ONSITE', label: 'Onsite' },
    { value: 'HYBRID', label: 'Hybrid' },
    { value: 'REMOTE', label: 'Remote' }
];

export const PreferencesSection = ({
    profile, interestedIn, toggleInterestedIn, workModes, toggleWorkMode,
    preferredCities, setPreferredCities, cityInput, setCityInput,
    filteredCityOptions, addCity, togglePreferredCity,
    isEditing, onToggleEdit, onSave, saving
}: PreferencesSectionProps) => {
    const [cityHighlight, setCityHighlight] = useState(-1);
    const [cityOpen, setCityOpen] = useState(false);
    const cityRef = React.useRef<HTMLDivElement>(null);
    
    // Auto-close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (cityRef.current && !cityRef.current.contains(event.target as Node)) {
                setCityOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const hasRoles = Boolean(profile?.interestedIn && profile.interestedIn.length > 0);
    const hasModes = Boolean(profile?.workModes && profile.workModes.length > 0);
    const hasCities = Boolean(profile?.preferredCities && profile.preferredCities.length > 0);
    const hasPrefs = hasRoles || hasModes || hasCities;

    const effectiveCityOptions = useMemo(() => {
        if (filteredCityOptions && filteredCityOptions.length > 0) {
            return filteredCityOptions;
        }
        if (!cityInput.trim()) {
            const available = TOP_TECH_HUBS.filter(c => !preferredCities.includes(c));
            return available.length > 0 ? available : TOP_TECH_HUBS;
        }
        return [];
    }, [filteredCityOptions, cityInput, preferredCities]);

    return (
        <div className="w-full bg-card rounded-xl border border-border/60 shadow-sm p-5">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-foreground">Career Preferences</h3>
                {!isEditing && (
                    <Button variant="ghost" size="sm" onClick={onToggleEdit} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                        {hasPrefs ? <PencilSquareIcon className="w-4 h-4" /> : <PlusIcon className="w-4 h-4" />}
                    </Button>
                )}
            </div>

            {hasPrefs ? (
                <div className="space-y-4">
                    {hasRoles && (
                        <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Target Roles</h4>
                            <div className="flex flex-wrap gap-2">
                                {profile?.interestedIn.map(role => (
                                    <span key={role} className="px-2.5 py-1 bg-muted border border-border rounded-md text-xs font-medium text-foreground capitalize">
                                        {role === 'WALKIN' ? 'Walk-In' : role.toLowerCase()}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    {hasModes && (
                        <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Work Setup</h4>
                            <div className="flex flex-wrap gap-2">
                                {profile?.workModes.map(mode => (
                                    <span key={mode} className="px-2.5 py-1 bg-muted border border-border rounded-md text-xs font-medium text-foreground capitalize">
                                        {mode.toLowerCase()}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    {hasCities && (
                        <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Target Cities</h4>
                            <div className="flex flex-wrap gap-2">
                                {profile?.preferredCities.map(city => (
                                    <span key={city} className="px-2.5 py-1 bg-muted border border-border rounded-md text-xs font-medium text-foreground capitalize">{city.toLowerCase()}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : null}

            {isEditing && (
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Target Roles</label>
                        <div className="flex flex-wrap gap-2">
                            {TARGET_ROLES.map(role => (
                                <button
                                    key={role.value} type="button" onClick={() => toggleInterestedIn(role.value)} disabled={saving}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border cursor-pointer ${interestedIn.includes(role.value) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted text-muted-foreground border-border hover:border-primary/40'}`}
                                >
                                    {role.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Work Setup</label>
                        <div className="flex flex-wrap gap-2">
                            {WORK_SETUP.map(mode => (
                                <button
                                    key={mode.value} type="button" onClick={() => toggleWorkMode(mode.value)} disabled={saving}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border cursor-pointer ${workModes.includes(mode.value) ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-muted text-muted-foreground border-border hover:border-primary/40'}`}
                                >
                                    {mode.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Target Cities</label>
                        <div className="relative flex gap-2" ref={cityRef}>
                            <Input
                                value={cityInput}
                                className="h-9 text-sm"
                                onChange={e => { setCityInput(e.target.value); setCityHighlight(-1); setCityOpen(true); }}
                                onFocus={() => { setCityOpen(true); setCityHighlight(-1); }}
                                onKeyDown={e => {
                                    if (e.key === 'ArrowDown') { e.preventDefault(); setCityHighlight(h => Math.min(h + 1, effectiveCityOptions.length - 1)); }
                                    else if (e.key === 'ArrowUp') { e.preventDefault(); setCityHighlight(h => Math.max(h - 1, 0)); }
                                    else if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (cityHighlight >= 0 && effectiveCityOptions[cityHighlight]) { togglePreferredCity(effectiveCityOptions[cityHighlight]); setCityInput(''); setCityHighlight(-1); setCityOpen(false); }
                                        else { const res = addCity(); if (res.ok) setCityOpen(false); }
                                    }
                                    else if (e.key === 'Escape') setCityOpen(false);
                                }}
                                disabled={saving}
                                placeholder="Search city..."
                            />
                            <Button onClick={() => { const res = addCity(); if (res.ok) setCityOpen(false); }} type="button" disabled={saving} variant="outline" className="h-9 w-9 shrink-0 p-0"><PlusIcon className="w-4 h-4" /></Button>
                            {cityOpen && effectiveCityOptions.length > 0 && (
                                <div className="absolute z-20 left-0 right-10 top-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-40 overflow-y-auto p-1">
                                    {effectiveCityOptions.map((city, idx) => (
                                        <button
                                            key={city} type="button" onMouseDown={() => { togglePreferredCity(city); setCityInput(''); setCityHighlight(-1); setCityOpen(false); }}
                                            className={`w-full text-left px-3 py-1.5 text-sm rounded-lg cursor-pointer ${cityHighlight === idx ? 'bg-muted' : 'hover:bg-muted'}`}
                                        >
                                            {city}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {preferredCities.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                                {preferredCities.map(city => (
                                    <span key={city} className="flex items-center gap-1 bg-primary/10 text-primary px-2.5 py-1 rounded-lg text-xs font-medium border border-primary/20">
                                        {city}
                                        <button type="button" onClick={() => setPreferredCities(prev => (Array.isArray(prev) ? prev.filter(c => c !== city) : []))} className="text-primary/70 hover:text-primary cursor-pointer"><XMarkIcon className="w-3 h-3" /></button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 pt-2 border-t border-border/40">
                        <Button variant="outline" size="sm" onClick={onToggleEdit} disabled={saving}>Cancel</Button>
                        <Button size="sm" onClick={onSave} disabled={saving}><CheckIcon className="w-3.5 h-3.5 mr-1" />Save</Button>
                    </div>
                </div>
            )}
        </div>
    );
};
