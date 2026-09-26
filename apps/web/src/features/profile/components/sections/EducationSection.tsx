'use client';

import { useEffect, useRef, useState } from 'react';
import { DIPLOMA_DEGREES, UG_DEGREES, PG_DEGREES, getSpecializations } from '@fresherflow/utils';
import { INDIAN_STATES } from '@fresherflow/constants';
import type { Profile } from '@fresherflow/types';
import {
    buildCollegeSearchUrl,
    buildEducationTimeline,
    COLLEGE_SEARCH_DEBOUNCE_MS,
    COLLEGE_SEARCH_MIN_CHARS,
    type CollegeItem,
} from '@/features/profile/education';
import { Input } from '@/ui/Input';
import { Badge } from '@/ui/Badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/Select';
import { useClickOutside } from '@/hooks/useClickOutside';
import { ProfileSectionCard } from '@/features/profile/components/sections/ProfileSectionCard';
import { SectionFooter, useSectionSave } from '@/features/profile/components/editor/SectionFooter';

/* The state list, the college result shape and the search contract all live in
   `@fresherflow/constants` and `features/profile/education.ts`. This section
   used to declare its own copy of each. */

interface EducationSectionProps {
    profile?: Profile | null;
    tenthYear: string; setTenthYear: (v: string) => void;
    twelfthYear: string; setTwelfthYear: (v: string) => void;
    educationLevel: string; setEducationLevel: (v: string) => void;
    gradCourse: string; setGradCourse: (v: string) => void;
    gradSpecialization: string; setGradSpecialization: (v: string) => void;
    gradYear: string; setGradYear: (v: string) => void;
    collegeId: string; setCollegeId: (v: string) => void;
    collegeName: string; setCollegeName: (v: string) => void;
    collegeState: string; setCollegeState: (v: string) => void;
    hasPG: boolean; setHasPG: (v: boolean) => void;
    pgCourse: string; setPgCourse: (v: string) => void;
    pgSpecialization: string; setPgSpecialization: (v: string) => void;
    pgYear: string; setPgYear: (v: string) => void;
    onSave: () => Promise<boolean>;
    /**
     * Onboarding renders one group per sub-step instead of the whole section
     * at once. Defaults to every group with timeline and footer, which is
     * exactly what the profile editor renders — pass nothing there.
     */
    visibleGroups?: Array<'degree' | 'pg' | 'school'>;
    hideTimeline?: boolean;
    hideFooter?: boolean;
    /** Render fields without card chrome (stepped flows like onboarding). */
    bare?: boolean;
}

/** Passout years as a constrained dropdown — typing 4-digit years (and the
    mobile keyboards that came with them) produced most of the invalid-year
    errors. Newest first. */
const YEAR_OPTIONS: string[] = (() => {
    const max = new Date().getFullYear() + 2;
    const years: string[] = [];
    for (let y = max; y >= 1980; y -= 1) years.push(String(y));
    return years;
})();

