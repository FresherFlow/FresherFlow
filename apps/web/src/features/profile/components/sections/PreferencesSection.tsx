'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { OpportunityCategory, type Profile } from '@fresherflow/types';
import { TOP_TECH_HUBS } from '@fresherflow/utils';
import { Input } from '@/ui/Input';
import { Button } from '@/ui/Button';
import { ProfileSectionCard } from '@/features/profile/components/sections/ProfileSectionCard';
import { SectionFooter, useSectionSave } from '@/features/profile/components/editor/SectionFooter';

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
    expectedCtc: string;
    setExpectedCtc: (v: string) => void;
    resumeUrl: string;
    setResumeUrl: (v: string) => void;
    willingToRelocate: boolean;
    setWillingToRelocate: (v: boolean) => void;
    onSave: () => Promise<boolean>;
    /**
     * Onboarding renders one group per sub-step instead of the whole section
     * at once. Defaults to every group with footer — the profile editor
     * passes nothing and renders exactly as before.
     */
    visibleGroups?: Array<'roles' | 'setup' | 'cities' | 'recruiter'>;
    hideFooter?: boolean;
    /** Render fields without card chrome (stepped flows like onboarding). */
    bare?: boolean;
}

/** The three axes of a job preference, in the order they are worth filling in. */
const TARGET_ROLES = [
    { value: OpportunityCategory.EMPLOYMENT, label: 'Jobs' },
    { value: OpportunityCategory.COMPETITION, label: 'Competitions' },
    { value: OpportunityCategory.SCHOLARSHIP, label: 'Scholarships' },
    { value: OpportunityCategory.EDUCATION, label: 'Education' },
    { value: OpportunityCategory.EVENT, label: 'Events' },
];

const WORK_SETUP = [
    { value: 'ONSITE', label: 'Onsite' },
    { value: 'HYBRID', label: 'Hybrid' },
    { value: 'REMOTE', label: 'Remote' },
];

/** Order-insensitive comparison, for "have I changed this list". */
function sameList(a: string[], b: string[]) {
    return a.length === b.length && [...a].sort().join('\u0000') === [...b].sort().join('\u0000');
}

/**
 * Career Preferences.
 *
 * The choices are pill groups that hold their own state, so the section is a
 * form and a read view at the same time: the selected pills are what is saved
 * until you change them. Only "Recruiter details" (expected CTC, resume link,
 * relocation) is typed, and it is part of the same submit.
 */
