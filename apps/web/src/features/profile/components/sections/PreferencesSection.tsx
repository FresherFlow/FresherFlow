'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Plus, X } from 'lucide-react';
import { OpportunityCategory, type Profile } from '@fresherflow/types';
import { TOP_TECH_HUBS } from '@fresherflow/utils';
import { Input } from '@/ui/Input';
import { Button } from '@/ui/Button';
import { cn } from '@/ui/cn';
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

/** One setup at a time — the picker is a radio group, in the order asked. */
const WORK_SETUP = [
    { value: 'REMOTE', label: 'Remote' },
    { value: 'HYBRID', label: 'Hybrid' },
    { value: 'ONSITE', label: 'Onsite' },
];

/** Order-insensitive comparison, for "have I changed this list". */
function sameList(a: string[], b: string[]) {
    return a.length === b.length && [...a].sort().join('\u0000') === [...b].sort().join('\u0000');
}

/**
 * One question, one bordered block.
 *
 * A real `fieldset`/`legend` pair, so the question is both the visible label
 * and the programmatic name of everything inside it — and a stepped flow can
 * drop a single card without leaving an unlabelled pile of fields behind.
 */
function QuestionCard({
    legend,
    className,
    children,
}: {
    legend: string;
    className?: string;
    children: ReactNode;
}) {
    return (
        <fieldset className={cn('rounded-xl border border-border bg-card p-4 sm:p-5', className)}>
            <legend className="px-1 text-sm font-semibold text-foreground">{legend}</legend>
            <div className="mt-3">{children}</div>
        </fieldset>
    );
}

/**
 * Career Preferences.
 *
 * Four independent question cards — what you want, how you work, where, and
 * what you expect — each one self-contained, so onboarding can show a subset
 * and the editor can show all of them in the same order.
 *
 * The choices hold their own state, so the section is a form and a read view
 * at the same time: the selected pills and the checked radio are what get
 * saved until you change them. Recruiter details (expected CTC, resume link,
 * relocation) are typed, and they save with the rest in the same submit.
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

    // A radiogroup may only report one checked option, so the group shows the
    // first saved setup. `toggleWorkMode` cannot clear a sibling in the same
    // tick — the parent rebuilds the list from one snapshot — so a profile
    // that already holds several setups still saves them all.
    const selectedMode = WORK_SETUP.find((mode) => workModes.includes(mode.value))?.value ?? '';

    return (
        <ProfileSectionCard title="Career Preferences" description="Just a few quick questions." bare={bare}>
            <form
                className="space-y-4"
                onSubmit={(event) => {
                    event.preventDefault();
                    void save(onSave, 'Preferences saved.');
                }}
            >
                {visibleGroups.includes('roles') && (
                <QuestionCard legend="Which roles interest you?">
                    <div className="flex flex-wrap gap-2">
                        {TARGET_ROLES.map((role) => {
                            const selected = interestedIn.includes(role.value);
                            return (
                                <Button
                                    key={role.value}
                                    type="button"
                                    size="sm"
                                    variant={selected ? 'default' : 'outline'}
                                    aria-pressed={selected}
                                    onClick={() => toggleInterestedIn(role.value)}
                                    disabled={saving}
                                >
                                    {role.label}
                                </Button>
                            );
                        })}
                    </div>
                </QuestionCard>
                )}

                {visibleGroups.includes('setup') && (
                <QuestionCard legend="Work preference">
                    <div role="radiogroup" aria-label="Work preference" className="space-y-2">
                        {WORK_SETUP.map((mode) => {
                            const selected = selectedMode === mode.value;
                            return (
                                <label
                                    key={mode.value}
                                    className={cn(
                                        'flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors',
                                        selected
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border bg-card hover:bg-muted/50',
                                    )}
                                >
                                    <input
                                        type="radio"
                                        name="work-mode"
                                        value={mode.value}
                                        checked={selected}
                                        onChange={() => toggleWorkMode(mode.value)}
                                        disabled={saving}
                                        className="h-4 w-4 shrink-0 accent-primary"
                                    />
                                    <span className="text-sm font-medium text-foreground">{mode.label}</span>
                                </label>
                            );
                        })}
                    </div>
                </QuestionCard>
                )}

                {visibleGroups.includes('cities') && (
                <QuestionCard legend="Preferred locations">
                    <div className="space-y-3" ref={cityRef}>
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
                                placeholder="Enter cities…"
                                aria-label="Preferred locations"
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
                                            className={cn(
                                                'w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors',
                                                cityHighlight === index ? 'bg-muted' : 'hover:bg-muted',
                                            )}
                                        >
                                            {city}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {preferredCities.length > 0 && (
                            <ul className="flex flex-wrap gap-2">
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
                </QuestionCard>
                )}

                {/* Recruiters read these next to your other preferences, and they
                    save together — this is the one place either is edited. */}
                {visibleGroups.includes('recruiter') && (
                <>
                    <QuestionCard legend="Expected salary (LPA)">
                        <Input
                            id="expected-ctc"
                            value={expectedCtc}
                            onChange={(e) => setExpectedCtc(e.target.value.replace(/[^0-9]/g, ''))}
                            placeholder="e.g. 12"
                            inputMode="numeric"
                            disabled={saving}
                        />
                    </QuestionCard>

                    <QuestionCard legend="Resume link">
                        <Input
                            id="resume-url"
                            type="url"
                            value={resumeUrl}
                            onChange={(e) => setResumeUrl(e.target.value)}
                            placeholder="https://drive.google.com/…"
                            disabled={saving}
                        />
                    </QuestionCard>

                    <QuestionCard legend="Willing to relocate">
                        <label className="flex cursor-pointer items-center gap-3 text-sm text-foreground">
                            <input
                                type="checkbox"
                                checked={willingToRelocate}
                                onChange={(e) => setWillingToRelocate(e.target.checked)}
                                disabled={saving}
                                className="h-4 w-4 shrink-0 accent-primary"
                            />
                            Open to roles in another city
                        </label>
                    </QuestionCard>
                </>
                )}

                {!hideFooter && <SectionFooter isDirty={isDirty} saving={saving} saveLabel="Save preferences" />}
            </form>
        </ProfileSectionCard>
    );
}