function YearField({
    label,
    value,
    onChange,
    placeholder,
    disabled,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    disabled?: boolean;
}) {
    return (
        <FormField label={label}>
            <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
                <SelectTrigger>
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {YEAR_OPTIONS.map((year) => (
                        <SelectItem key={year} value={year}>
                            {year}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </FormField>
    );
}

/** One labelled field, so every control in the form lines up the same way. */
function FormField({
    label,
    htmlFor,
    children,
    className,
}: {
    label: string;
    htmlFor?: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={className}>
            <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-foreground">
                {label}
            </label>
            {children}
        </div>
    );
}

/**
 * Education — the saved record and the fields on one screen.
 *
 * The timeline stays at the top because "what will recruiters see" is the
 * question this section answers; the fields sit directly under it, holding the
 * saved values until you change them. Nothing collapses or reshapes, and one
 * button writes it.
 */
export const EducationSection = ({
    profile,
    tenthYear, setTenthYear,
    twelfthYear, setTwelfthYear,
    educationLevel,
    gradCourse, setGradCourse,
    gradSpecialization, setGradSpecialization,
    gradYear, setGradYear,
    setCollegeId,
    collegeName, setCollegeName,
    collegeState, setCollegeState,
    hasPG,
    pgCourse, setPgCourse,
    pgSpecialization, setPgSpecialization,
    pgYear, setPgYear,
    onSave,
    visibleGroups = ['degree', 'pg', 'school'],
    hideTimeline = false,
    hideFooter = false,
    bare = false,
}: EducationSectionProps) => {
    const { saving, save } = useSectionSave();
    const courseOptions = educationLevel === 'DIPLOMA' ? DIPLOMA_DEGREES : UG_DEGREES;

    const [collegeList, setCollegeList] = useState<CollegeItem[]>([]);
    const [isLoadingColleges, setIsLoadingColleges] = useState(false);
    const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);
    const [collegeHighlight, setCollegeHighlight] = useState(-1);
    const collegeRef = useRef<HTMLDivElement>(null);
    useClickOutside(collegeRef, () => setShowCollegeDropdown(false));

    useEffect(() => {
        const url = buildCollegeSearchUrl(collegeName, collegeState);
        if (!url) {
            setCollegeList([]);
            setIsLoadingColleges(false);
            return;
        }

        // A new keystroke aborts the previous request so fast typing always
        // settles on the latest query's results, never a stale one's.
        const controller = new AbortController();
        setIsLoadingColleges(true);
        const timer = setTimeout(() => {
            fetch(url, { signal: controller.signal })
                .then((res) => (res.ok ? res.json() : []))
                .then((list: CollegeItem[]) => {
                    setCollegeList(list);
                    setIsLoadingColleges(false);
                })
                .catch((err: unknown) => {
                    if (err instanceof DOMException && err.name === 'AbortError') return;
                    setIsLoadingColleges(false);
                });
        }, COLLEGE_SEARCH_DEBOUNCE_MS);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [collegeName, collegeState]);

    const handleSelectCollege = (col: CollegeItem) => {
        setCollegeId(col.id || col.name);
        setCollegeName(col.name);
        if (col.state) setCollegeState(col.state);
        setShowCollegeDropdown(false);
    };

    // Derived in education.ts — the section renders the timeline, it does not
    // decide what goes in it.
    const timeline = buildEducationTimeline(profile ?? null, { collegeName, gradSpecialization });

    const text = (value: unknown) => String(value ?? '');
    // educationLevel is deliberately outside the dirty contract: this section
    // never writes it (no picker, setEducationLevel unused here) — the parent
    // owns it. It is still read below for the diploma course list.
    // hasPG mirrors the hydrate rule (pgCourse present or level PG), so
    // toggling PG intent dirties the form even before PG fields are filled.
    const savedHasPG = Boolean(profile?.pgCourse) || profile?.educationLevel === 'PG';
    const isDirty =
        hasPG !== savedHasPG ||
        text(gradCourse) !== text(profile?.gradCourse) ||
        text(gradSpecialization) !== text(profile?.gradSpecialization) ||
        text(gradYear) !== text(profile?.gradYear) ||
        text(collegeName) !== text(profile?.collegeName) ||
        text(collegeState) !== text(profile?.collegeState) ||
        text(tenthYear) !== text(profile?.tenthYear) ||
        text(twelfthYear) !== text(profile?.twelfthYear) ||
        text(pgCourse) !== text(profile?.pgCourse) ||
        text(pgSpecialization) !== text(profile?.pgSpecialization) ||
        text(pgYear) !== text(profile?.pgYear);

    return (
        <ProfileSectionCard
            title="Education"
            description="Your degree, college and passout year — this is what eligibility filters read."
            bare={bare}
        >
            <form
                className="space-y-6"
                onSubmit={(event) => {
                    event.preventDefault();
                    void save(onSave, 'Education saved.');
                }}
            >
                {timeline.length > 0 && !hideTimeline && (
                    <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Recruiters see
                        </p>
                        <ol className="ml-2 space-y-4 border-l border-border pl-5">
                            {timeline.map((item) => (
                                <li key={`${item.b}-${item.title}`} className="relative">
                                    <span
                                        className="absolute -left-5 top-1.5 h-2.5 w-2.5 -translate-x-1/2 rounded-full bg-primary"
                                        aria-hidden="true"
                                    />
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            {/* div (not p): Badge renders a <div>, and <p> cannot contain <div> */}
                                            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                                                {item.title}
                                                <Badge variant="secondary">{item.b}</Badge>
                                            </div>
                                            {item.sub && <p className="text-xs text-muted-foreground">{item.sub}</p>}
                                        </div>
                                        {item.yr && (
                                            <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                                                {item.yr}
                                            </span>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>
                )}

                {visibleGroups.includes('degree') && (
                <fieldset className="space-y-3">
                    <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Degree &amp; college
                    </legend>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <FormField label="Degree (course)">
                            <Select
                                value={gradCourse || undefined}
                                onValueChange={(val) => {
                                    setGradCourse(val);
                                    setGradSpecialization('');
                                }}
                                disabled={saving}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="e.g. B.Tech" />
                                </SelectTrigger>
                                <SelectContent>
                                    {courseOptions.map((course) => (
                                        <SelectItem key={course} value={course}>
                                            {course}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormField>

                        <FormField label="Field of study">
                            <Select
                                value={gradSpecialization || undefined}
                                onValueChange={setGradSpecialization}
                                disabled={!gradCourse || saving}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Specialization" />
                                </SelectTrigger>
                                <SelectContent>
                                    {getSpecializations(gradCourse).map((specialization) => (
                                        <SelectItem key={specialization} value={specialization}>
                                            {specialization}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormField>

                        <FormField label="College state">
                            <Select
                                value={collegeState || undefined}
                                onValueChange={(state) => {
                                    setCollegeState(state);
                                    setShowCollegeDropdown(true);
                                }}
                                disabled={saving}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select state" />
                                </SelectTrigger>
                                <SelectContent>
                                    {INDIAN_STATES.map((state) => (
                                        <SelectItem key={state} value={state}>
                                            {state}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormField>

                        <FormField label="College / university" className="sm:col-span-2">
                            <div ref={collegeRef}>
                                <Input
                                    value={collegeName}
                                    onChange={(e) => {
                                        setCollegeName(e.target.value);
                                        setShowCollegeDropdown(true);
                                        setCollegeHighlight(-1);
                                    }}
                                    onFocus={() => { setShowCollegeDropdown(true); setCollegeHighlight(-1); }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'ArrowDown') {
                                            e.preventDefault();
                                            setShowCollegeDropdown(true);
                                            setCollegeHighlight((h) => Math.min(h + 1, collegeList.length - 1));
                                        } else if (e.key === 'ArrowUp') {
                                            e.preventDefault();
                                            setCollegeHighlight((h) => Math.max(h - 1, 0));
                                        } else if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (showCollegeDropdown && collegeHighlight >= 0 && collegeList[collegeHighlight]) {
                                                handleSelectCollege(collegeList[collegeHighlight]);
                                            }
                                        } else if (e.key === 'Escape') {
                                            setShowCollegeDropdown(false);
                                        }
                                    }}
                                    placeholder="Type to search — e.g. CBIT, IIT, JNTU"
                                    disabled={saving}
                                    autoComplete="off"
                                    role="combobox"
                                    aria-expanded={showCollegeDropdown}
                                    aria-activedescendant={collegeHighlight >= 0 ? `college-option-${collegeHighlight}` : undefined}
                                />

                                {/* Results flow under the input rather than floating over
                                    the card, so the list is never clipped. */}
                                {showCollegeDropdown && (collegeState || collegeName.trim().length >= COLLEGE_SEARCH_MIN_CHARS) && (
                                    <div className="mt-1 max-h-56 overflow-y-auto rounded-xl border border-border bg-card p-1">
                                        {isLoadingColleges ? (
                                            <p className="p-3 text-center text-xs text-muted-foreground">Searching…</p>
                                        ) : collegeList.length > 0 ? (
                                            <ul>
                                                {collegeList.map((college, index) => (
                                                    <li key={college.id || index} id={`college-option-${index}`} role="option" aria-selected={collegeHighlight === index}>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSelectCollege(college)}
                                                            onMouseEnter={() => setCollegeHighlight(index)}
                                                            className={`flex w-full flex-col gap-0.5 rounded-lg p-2.5 text-left transition-colors ${collegeHighlight === index ? 'bg-muted' : 'hover:bg-muted'}`}
                                                        >
                                                            <span className="text-xs font-semibold leading-snug text-foreground">
                                                                {college.name}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {[college.district, college.type, college.state]
                                                                    .filter(Boolean)
                                                                    .join(' • ')}
                                                            </span>
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : !isLoadingColleges ? (
                                            <p className="p-3 text-center text-xs text-muted-foreground">
                                                No colleges match “{collegeName}”.
                                            </p>
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        </FormField>

                        <YearField label="Graduation year" value={gradYear} onChange={setGradYear} placeholder="e.g. 2025" disabled={saving} />
                    </div>
                </fieldset>
                )}

                {visibleGroups.includes('pg') && (
                <fieldset className="space-y-3 border-t border-border/50 pt-5">
                    <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Postgraduate (optional)
                    </legend>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <FormField label="PG course">
                            <Select value={pgCourse || undefined} onValueChange={setPgCourse} disabled={saving}>
                                <SelectTrigger>
                                    <SelectValue placeholder="e.g. M.Tech" />
                                </SelectTrigger>
                                <SelectContent>
                                    {PG_DEGREES.map((course) => (
                                        <SelectItem key={course} value={course}>
                                            {course}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormField>

                        <FormField label="PG specialization">
                            <Select
                                value={pgSpecialization || undefined}
                                onValueChange={setPgSpecialization}
                                disabled={!pgCourse || saving}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Specialization" />
                                </SelectTrigger>
                                <SelectContent>
                                    {getSpecializations(pgCourse).map((specialization) => (
                                        <SelectItem key={specialization} value={specialization}>
                                            {specialization}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormField>

                        <YearField label="PG passout year" value={pgYear} onChange={setPgYear} placeholder="e.g. 2026" disabled={saving} />
                    </div>
                </fieldset>
                )}

                {visibleGroups.includes('school') && (
                <fieldset className="space-y-3 border-t border-border/50 pt-5">
                    <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        School
                    </legend>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <YearField label="12th / Inter passout year" value={twelfthYear} onChange={setTwelfthYear} placeholder="e.g. 2020" disabled={saving} />
                        <YearField label="10th class passout year" value={tenthYear} onChange={setTenthYear} placeholder="e.g. 2018" disabled={saving} />
                    </div>
                </fieldset>
                )}

                {!hideFooter && <SectionFooter isDirty={isDirty} saving={saving} saveLabel="Save education" />}
            </form>
        </ProfileSectionCard>
    );
};