export function PreferencesSection({
    profile,
    interestedIn, toggleInterestedIn,
    workModes, toggleWorkMode,
    preferredCities, setPreferredCities,
    cityInput, setCityInput, filteredCityOptions,
    addCity, togglePreferredCity,
    expectedCtc, setExpectedCtc,
    resumeUrl, setResumeUrl,
    willingToRelocate, setWillingToRelocate,
    onSave,
    visibleGroups = ['roles', 'setup', 'cities', 'recruiter'],
    hideFooter = false,
    bare = false,
}: PreferencesSectionProps) {
    const { saving, save } = useSectionSave();
    const [cityOpen, setCityOpen] = useState(false);
    const [cityHighlight, setCityHighlight] = useState(-1);
    const cityRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (cityRef.current && !cityRef.current.contains(event.target as Node)) {
                setCityOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const saved = useMemo(() => ({
        interestedIn: profile?.interestedIn ?? [],
        workModes: profile?.workModes ?? [],
        preferredCities: profile?.preferredCities ?? [],
        expectedCtc: profile?.expectedCtc ?? null,
        resumeUrl: profile?.resumeUrl ?? '',
        willingToRelocate: profile?.willingToRelocate !== false,
    }), [profile]);

    const isDirty =
        !sameList(interestedIn, saved.interestedIn) ||
        !sameList(workModes, saved.workModes) ||
        !sameList(preferredCities, saved.preferredCities) ||
        (expectedCtc === '' ? null : Number(expectedCtc)) !== saved.expectedCtc ||
        (resumeUrl.trim() || '') !== (saved.resumeUrl || '') ||
        willingToRelocate !== saved.willingToRelocate;

    const cityOptions = useMemo(() => {
        if (filteredCityOptions.length > 0) return filteredCityOptions;
        if (cityInput.trim()) return [];
        const available = TOP_TECH_HUBS.filter((city) => !preferredCities.includes(city));
        return available.length > 0 ? available : TOP_TECH_HUBS;
    }, [filteredCityOptions, cityInput, preferredCities]);

    const pickCity = (city: string) => {
        togglePreferredCity(city);
        setCityInput('');
        setCityHighlight(-1);
        setCityOpen(false);
    };

    return (
        <ProfileSectionCard title="Career Preferences" description="What you want, and what recruiters need from you." bare={bare}>
            <form
                className="space-y-5"
                onSubmit={(event) => {
                    event.preventDefault();
                    void save(onSave, 'Preferences saved.');
                }}
            >
                {visibleGroups.includes('roles') && (
                <fieldset className="space-y-2">
                    <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Target roles
                    </legend>
                    <div className="flex flex-wrap gap-2">
                        {TARGET_ROLES.map((role) => (
                            <Button
                                key={role.value}
                                type="button"
                                size="sm"
                                variant={interestedIn.includes(role.value) ? 'default' : 'outline'}
                                onClick={() => toggleInterestedIn(role.value)}
                                disabled={saving}
                            >
                                {role.label}
                            </Button>
                        ))}
                    </div>
                </fieldset>
                )}

                {visibleGroups.includes('setup') && (
                <fieldset className="space-y-2">
                    <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Work setup
                    </legend>
                    <div className="flex flex-wrap gap-2">
                        {WORK_SETUP.map((mode) => (
                            <Button
                                key={mode.value}
                                type="button"
                                size="sm"
                                variant={workModes.includes(mode.value) ? 'default' : 'outline'}
                                onClick={() => toggleWorkMode(mode.value)}
                                disabled={saving}
                            >
                                {mode.label}
                            </Button>
                        ))}
                    </div>
                </fieldset>
                )}

                {visibleGroups.includes('cities') && (
                <div className="space-y-2" ref={cityRef}>
                    <label htmlFor="preferred-city" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Target cities
                    </label>
                    <div className="flex gap-2">
                        <Input
                            id="preferred-city"
                            value={cityInput}
                            onChange={(e) => {
                                setCityInput(e.target.value);
                                setCityHighlight(-1);
                                setCityOpen(true);
                            }}
                            onFocus={() => {
                                setCityOpen(true);
                                setCityHighlight(-1);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setCityHighlight((h) => Math.min(h + 1, cityOptions.length - 1));
                                } else if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setCityHighlight((h) => Math.max(h - 1, 0));
                                } else if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (cityOpen && cityHighlight >= 0 && cityOptions[cityHighlight]) pickCity(cityOptions[cityHighlight]);
                                    else if (addCity().ok) setCityOpen(false);
                                } else if (e.key === 'Escape') {
                                    setCityOpen(false);
                                }
                            }}
                            disabled={saving}
                            placeholder="Search city…"
                            autoComplete="off"
                        />
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                if (addCity().ok) setCityOpen(false);
                            }}
                            disabled={saving}
                            aria-label="Add city"
                        >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                        </Button>
                    </div>

                    {/* Suggestions render in the flow of the form, not as a floating
                        layer: nothing overlaps, nothing needs to escape a card. */}
                    {cityOpen && cityOptions.length > 0 && (
                        <ul className="max-h-40 overflow-y-auto rounded-xl border border-border bg-card p-1">
                            {cityOptions.map((city, index) => (
                                <li key={city}>
                                    <button
                                        type="button"
                                        onMouseDown={() => pickCity(city)}
                                        className={`w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${
                                            cityHighlight === index ? 'bg-muted' : 'hover:bg-muted'
                                        }`}
                                    >
                                        {city}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}

                    {preferredCities.length > 0 && (
                        <ul className="flex flex-wrap gap-2 pt-1">
                            {preferredCities.map((city) => (
                                <li
                                    key={city}
                                    className="flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                                >
                                    {city}
                                    <button
                                        type="button"
                                        onClick={() => setPreferredCities((prev) => (Array.isArray(prev) ? prev.filter((c) => c !== city) : []))}
                                        disabled={saving}
                                        aria-label={`Remove ${city}`}
                                    >
                                        <X className="h-3 w-3" aria-hidden="true" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
                )}

                {/* Recruiters read these next to your other preferences, and they
                    save together — this is the one place either is edited. */}
                {visibleGroups.includes('recruiter') && (
                <div className="space-y-4 border-t border-border/50 pt-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Recruiter details
                    </h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label htmlFor="expected-ctc" className="text-xs font-medium text-foreground">
                                Expected CTC (LPA)
                            </label>
                            <Input
                                id="expected-ctc"
                                value={expectedCtc}
                                onChange={(e) => setExpectedCtc(e.target.value.replace(/[^0-9]/g, ''))}
                                placeholder="6"
                                inputMode="numeric"
                                disabled={saving}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="resume-url" className="text-xs font-medium text-foreground">
                                Resume link
                            </label>
                            <Input
                                id="resume-url"
                                type="url"
                                value={resumeUrl}
                                onChange={(e) => setResumeUrl(e.target.value)}
                                placeholder="https://drive.google.com/…"
                                disabled={saving}
                            />
                        </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-foreground">
                        <input
                            type="checkbox"
                            checked={willingToRelocate}
                            onChange={(e) => setWillingToRelocate(e.target.checked)}
                            disabled={saving}
                            className="h-4 w-4 rounded border-border accent-primary"
                        />
                        Willing to relocate
                    </label>
                </div>
                )}

                {!hideFooter && <SectionFooter isDirty={isDirty} saving={saving} saveLabel="Save preferences" />}
            </form>
        </ProfileSectionCard>
    );
}
