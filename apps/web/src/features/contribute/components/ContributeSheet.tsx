'use client';
/* eslint-disable shadcn/no-arbitrary-values, shadcn/no-unknown-classes, shadcn/no-restyle, shadcn/require-static-classes, shadcn/no-raw-colors */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { communityApi } from '@/features/contribute/api/contributions';
import type { MySubmissionItem, WorkMode } from '@fresherflow/types';
import { useAuth } from '@/lib/auth/AuthContext';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/ui/Sheet';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { Badge } from '@/ui/Badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/Select';
import { SuggestInput } from '@/ui/SuggestInput';

export type ContributeType = 'JOB' | 'WALKIN' | 'INTERVIEW_EXPERIENCE';

type SubmitOutcome =
    | { kind: 'created'; slug: string }
    | { kind: 'existing'; slug: string }
    | { kind: 'iex' }
    | null;

const csv = (v: string) =>
    v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 30);

const numOrNull = (v: string) => {
    if (v.trim() === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
};

function extractOpportunitySlug(input: string): { slug: string; error: string | null } {
    const raw = input.trim();
    if (!raw) return { slug: '', error: null };

    if (raw.includes('://') || raw.startsWith('www.')) {
        try {
            const urlStr = raw.startsWith('www.') ? `https://${raw}` : raw;
            const url = new URL(urlStr);
            const validHosts = ['fresherflow.in', 'www.fresherflow.in', 'fresherflow.in'];
            const isAllowed = validHosts.some((h) => url.hostname === h || url.hostname.endsWith('.' + h));
            if (!isAllowed) {
                return { slug: '', error: 'Only fresherflow.in links are allowed.' };
            }
            const parts = url.pathname.split('/').filter(Boolean);
            const slug = parts.length ? parts[parts.length - 1] : '';
            if (!slug) return { slug: '', error: 'Could not extract slug from URL.' };
            return { slug, error: null };
        } catch {
            return { slug: '', error: 'Invalid URL format.' };
        }
    }

    if (raw.startsWith('/jobs/') || raw.startsWith('/govt/')) {
        const parts = raw.split('/').filter(Boolean);
        const slug = parts.length ? parts[parts.length - 1] : '';
        return { slug, error: null };
    }

    const parts = raw.split('/').filter(Boolean);
    return { slug: parts.length ? parts[parts.length - 1] : raw, error: null };
}

const TYPE_META: Record<ContributeType, { title: string; description: string }> = {
    JOB: {
        title: 'Share a job or internship',
        description: 'Paste the official link. A moderator reviews it before it goes live.',
    },
    WALKIN: {
        title: 'Share a walk-in drive',
        description: 'Direct hiring drive with a date and venue. Reviewed before it goes live.',
    },
    INTERVIEW_EXPERIENCE: {
        title: 'Share an interview experience',
        description: 'Help your batch know what to expect: rounds, questions, result.',
    },
};

const inputClass =
    'min-h-11 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30';

// ONE field-height rule: every text control is 44px (h-11). Inputs get it
// from the Input primitive (ui/Input.tsx h-11); textareas get it here via
// min-h-11; Radix triggers get it via selectTriggerClass below (their
// shadcn default is h-9 and Select.tsx is outside this file's ownership).
// Never add per-field heights — fix the system, not the instance.
const selectTriggerClass = 'h-11 rounded-xl px-4 text-sm';

const labelClass = 'text-[13px] font-medium text-foreground';

const sectionHeadingClass = 'text-[13px] font-semibold text-foreground';

// ─── Client-side validation helpers (mirror API limits, keys frozen) ─────────

function isValidHttpUrl(v: string): boolean {
    try {
        const u = new URL(v);
        return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.includes('.');
    } catch {
        return false;
    }
}

function todayLocalISO(): string {
    const d = new Date();
    const m = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
}

// fieldError key → element id, in the order the form reads. Drives
// scroll-to-first-error without touching the frozen payload keys
// (drive pickers surface under dateRange/timeRange).
const FIELD_ELEMENT_ID: Record<string, string> = {
    sourceUrl: 'cs-sourceUrl',
    opportunitySlug: 'cs-iex-opp',
    title: 'cs-title',
    iexRole: 'cs-iex-role',
    dateRange: 'cs-driveStartDate',
    timeRange: 'cs-driveStartTime',
            venueAddress: 'cs-venueAddress',
            salaryMax: 'cs-salaryMax',
    experienceMax: 'cs-experienceMax',
    experienceMin: 'cs-experienceMin',
    allowedPassoutYears: 'cs-allowedPassoutYears',
    expiresAt: 'cs-expiresAt',
    iexBatch: 'cs-iex-batch',
    rounds: 'cs-iex-round-0-name',
};

const FIELD_ERROR_ORDER = [
    'sourceUrl',
    'opportunitySlug',
    'title',
    'iexRole',
    'dateRange',
    'timeRange',
    'venueAddress',
    'salaryMax',
    'experienceMin',
    'experienceMax',
    'allowedPassoutYears',
    'expiresAt',
    'iexBatch',
    'rounds',
];

function scrollToFirstError(errors: Record<string, string>) {
    if (typeof document === 'undefined') return;
    const ordered = [
        ...FIELD_ERROR_ORDER.filter((k) => errors[k]),
        ...Object.keys(errors).filter((k) => !FIELD_ERROR_ORDER.includes(k)),
    ];
    const first = ordered[0];
    if (!first) return;
    const el = document.getElementById(FIELD_ELEMENT_ID[first] ?? '');
    if (!el) return;
    el.scrollIntoView({ block: 'center' });
    (el as HTMLElement).focus?.({ preventScroll: true });
}

// Pure client string parsing — no fetch, no endpoint. Skips ATS / job-board
// hosts (lever, greenhouse, …) where the hostname is the platform, not the
// hirer, and generic TLD-second-levels (co in acme.co.uk).
const ATS_HOSTS = new Set([
    'lever',
    'greenhouse',
    'workday',
    'myworkday',
    'jobvite',
    'bamboohr',
    'ashby',
    'workable',
    'smartrecruiters',
    'icims',
    'taleo',
    'successfactors',
    'zoho',
    'naukri',
    'linkedin',
    'indeed',
    'foundit',
    'internshala',
    'cutshort',
]);

function guessCompanyFromUrl(raw: string): string {
    const v = (raw ?? '').trim();
    if (!v || v.length > 2000 || (!v.includes('://') && !v.startsWith('www.'))) return '';
    try {
        const url = new URL(v.startsWith('www.') ? `https://${v}` : v);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
        const parts = url.hostname.replace(/^www\./i, '').toLowerCase().split('.').filter(Boolean);
        if (parts.length === 0) return '';
        const secondLevelSuffix = new Set(['co', 'com', 'org', 'net', 'gov', 'edu', 'ac', 'io', 'dev']);
        const candidate =
            parts.length >= 3 && secondLevelSuffix.has(parts[parts.length - 2])
                ? parts[parts.length - 3]
                : parts.length >= 2
                  ? parts[parts.length - 2]
                  : parts[0];
        if (!candidate || ATS_HOSTS.has(candidate)) return '';
        return candidate
            .split('-')
            .filter(Boolean)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ');
    } catch {
        return '';
    }
}

function FieldError({ id, message }: { id: string; message?: string }) {
    if (!message) return null;
    return (
        <p id={id} className="text-xs font-medium text-destructive">
            {message}
        </p>
    );
}

// ─── Draft persistence ───────────────────────────────────────────────────────

const DRAFT_KEY = 'fresherflow:contribute-draft:v1';

function readDraft(type: ContributeType): Record<string, string> | null {
    if (typeof window === 'undefined') return null;
    try {
        const all = JSON.parse(window.localStorage.getItem(DRAFT_KEY) ?? '{}');
        return (all[type] as Record<string, string> | undefined) ?? null;
    } catch {
        return null;
    }
}

// A draft counts only when at least one field holds non-blank text. Without
// this, typing one character and deleting it saves `{field: ''}` — keys
// exist but the form is empty — and the sheet nags "Resume your draft?"
// forever for a form the user never filled.
function isBlankDraft(data: Record<string, string> | null | undefined): boolean {
    if (!data) return true;
    return !Object.values(data).some((v) => (v ?? '').trim() !== '');
}

function stripBlankDraft(data: Record<string, string>): Record<string, string> {
    return Object.fromEntries(Object.entries(data).filter(([, v]) => (v ?? '').trim() !== ''));
}

function writeDraft(type: ContributeType, data: Record<string, string> | null) {
    if (typeof window === 'undefined') return;
    try {
        const all = JSON.parse(window.localStorage.getItem(DRAFT_KEY) ?? '{}');
        if (data && !isBlankDraft(data)) {
            all[type] = stripBlankDraft(data);
        } else {
            delete all[type];
        }
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(all));
    } catch {
        // storage unavailable - drafts silently degrade to no-op
    }
}

type HasDraft = { hasDraft: boolean; clearDraft: () => void; restoreDraft: () => Record<string, string> | null };

function useDraft(type: ContributeType | null): HasDraft {
    const hasDraftRef = useRef(false);
    const [hasDraft, setHasDraft] = useState(false);

    useEffect(() => {
        if (!type) {
            setHasDraft(false);
            return;
        }
        const draft = readDraft(type);
        hasDraftRef.current = Boolean(draft) && !isBlankDraft(draft);
        setHasDraft(hasDraftRef.current);
    }, [type]);

    const clearDraft = useCallback(() => {
        if (type) writeDraft(type, null);
        setHasDraft(false);
    }, [type]);

    const restoreDraft = useCallback(() => (type ? readDraft(type) : null), [type]);

    return { hasDraft: hasDraft && hasDraftRef.current, clearDraft, restoreDraft };
}

// ─── Optional grouped fields (shared by JOB + WALKIN, inside <details>) ──────

function AdditionalDetails({
    values,
    setValue,
    fieldErrors,
    isInternship,
    setCsv,
    addedNew,
}: {
    values: Record<string, string>;
    setValue: (key: string, value: string) => void;
    fieldErrors: Record<string, string>;
    isInternship: boolean;
    setCsv: (key: string, next: string[], an: string[]) => void;
    addedNew: Record<string, string[]>;
}) {
    return (
        <details className="rounded-2xl border border-border">
            <summary className="cursor-pointer list-none px-4 py-3 text-[13px] font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
                Additional details <span className="font-normal text-muted-foreground">— optional</span>
            </summary>
            <div className="space-y-4 border-t border-border p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <label htmlFor="cs-locations" className={labelClass}>
                            Locations
                        </label>
                        <SuggestInput
                            id="cs-locations"
                            kind="cities"
                            value={csv(values.locations ?? '')}
                            addedNew={addedNew.locations ?? []}
                            onChange={(next, an) => setCsv('locations', next, an)}
                            placeholder="Start typing a city…"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor="cs-workMode" className={labelClass}>
                            Work mode
                        </label>
                        <Select
                            value={values.workMode || undefined}
                            onValueChange={(v) => setValue('workMode', v)}
                        >
                            <SelectTrigger id="cs-workMode" className={selectTriggerClass}>
                                <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ONSITE">Onsite</SelectItem>
                                <SelectItem value="HYBRID">Hybrid</SelectItem>
                                <SelectItem value="REMOTE">Remote</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Pay — one concept, one input set. Internships pay a monthly
                    stipend, jobs pay an annual salary range. The old free-text
                    "Salary range" box duplicated min/max, and the free-text
                    "Employment type" box duplicated the Type selector above,
                    so both are gone (payload sends null; moderator sets it). */}
                {isInternship ? (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label htmlFor="cs-stipend" className={labelClass}>
                                Stipend
                            </label>
                            <Input
                                id="cs-stipend"
                                type="text"
                                value={values.stipend ?? ''}
                                onChange={(e) => setValue('stipend', e.target.value)}
                                placeholder="10k/month"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label htmlFor="cs-salaryMin" className={labelClass}>
                                Min salary (₹/year)
                            </label>
                            <Input
                                id="cs-salaryMin"
                                type="number"
                                min={0}
                                value={values.salaryMin ?? ''}
                                onChange={(e) => setValue('salaryMin', e.target.value)}
                                placeholder="e.g. 300000"
                                aria-invalid={Boolean(fieldErrors.salaryMax)}
                                aria-describedby={fieldErrors.salaryMax ? 'cs-salaryMax-error' : undefined}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="cs-salaryMax" className={labelClass}>
                                Max salary (₹/year)
                            </label>
                            <Input
                                id="cs-salaryMax"
                                type="number"
                                min={0}
                                value={values.salaryMax ?? ''}
                                onChange={(e) => setValue('salaryMax', e.target.value)}
                                placeholder="e.g. 800000"
                                aria-invalid={Boolean(fieldErrors.salaryMax)}
                                aria-describedby={fieldErrors.salaryMax ? 'cs-salaryMax-error' : undefined}
                            />
                            <FieldError id="cs-salaryMax-error" message={fieldErrors.salaryMax} />
                        </div>
                    </div>
                )}

                <div className="space-y-1.5">
                    <label htmlFor="cs-jobFunction" className={labelClass}>
                        Job function
                    </label>
                    <Input
                        id="cs-jobFunction"
                        type="text"
                        value={values.jobFunction ?? ''}
                        onChange={(e) => setValue('jobFunction', e.target.value)}
                        placeholder="Engineering"
                    />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <label htmlFor="cs-experienceMin" className={labelClass}>
                            Experience min (yrs)
                        </label>
                        <Input
                            id="cs-experienceMin"
                            type="number"
                            min={0}
                            max={30}
                            step="0.5"
                            value={values.experienceMin ?? ''}
                            onChange={(e) => setValue('experienceMin', e.target.value)}
                            aria-invalid={Boolean(fieldErrors.experienceMin || fieldErrors.experienceMax)}
                            aria-describedby={
                                fieldErrors.experienceMin
                                    ? 'cs-experienceMin-error'
                                    : fieldErrors.experienceMax
                                      ? 'cs-experienceMax-error'
                                      : undefined
                            }
                        />
                        <FieldError id="cs-experienceMin-error" message={fieldErrors.experienceMin} />
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor="cs-experienceMax" className={labelClass}>
                            Experience max (yrs)
                        </label>
                        <Input
                            id="cs-experienceMax"
                            type="number"
                            min={0}
                            max={30}
                            step="0.5"
                            value={values.experienceMax ?? ''}
                            onChange={(e) => setValue('experienceMax', e.target.value)}
                            aria-invalid={Boolean(fieldErrors.experienceMin || fieldErrors.experienceMax)}
                            aria-describedby={
                                fieldErrors.experienceMax
                                    ? 'cs-experienceMax-error'
                                    : fieldErrors.experienceMin
                                      ? 'cs-experienceMin-error'
                                      : undefined
                            }
                        />
                        <FieldError id="cs-experienceMax-error" message={fieldErrors.experienceMax} />
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <label htmlFor="cs-requiredSkills" className={labelClass}>
                            Skills
                        </label>
                        <SuggestInput
                            id="cs-requiredSkills"
                            kind="skills"
                            value={csv(values.requiredSkills ?? '')}
                            addedNew={addedNew.requiredSkills ?? []}
                            onChange={(next, an) => setCsv('requiredSkills', next, an)}
                            placeholder="Start typing a skill…"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor="cs-tags" className={labelClass}>
                            Tags
                        </label>
                        <SuggestInput
                            id="cs-tags"
                            kind="tags"
                            value={csv(values.tags ?? '')}
                            addedNew={addedNew.tags ?? []}
                            onChange={(next, an) => setCsv('tags', next, an)}
                            placeholder="Start typing a tag…"
                        />
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <label htmlFor="cs-allowedCourses" className={labelClass}>
                            Eligible courses
                        </label>
                        <SuggestInput
                            id="cs-allowedCourses"
                            kind="courses"
                            value={csv(values.allowedCourses ?? '')}
                            addedNew={addedNew.allowedCourses ?? []}
                            onChange={(next, an) => setCsv('allowedCourses', next, an)}
                            placeholder="Start typing a course…"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor="cs-allowedPassoutYears" className={labelClass}>
                            Pass-out years (comma separated)
                        </label>
                        <Input
                            id="cs-allowedPassoutYears"
                            type="text"
                            value={values.allowedPassoutYears ?? ''}
                            onChange={(e) => setValue('allowedPassoutYears', e.target.value)}
                            placeholder="2024, 2025"
                            aria-invalid={Boolean(fieldErrors.allowedPassoutYears)}
                            aria-describedby={fieldErrors.allowedPassoutYears ? 'cs-allowedPassoutYears-error' : undefined}
                        />
                        <FieldError id="cs-allowedPassoutYears-error" message={fieldErrors.allowedPassoutYears} />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="cs-selectionProcess" className={labelClass}>
                        Selection process
                    </label>
                    <textarea
                        id="cs-selectionProcess"
                        rows={2}
                        value={values.selectionProcess ?? ''}
                        onChange={(e) => setValue('selectionProcess', e.target.value)}
                        placeholder="Aptitude > Technical > HR"
                        className={inputClass}
                    />
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="cs-notesHighlights" className={labelClass}>
                        Notes / highlights
                    </label>
                    <textarea
                        id="cs-notesHighlights"
                        rows={2}
                        value={values.notesHighlights ?? ''}
                        onChange={(e) => setValue('notesHighlights', e.target.value)}
                        placeholder="Bond, training, shifts…"
                        className={inputClass}
                    />
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="cs-expiresAt" className={labelClass}>
                        Apply by (date)
                    </label>
                    <Input
                        id="cs-expiresAt"
                        type="date"
                        value={values.expiresAt ?? ''}
                        onChange={(e) => setValue('expiresAt', e.target.value)}
                        aria-invalid={Boolean(fieldErrors.expiresAt)}
                        aria-describedby={fieldErrors.expiresAt ? 'cs-expiresAt-error' : undefined}
                    />
                    <FieldError id="cs-expiresAt-error" message={fieldErrors.expiresAt} />
                </div>
            </div>
        </details>
    );
}

// ─── Job / walk-in fields (shared form core, variant order differs) ──────────

function JobFields({
    type,
    values,
    setValue,
    fieldErrors,
    setCsv,
    addedNew,
}: {
    type: ContributeType;
    values: Record<string, string>;
    setValue: (key: string, value: string) => void;
    fieldErrors: Record<string, string>;
    setCsv: (key: string, next: string[], an: string[]) => void;
    addedNew: Record<string, string[]>;
}) {
    const isWalkIn = type === 'WALKIN';
    // Hostname → company suggestion (placeholder only, while company is
    // empty — never writes into the value, always overridable).
    const guessedCompany = useMemo(
        () => ((values.company ?? '').trim() ? '' : guessCompanyFromUrl(values.sourceUrl ?? '')),
        [values.company, values.sourceUrl]
    );
    return (
        <div className="space-y-5">
            {/* Required first: official link + title */}
            <div className="space-y-4">
                <div className="space-y-1.5">
                    <label htmlFor="cs-sourceUrl" className={labelClass}>
                        Official job link <span className="text-destructive" aria-hidden="true">*</span>
                        <span className="sr-only">(required)</span>
                    </label>
                    <Input
                        id="cs-sourceUrl"
                        type="url"
                        autoFocus
                        inputMode="url"
                        autoComplete="url"
                        required
                        value={values.sourceUrl ?? ''}
                        onChange={(e) => setValue('sourceUrl', e.target.value)}
                        placeholder="https://careers.example.com/jobs/123"
                        aria-invalid={Boolean(fieldErrors.sourceUrl)}
                        aria-describedby={fieldErrors.sourceUrl ? 'cs-sourceUrl-error' : 'cs-sourceUrl-hint'}
                    />
                    <FieldError id="cs-sourceUrl-error" message={fieldErrors.sourceUrl} />
                    <p id="cs-sourceUrl-hint" className="text-xs text-muted-foreground">
                        The original posting — moderators verify from this link. Applying happens here too.
                    </p>
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="cs-title" className={labelClass}>
                        Title <span className="text-destructive" aria-hidden="true">*</span>
                        <span className="sr-only">(required)</span>
                    </label>
                    <Input
                        id="cs-title"
                        type="text"
                        required
                        autoComplete="organization-title"
                        value={values.title ?? ''}
                        onChange={(e) => setValue('title', e.target.value)}
                        placeholder="Software Engineer"
                        aria-invalid={Boolean(fieldErrors.title)}
                        aria-describedby={fieldErrors.title ? 'cs-title-error' : undefined}
                    />
                    <FieldError id="cs-title-error" message={fieldErrors.title} />
                </div>
            </div>

            {/* Walk-in only: dedicated drive details ABOVE general metadata.
                Pickers write driveStartDate/driveEndDate/driveStartTime/
                driveEndTime keys; the submit payload derives the dateRange /
                timeRange free-text strings from them (API contract unchanged),
                falling back to any legacy dateRange/timeRange text so old
                drafts and resubmits still work. */}
            {isWalkIn ? (
                <section aria-labelledby="cs-drive-heading" className="space-y-3 rounded-2xl border border-border p-4">
                    <h3 id="cs-drive-heading" className={sectionHeadingClass}>
                        Drive details
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label htmlFor="cs-driveStartDate" className={labelClass}>
                                Start date <span className="text-destructive" aria-hidden="true">*</span>
                                <span className="sr-only">(required)</span>
                            </label>
                            <Input
                                id="cs-driveStartDate"
                                type="date"
                                required
                                value={values.driveStartDate ?? ''}
                                onChange={(e) => setValue('driveStartDate', e.target.value)}
                                aria-invalid={Boolean(fieldErrors.dateRange)}
                                aria-describedby={fieldErrors.dateRange ? 'cs-dateRange-error' : undefined}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="cs-driveEndDate" className={labelClass}>
                                End date
                            </label>
                            <Input
                                id="cs-driveEndDate"
                                type="date"
                                value={values.driveEndDate ?? ''}
                                onChange={(e) => setValue('driveEndDate', e.target.value)}
                                min={values.driveStartDate || undefined}
                                aria-invalid={Boolean(fieldErrors.dateRange)}
                                aria-describedby={fieldErrors.dateRange ? 'cs-dateRange-error' : undefined}
                            />
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label htmlFor="cs-driveStartTime" className={labelClass}>
                                Start time
                            </label>
                            <Input
                                id="cs-driveStartTime"
                                type="time"
                                value={values.driveStartTime ?? ''}
                                onChange={(e) => setValue('driveStartTime', e.target.value)}
                                aria-invalid={Boolean(fieldErrors.timeRange)}
                                aria-describedby={fieldErrors.timeRange ? 'cs-timeRange-error' : undefined}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="cs-driveEndTime" className={labelClass}>
                                End time
                            </label>
                            <Input
                                id="cs-driveEndTime"
                                type="time"
                                value={values.driveEndTime ?? ''}
                                onChange={(e) => setValue('driveEndTime', e.target.value)}
                                aria-invalid={Boolean(fieldErrors.timeRange)}
                                aria-describedby={fieldErrors.timeRange ? 'cs-timeRange-error' : undefined}
                            />
                        </div>
                    </div>
                    <FieldError id="cs-dateRange-error" message={fieldErrors.dateRange} />
                    <FieldError id="cs-timeRange-error" message={fieldErrors.timeRange} />
                    <div className="space-y-1.5">
                        <label htmlFor="cs-venueAddress" className={labelClass}>
                            Venue address <span className="text-destructive" aria-hidden="true">*</span>
                            <span className="sr-only">(required)</span>
                        </label>
                        <textarea
                            id="cs-venueAddress"
                            rows={2}
                            required
                            value={values.venueAddress ?? ''}
                            onChange={(e) => setValue('venueAddress', e.target.value)}
                            placeholder="Full walk-in venue address…"
                            aria-invalid={Boolean(fieldErrors.venueAddress)}
                            aria-describedby={fieldErrors.venueAddress ? 'cs-venueAddress-error' : undefined}
                            className={inputClass}
                        />
                        <FieldError id="cs-venueAddress-error" message={fieldErrors.venueAddress} />
                    </div>
                </section>
            ) : null}

            {/* General metadata: company/apply/type row, then full-width description */}
            <div className="space-y-4">
                <div className={`grid gap-4 ${isWalkIn ? '' : 'sm:grid-cols-2'}`}>
                    <div className="space-y-1.5">
                        <label htmlFor="cs-company" className={labelClass}>
                            Company <span className="font-normal text-muted-foreground">(optional)</span>
                        </label>
                        <SuggestInput
                            id="cs-company"
                            kind="companies"
                            mode="single"
                            value={csv(values.company ?? '').slice(0, 1)}
                            addedNew={addedNew.company ?? []}
                            onChange={(next, an) => setCsv('company', next, an)}
                            placeholder={
                                guessedCompany
                                    ? `e.g. ${guessedCompany} (from the link)`
                                    : 'Start typing a company…'
                            }
                        />
                    </div>
                    {isWalkIn ? null : (
                        <div className="space-y-1.5">
                            <label htmlFor="cs-type" className={labelClass}>
                                Type <span className="font-normal text-muted-foreground">(optional)</span>
                            </label>
                            <Select
                                value={values.oppType ?? 'JOB'}
                                onValueChange={(v) => setValue('oppType', v)}
                            >
                                <SelectTrigger id="cs-type" className={selectTriggerClass}>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="JOB">Job</SelectItem>
                                    <SelectItem value="INTERNSHIP">Internship</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="cs-description" className={labelClass}>
                        Description <span className="font-normal text-muted-foreground">(optional)</span>
                    </label>
                    <textarea
                        id="cs-description"
                        rows={5}
                        value={values.description ?? ''}
                        onChange={(e) => setValue('description', e.target.value)}
                        placeholder="Role, eligibility, how to apply…"
                        className={inputClass}
                    />
                    <p className="text-xs text-muted-foreground">
                        Supports line breaks, bullet lines like - Requirement, and bold
                        headings like **Responsibilities**.
                    </p>
                </div>
            </div>

            <AdditionalDetails
                values={values}
                setValue={setValue}
                fieldErrors={fieldErrors}
                isInternship={type === 'JOB' && (values.oppType ?? 'JOB') === 'INTERNSHIP'}
                setCsv={setCsv}
                addedNew={addedNew}
            />
        </div>
    );
}

// ─── Interview experience fields ─────────────────────────────────────────────

function InterviewFields({
    values,
    setValue,
    rounds,
    setRounds,
    fieldErrors,
}: {
    values: Record<string, string>;
    setValue: (key: string, value: string) => void;
    rounds: Array<{ name: string; questions: string }>;
    setRounds: React.Dispatch<React.SetStateAction<Array<{ name: string; questions: string }>>>;
    fieldErrors: Record<string, string>;
}) {
    const addRound = () => setRounds((prev) => [...prev, { name: '', questions: '' }]);
    const updateRound = (idx: number, field: 'name' | 'questions', value: string) =>
        setRounds((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
    const removeRound = (idx: number) => setRounds((prev) => prev.filter((_, i) => i !== idx));

    return (
        <div className="space-y-5">
            {/* 1) Job listing reference + role */}
            <div className="space-y-4">
                <div className="space-y-1.5">
                    <label htmlFor="cs-iex-opp" className={labelClass}>
                        Job link on FresherFlow <span className="text-destructive" aria-hidden="true">*</span>
                        <span className="sr-only">(required)</span>
                    </label>
                    <Input
                        id="cs-iex-opp"
                        type="text"
                        autoFocus
                        inputMode="url"
                        autoComplete="url"
                        required
                        value={values.opportunitySlug ?? ''}
                        onChange={(e) => setValue('opportunitySlug', e.target.value)}
                        placeholder="Paste the /jobs/… link or slug"
                        aria-invalid={Boolean(fieldErrors.opportunitySlug)}
                        aria-describedby={fieldErrors.opportunitySlug ? 'cs-iex-opp-error' : 'cs-iex-opp-hint'}
                    />
                    <FieldError id="cs-iex-opp-error" message={fieldErrors.opportunitySlug} />
                    <p id="cs-iex-opp-hint" className="text-xs text-muted-foreground">
                        Experiences attach to a job listing, so others find them in context.
                    </p>
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="cs-iex-role" className={labelClass}>
                        Role <span className="text-destructive" aria-hidden="true">*</span>
                        <span className="sr-only">(required)</span>
                    </label>
                    <Input
                        id="cs-iex-role"
                        type="text"
                        required
                        autoComplete="organization-title"
                        value={values.iexRole ?? ''}
                        onChange={(e) => setValue('iexRole', e.target.value)}
                        placeholder="e.g. Software Engineer"
                        aria-invalid={Boolean(fieldErrors.iexRole)}
                        aria-describedby={fieldErrors.iexRole ? 'cs-iex-role-error' : undefined}
                    />
                    <FieldError id="cs-iex-role-error" message={fieldErrors.iexRole} />
                </div>
            </div>

            {/* 2) Batch / difficulty / result */}
            <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                    <label htmlFor="cs-iex-batch" className={labelClass}>
                        Batch
                    </label>
                    <Input
                        id="cs-iex-batch"
                        type="number"
                        value={values.iexBatch ?? ''}
                        onChange={(e) => setValue('iexBatch', e.target.value)}
                        placeholder="e.g. 2026"
                        aria-invalid={Boolean(fieldErrors.iexBatch)}
                        aria-describedby={fieldErrors.iexBatch ? 'cs-iex-batch-error' : undefined}
                    />
                    <FieldError id="cs-iex-batch-error" message={fieldErrors.iexBatch} />
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="cs-iex-difficulty" className={labelClass}>
                        Difficulty
                    </label>
                    <Select
                        value={values.iexDifficulty || undefined}
                        onValueChange={(v) => setValue('iexDifficulty', v)}
                    >
                        <SelectTrigger id="cs-iex-difficulty" className={selectTriggerClass}>
                            <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="EASY">Easy</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="HARD">Hard</SelectItem>
                            <SelectItem value="VERY_HARD">Very Hard</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="cs-iex-result" className={labelClass}>
                        Result
                    </label>
                    <Select
                        value={values.iexResult || undefined}
                        onValueChange={(v) => setValue('iexResult', v)}
                    >
                        <SelectTrigger id="cs-iex-result" className={selectTriggerClass}>
                            <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="SELECTED">Selected</SelectItem>
                            <SelectItem value="REJECTED">Rejected</SelectItem>
                            <SelectItem value="WAITING">Waiting</SelectItem>
                            <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* 3) Rounds — compact numbered sections */}
            <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                    <span id="cs-iex-rounds-label" className={sectionHeadingClass}>
                        Rounds <span className="text-destructive" aria-hidden="true">*</span>
                    </span>
                    <Button type="button" variant="ghost" size="sm" onClick={addRound}>
                        + Add round
                    </Button>
                </div>
                <div role="group" aria-labelledby="cs-iex-rounds-label" className="space-y-2">
                    {rounds.map((round, idx) => {
                        const nameId = `cs-iex-round-${idx}-name`;
                        const questionsId = `cs-iex-round-${idx}-questions`;
                        return (
                            <div key={idx} className="space-y-2 rounded-xl border border-border p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <label htmlFor={nameId} className="text-[13px] font-semibold text-foreground">
                                        Round {idx + 1}
                                    </label>
                                    {rounds.length > 1 ? (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="xs"
                                            onClick={() => removeRound(idx)}
                                            aria-label={`Remove round ${idx + 1}`}
                                        >
                                            Remove
                                        </Button>
                                    ) : null}
                                </div>
                                <Input
                                    id={nameId}
                                    type="text"
                                    value={round.name}
                                    onChange={(e) => updateRound(idx, 'name', e.target.value)}
                                    placeholder="Round name — e.g. Online Assessment"
                                />
                                <label htmlFor={questionsId} className="sr-only">
                                    Questions asked in round {idx + 1}
                                </label>
                                <textarea
                                    id={questionsId}
                                    value={round.questions}
                                    onChange={(e) => updateRound(idx, 'questions', e.target.value)}
                                    rows={2}
                                    placeholder="Questions asked (one per line)"
                                    className={inputClass}
                                />
                            </div>
                        );
                    })}
                </div>
                <FieldError id="cs-iex-rounds-error" message={fieldErrors.rounds} />
            </div>

            {/* 4) Overall notes */}
            <div className="space-y-1.5">
                <label htmlFor="cs-iex-notes" className={labelClass}>
                    Overall notes
                </label>
                <textarea
                    id="cs-iex-notes"
                    value={values.iexNotes ?? ''}
                    onChange={(e) => setValue('iexNotes', e.target.value)}
                    rows={3}
                    placeholder="Any tips or overall experience…"
                    className={inputClass}
                />
            </div>
        </div>
    );
}

// ─── The sheet ───────────────────────────────────────────────────────────────

export interface ContributeSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialType?: ContributeType | null;
    onSubmitted?: () => void;
    /** Resubmit flow (`?source=`): seeds `sourceUrl` once on open, then ignored. */
    prefillSourceUrl?: string | null;
}

export function ContributeSheet({ open, onOpenChange, initialType = 'JOB', onSubmitted, prefillSourceUrl = null }: ContributeSheetProps) {
    const { user } = useAuth();
    const [type, setType] = useState<ContributeType | null>(initialType);
    const [values, setValues] = useState<Record<string, string>>({});
    const [rounds, setRounds] = useState<Array<{ name: string; questions: string }>>([
        { name: 'Online Assessment', questions: '' },
    ]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const [outcome, setOutcome] = useState<SubmitOutcome>(null);
    const [draftBanner, setDraftBanner] = useState<'none' | 'offer' | 'restored'>('none');
    // Display-only: which SuggestInput terms are outside the CDN vocabulary
    // ("new — a moderator will map it" dotted chips). Never submitted,
    // never drafted — recomputed from user picks each open.
    const [addedNew, setAddedNew] = useState<Record<string, string[]>>({});

    const { hasDraft, clearDraft, restoreDraft } = useDraft(open ? type : null);

    // Guards + transient refs (not state: they must not re-render or re-fire effects).
    const wasOpenRef = useRef(false);
    const dirtyRef = useRef(false);
    const submittingRef = useRef(false);
    const errorRef = useRef<HTMLDivElement>(null);

    const prefill = (prefillSourceUrl ?? '').trim();

    // Reset per open transition only — never on unrelated prop churn (e.g. the
    // hub clearing `?source=` while the sheet is open), so user input survives.
    useEffect(() => {
        if (open && !wasOpenRef.current) {
            setType(initialType ?? 'JOB');
            setOutcome(null);
            setError(null);
            setFieldErrors({});
            setValues(prefill ? { sourceUrl: prefill } : {});
            setRounds([{ name: 'Online Assessment', questions: '' }]);
            setDraftBanner('none');
            setAddedNew({});
            dirtyRef.current = false;
        }
        wasOpenRef.current = open;
    }, [open, initialType, prefillSourceUrl]);

    const setValue = useCallback((key: string, value: string) => {
        dirtyRef.current = true;
        setFieldErrors((prev) => {
            if (!prev[key]) return prev;
            const next = { ...prev };
            delete next[key];
            return next;
        });
        setValues((prev) => {
            const next = { ...prev, [key]: value };
            if (type) writeDraft(type, next);
            return next;
        });
    }, [type]);

    // SuggestInput boundary: values stay comma strings (drafts + payload);
    // the CDN-vocabulary "new" flags ride alongside as display-only state.
    const setCsv = useCallback((key: string, next: string[], an: string[]) => {
        setValue(key, next.join(', '));
        setAddedNew((prev) => ({ ...prev, [key]: an }));
    }, [setValue]);

    // Offer draft restore when a saved draft exists and the user hasn't typed
    // yet. Prefilling `sourceUrl` does not count as typing, so the resubmit
    // flow can still offer the old draft alongside the prefilled link.
    useEffect(() => {
        if (!open || !type || outcome || dirtyRef.current) return;
        const draft = readDraft(type);
        if (draft && !isBlankDraft(draft)) {
            setDraftBanner('offer');
        }
    }, [open, type, outcome]);

    // Bring a validation summary into view — it sits at the top of the scroll
    // body while the submit button lives in the fixed footer.
    useEffect(() => {
        if (error) errorRef.current?.scrollIntoView({ block: 'nearest' });
    }, [error]);

    const restore = () => {
        const draft = restoreDraft();
        if (draft) {
            // A resubmit prefill always wins over a stale drafted link.
            setValues(prefill ? { ...draft, sourceUrl: prefill } : draft);
            setDraftBanner('restored');
        }
    };

    const discard = () => {
        // Explicit destructive action: confirm when the form holds user input
        // so a stray tap never wipes a populated draft. Closing the sheet
        // never clears — only success or this confirmed discard does.
        if (Object.keys(values).some((k) => (values[k] ?? '').trim() !== '')) {
            if (typeof window !== 'undefined' && !window.confirm('Discard this draft? This cannot be undone.')) {
                return;
            }
        }
        clearDraft();
        setValues(prefill ? { sourceUrl: prefill } : {});
        setDraftBanner('none');
    };

    const payload = useMemo(() => {
        const years = csv(values.allowedPassoutYears ?? '')
            .map(Number)
            .filter((y) => Number.isInteger(y) && y >= 1990 && y <= 2100);
        // Independent taxonomy dimensions (v2): the submit API resolves
        // `category` onto category/recruitmentMethod/employmentTypes. A walk-in
        // is a recruitment method (venue fields below carry the drive), an
        // internship is an employment type — never a single `type` enum.
        const isWalkIn = type === 'WALKIN';
        const oppType = isWalkIn ? 'WALKIN' : ((values.oppType ?? 'JOB').trim().toUpperCase());
        // No free-text employment-type input: the Type selector above is the
        // single source (INTERNSHIP maps directly, else a moderator sets it).
        // Same for the removed "Salary range" box — min/max carry the pay, and
        // stale keys from old drafts are deliberately never sent.
        // Walk-in pickers (driveStartDate/driveEndDate/driveStartTime/
        // driveEndTime) derive the same free-text dateRange/timeRange string
        // keys the submit API validates (max 120 chars). Empty pickers fall
        // back to legacy text so old drafts and resubmits still validate.
        const driveStartDate = (values.driveStartDate ?? '').trim();
        const driveEndDate = (values.driveEndDate ?? '').trim();
        const driveStartTime = (values.driveStartTime ?? '').trim();
        const driveEndTime = (values.driveEndTime ?? '').trim();
        const pickerDateRange = driveStartDate
            ? driveEndDate && driveEndDate !== driveStartDate
                ? `${driveStartDate} – ${driveEndDate}`
                : driveStartDate
            : '';
        const pickerTimeRange = driveStartTime
            ? driveEndTime && driveEndTime !== driveStartTime
                ? `${driveStartTime} – ${driveEndTime}`
                : driveStartTime
            : '';
        return {
            sourceUrl: (values.sourceUrl ?? '').trim(),
            // No apply-link input: the server falls back to the job link
            // (community.service.ts: applyLink = applyUrl ?? sourceUrl), and
            // stale keys from old drafts must never submit invisibly.
            applyUrl: undefined,
            title: (values.title ?? '').trim(),
            company: (values.company ?? '').trim() || undefined,
            category: 'EMPLOYMENT',
            recruitmentMethod: isWalkIn ? 'WALK_IN' : 'REGULAR',
            employmentTypes: oppType === 'INTERNSHIP' ? 'INTERNSHIP' : null,
            description: (values.description ?? '').trim() || undefined,
            locations: (values.locations ?? '').trim() ? csv(values.locations).slice(0, 15) : undefined,
            workMode: (values.workMode ?? '') as WorkMode | '' as WorkMode | null,
            salaryRange: null,
            salaryMin: numOrNull(values.salaryMin ?? ''),
            salaryMax: numOrNull(values.salaryMax ?? ''),
            stipend: (values.stipend ?? '').trim() || null,
            experienceMin: (values.experienceMin ?? '').trim() === '' ? null : Number(values.experienceMin),
            experienceMax: (values.experienceMax ?? '').trim() === '' ? null : Number(values.experienceMax),
            requiredSkills: (values.requiredSkills ?? '').trim() ? csv(values.requiredSkills) : undefined,
            tags: (values.tags ?? '').trim() ? csv(values.tags).slice(0, 20) : undefined,
            allowedCourses: (values.allowedCourses ?? '').trim() ? csv(values.allowedCourses).slice(0, 20) : undefined,
            allowedPassoutYears: years.length ? years : undefined,
            jobFunction: (values.jobFunction ?? '').trim() || null,
            selectionProcess: (values.selectionProcess ?? '').trim() || null,
            notesHighlights: (values.notesHighlights ?? '').trim() || null,
            expiresAt: (values.expiresAt ?? '').trim() || null,
            dateRange: pickerDateRange || (values.dateRange ?? '').trim() || null,
            timeRange: pickerTimeRange || (values.timeRange ?? '').trim() || null,
            venueAddress: (values.venueAddress ?? '').trim() || null,
            submitterName: (values.submitterName ?? '').trim() || null,
            contact: (values.contact ?? '').trim() || null,
        };
    }, [type, values]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!type || submittingRef.current) return;
        submittingRef.current = true;
        setSubmitting(true);
        setError(null);
        setFieldErrors({});

        try {
            if (type !== 'INTERVIEW_EXPERIENCE') {
                const missing: Record<string, string> = {};
                if (!payload.sourceUrl) missing.sourceUrl = 'Paste the official link for this opening.';
                else if (!isValidHttpUrl(payload.sourceUrl))
                    missing.sourceUrl = 'Enter a valid link starting with http(s)://.';
                if (!payload.title) missing.title = 'Add a title for this opening.';
                if (type === 'WALKIN') {
                    if (!payload.dateRange) missing.dateRange = 'Add the drive dates.';
                    if (!payload.venueAddress) missing.venueAddress = 'Add the venue address.';
                }
                // API string limits (validation.ts: dateRange/timeRange max 120,
                // venueAddress max 2000) — payload keys unchanged.
                if (payload.dateRange && payload.dateRange.length > 120)
                    missing.dateRange = 'Drive dates must be under 120 characters.';
                if (payload.timeRange && payload.timeRange.length > 120)
                    missing.timeRange = 'Drive time must be under 120 characters.';
                if (payload.venueAddress && payload.venueAddress.length > 2000)
                    missing.venueAddress = 'Venue address must be under 2000 characters.';
                const expiresRaw = (values.expiresAt ?? '').trim();
                if (expiresRaw && expiresRaw < todayLocalISO())
                    missing.expiresAt = 'Apply-by date cannot be in the past.';
                const expMinRaw = (values.experienceMin ?? '').trim();
                const expMaxRaw = (values.experienceMax ?? '').trim();
                const expMin = expMinRaw === '' ? null : Number(expMinRaw);
                const expMax = expMaxRaw === '' ? null : Number(expMaxRaw);
                if (expMinRaw !== '' && !Number.isFinite(expMin))
                    missing.experienceMin = 'Enter experience in years.';
                else if (expMaxRaw !== '' && !Number.isFinite(expMax))
                    missing.experienceMax = 'Enter experience in years.';
                else if (expMin !== null && expMax !== null && expMin > expMax)
                    missing.experienceMax = 'Experience min cannot be greater than max.';
                if (payload.salaryMin !== null && payload.salaryMax !== null && payload.salaryMin > payload.salaryMax) {
                    missing.salaryMax = 'Salary min cannot be greater than max.';
                }
                const passoutTokens = (values.allowedPassoutYears ?? '')
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean);
                if (
                    passoutTokens.some(
                        (t) => !/^\d{4}$/.test(t) || Number(t) < 1990 || Number(t) > 2100
                    )
                )
                    missing.allowedPassoutYears = 'Use years like 2024, 2025 (1990–2100).';
                if (Object.keys(missing).length > 0) {
                    setFieldErrors(missing);
                    const keys = Object.keys(missing);
                    setError(
                        !payload.sourceUrl || !payload.title
                            ? 'A job link and a title are required.'
                            : type === 'WALKIN' && (!payload.dateRange || !payload.venueAddress)
                              ? 'Drive dates and venue address are required.'
                              : keys.length === 1
                                ? missing[keys[0]]
                                : 'Fix the highlighted fields and try again.'
                    );
                    scrollToFirstError(missing);
                    return;
                }
            } else {
                const { slug, error: slugError } = extractOpportunitySlug(values.opportunitySlug ?? '');
                if (slugError) {
                    setFieldErrors({ opportunitySlug: slugError });
                    setError(slugError);
                    scrollToFirstError({ opportunitySlug: slugError });
                    return;
                }
                if (!slug || !(values.iexRole ?? '').trim()) {
                    const iexMissing = {
                        ...(!slug ? { opportunitySlug: 'Paste the /jobs/ link this experience belongs to.' } : {}),
                        ...(!(values.iexRole ?? '').trim() ? { iexRole: 'Add the role you interviewed for.' } : {}),
                    };
                    setFieldErrors(iexMissing);
                    setError('The job link and role are required.');
                    scrollToFirstError(iexMissing);
                    return;
                }
                if (slug.length > 200) {
                    setFieldErrors({ opportunitySlug: 'Job link is too long.' });
                    setError('Job link is too long.');
                    scrollToFirstError({ opportunitySlug: 'Job link is too long.' });
                    return;
                }
                const batchRaw = (values.iexBatch ?? '').trim();
                if (batchRaw && (!/^\d{4}$/.test(batchRaw) || Number(batchRaw) < 1990 || Number(batchRaw) > 2100)) {
                    setFieldErrors({ iexBatch: 'Use a batch year like 2026 (1990–2100).' });
                    setError('Use a batch year like 2026 (1990–2100).');
                    scrollToFirstError({ iexBatch: 'Use a batch year like 2026 (1990–2100).' });
                    return;
                }
                if (rounds.length === 0 || !rounds[0].name.trim()) {
                    setFieldErrors({ rounds: 'Add at least one round with a name.' });
                    setError('At least one round is required.');
                    scrollToFirstError({ rounds: 'Add at least one round with a name.' });
                    return;
                }
            }

            if (type === 'INTERVIEW_EXPERIENCE') {
                const { slug: iexSlug } = extractOpportunitySlug(values.opportunitySlug ?? '');
                await communityApi.createInterviewExperience({
                    opportunityId: iexSlug,
                    role: (values.iexRole ?? '').trim(),
                    batch: values.iexBatch ? Number(values.iexBatch) : undefined,
                    difficulty: (values.iexDifficulty || undefined) as
                        | 'EASY'
                        | 'MEDIUM'
                        | 'HARD'
                        | 'VERY_HARD'
                        | undefined,
                    result: (values.iexResult || undefined) as
                        | 'SELECTED'
                        | 'REJECTED'
                        | 'WAITING'
                        | 'WITHDRAWN'
                        | undefined,
                    overallNotes: (values.iexNotes ?? '').trim() || undefined,
                    rounds: rounds
                        .filter((r) => r.name.trim())
                        .map((r) => ({
                            name: r.name.trim(),
                            questions: r.questions.split('\n').map((q) => q.trim()).filter(Boolean),
                        })),
                });
                setOutcome({ kind: 'iex' });
            } else {
                const res = await communityApi.submitJob(payload);
                setOutcome(
                    res.existing
                        ? { kind: 'existing', slug: res.slug }
                        : { kind: 'created', slug: res.slug }
                );
            }
            if (type) clearDraft();
            // Refresh history: the hub bumps `refreshKey` from this callback.
            onSubmitted?.();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not submit this. Try again.');
        } finally {
            submittingRef.current = false;
            setSubmitting(false);
        }
    };

    const meta = type ? TYPE_META[type] : null;

    return (
        <Sheet
            open={open}
            onOpenChange={(next) => {
                if (!next && submitting) return; // don't close mid-submit
                // Closing never clears the draft — only a success does.
                onOpenChange(next);
            }}
        >
            {/* Right drawer on desktop (~640px); full-screen sheet on mobile.
                `cn` (tailwind-merge) lets these override the base
                `w-3/4 … sm:max-w-sm` + `gap-4` from SheetContent. */}
            <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-[640px]">
                <SheetHeader className="shrink-0 border-b border-border px-6 pb-4 pr-12 pt-5 text-left">
                    <SheetTitle>{meta ? meta.title : 'Contribute'}</SheetTitle>
                    <SheetDescription>{meta ? meta.description : null}</SheetDescription>
                </SheetHeader>

                {outcome ? (
                    <>
                        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                            <div className="space-y-3 rounded-2xl border border-border bg-card p-5 text-left">
                                <Badge variant={outcome.kind === 'existing' ? 'success' : 'warning'}>
                                    {outcome.kind === 'existing' ? 'Already listed' : 'Pending review'}
                                </Badge>
                                <h3 className="text-base font-bold text-foreground">
                                    {outcome.kind === 'existing'
                                        ? 'Looks like we already have this one'
                                        : outcome.kind === 'iex'
                                          ? 'Experience received'
                                          : 'Submission received'}
                                </h3>
                                <p className="text-[13px] text-muted-foreground">
                                    {outcome.kind === 'existing'
                                        ? 'We folded your link into the existing listing.'
                                        : 'It has not been published yet. It appears in listings only after a moderator approves it.'}
                                </p>
                                {outcome.kind === 'existing' ? (
                                    <Button asChild variant="outline" className="w-full">
                                        <a href={`/jobs/${outcome.slug}`}>View listing</a>
                                    </Button>
                                ) : (
                                    <p className="text-[13px] text-muted-foreground">
                                        Your share appears under “Your contributions” with its review
                                        status. The listing link unlocks once a moderator approves it.
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="shrink-0 border-t border-border bg-background px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
                            <Button variant="secondary" className="w-full" onClick={() => onOpenChange(false)}>
                                Done
                            </Button>
                        </div>
                    </>
                ) : !type ? (
                    /* Defensive only: the hub always opens with a type, so this
                       path is not styled as a primary flow. */
                    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-6 py-5">
                        {(Object.keys(TYPE_META) as ContributeType[]).map((t) => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setType(t)}
                                className="w-full rounded-xl border border-border bg-card p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            >
                                <p className="text-sm font-semibold text-foreground">{TYPE_META[t].title}</p>
                                <p className="text-xs text-muted-foreground">{TYPE_META[t].description}</p>
                            </button>
                        ))}
                    </div>
                ) : (
                    <form
                        onSubmit={handleSubmit}
                        aria-describedby={error ? 'cs-form-error' : undefined}
                        className="flex min-h-0 flex-1 flex-col"
                    >
                        {/* The ONLY scroll container. Header above and footer
                            below stay fixed; nothing else sticks. */}
                        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
                            {!user ? (
                                <p className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-[13px] text-muted-foreground">
                                    No account needed — guest posts are welcome. Sign in to track your
                                    submissions in history.
                                </p>
                            ) : null}

                            {error ? (
                                <div
                                    ref={errorRef}
                                    id="cs-form-error"
                                    role="alert"
                                    aria-live="assertive"
                                    className="rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2.5"
                                >
                                    <p className="text-[13px] font-medium text-destructive">{error}</p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        Fix the highlighted field below and try again.
                                    </p>
                                </div>
                            ) : null}

                            {draftBanner === 'offer' && hasDraft ? (
                                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2">
                                    <p className="text-[13px] text-muted-foreground">Resume your draft?</p>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={discard}
                                        >
                                            Discard
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            onClick={restore}
                                        >
                                            Resume
                                        </Button>
                                    </div>
                                </div>
                            ) : null}
                            {draftBanner === 'restored' ? (
                                <p className="text-xs text-muted-foreground" role="status">
                                    Draft restored.
                                </p>
                            ) : null}

                            {type === 'INTERVIEW_EXPERIENCE' ? (
                                <InterviewFields
                                    values={values}
                                    setValue={setValue}
                                    rounds={rounds}
                                    setRounds={setRounds}
                                    fieldErrors={fieldErrors}
                                />
                            ) : (
                                <JobFields
                                    type={type}
                                    values={values}
                                    setValue={setValue}
                                    fieldErrors={fieldErrors}
                                    setCsv={setCsv}
                                    addedNew={addedNew}
                                />
                            )}

                            {!user ? (
                                <section aria-label="Your details (optional)" className="space-y-3 rounded-2xl border border-border p-4">
                                    <p className={sectionHeadingClass}>Your details (optional)</p>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <label htmlFor="cs-submitterName" className={labelClass}>
                                                Your name
                                            </label>
                                            <Input
                                                id="cs-submitterName"
                                                type="text"
                                                value={values.submitterName ?? ''}
                                                onChange={(e) => setValue('submitterName', e.target.value)}
                                                placeholder="Jane"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label htmlFor="cs-contact" className={labelClass}>
                                                Contact
                                            </label>
                                            <Input
                                                id="cs-contact"
                                                type="text"
                                                value={values.contact ?? ''}
                                                onChange={(e) => setValue('contact', e.target.value)}
                                                placeholder="email or handle"
                                            />
                                        </div>
                                    </div>
                                </section>
                            ) : null}
                        </div>

                        {/* Fixed footer: submit lives here, never inside the
                            scroll body. Safe-area padding for mobile keyboards
                            and home-indicator overlap. */}
                        <div className="shrink-0 border-t border-border bg-background px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
                            <Button type="submit" disabled={submitting} className="w-full">
                                {submitting
                                    ? 'Sharing…'
                                    : type === 'INTERVIEW_EXPERIENCE'
                                      ? 'Submit experience'
                                      : 'Share for review'}
                            </Button>
                        </div>
                    </form>
                )}
            </SheetContent>
        </Sheet>
    );
}

export type { MySubmissionItem };
