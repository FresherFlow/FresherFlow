'use client';
/* eslint-disable shadcn/no-arbitrary-values, shadcn/no-unknown-classes, shadcn/no-restyle, shadcn/require-static-classes, shadcn/no-raw-colors */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { communityApi } from '@fresherflow/api-client';
import type { MySubmissionItem, OpportunityType, WorkMode } from '@fresherflow/types';
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
    'w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30';

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

function writeDraft(type: ContributeType, data: Record<string, string> | null) {
    if (typeof window === 'undefined') return;
    try {
        const all = JSON.parse(window.localStorage.getItem(DRAFT_KEY) ?? '{}');
        if (data && Object.keys(data).length > 0) {
            all[type] = data;
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
        hasDraftRef.current = Boolean(draft);
        setHasDraft(Boolean(draft));
    }, [type]);

    const clearDraft = useCallback(() => {
        if (type) writeDraft(type, null);
        setHasDraft(false);
    }, [type]);

    const restoreDraft = useCallback(() => (type ? readDraft(type) : null), [type]);

    return { hasDraft: hasDraft && hasDraftRef.current, clearDraft, restoreDraft };
}

// ─── Job / walk-in fields (shared form core) ─────────────────────────────────

function JobFields({
    type,
    values,
    setValue,
    showDetails,
}: {
    type: ContributeType;
    values: Record<string, string>;
    setValue: (key: string, value: string) => void;
    showDetails: boolean;
}) {
    return (
        <div className="space-y-4">
            <div className="space-y-1.5">
                <label htmlFor="cs-sourceUrl" className="text-xs font-semibold text-foreground">
                    Job link <span className="text-destructive">*</span>
                </label>
                <Input
                    id="cs-sourceUrl"
                    type="url"
                    required
                    value={values.sourceUrl ?? ''}
                    onChange={(e) => setValue('sourceUrl', e.target.value)}
                    placeholder="https://careers.example.com/jobs/123"
                />
            </div>

            <div className="space-y-1.5">
                <label htmlFor="cs-title" className="text-xs font-semibold text-foreground">
                    Title <span className="text-destructive">*</span>
                </label>
                <Input
                    id="cs-title"
                    type="text"
                    required
                    value={values.title ?? ''}
                    onChange={(e) => setValue('title', e.target.value)}
                    placeholder="Software Engineer"
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <label htmlFor="cs-company" className="text-xs font-semibold text-foreground">
                        Company
                    </label>
                    <Input
                        id="cs-company"
                        type="text"
                        value={values.company ?? ''}
                        onChange={(e) => setValue('company', e.target.value)}
                        placeholder="Acme"
                    />
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="cs-applyUrl" className="text-xs font-semibold text-foreground">
                        Apply link
                    </label>
                    <Input
                        id="cs-applyUrl"
                        type="url"
                        value={values.applyUrl ?? ''}
                        onChange={(e) => setValue('applyUrl', e.target.value)}
                        placeholder="https://…"
                    />
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <label htmlFor="cs-type" className="text-xs font-semibold text-foreground">
                        Type
                    </label>
                    <select
                        id="cs-type"
                        value={type === 'WALKIN' ? 'WALKIN' : (values.oppType ?? 'JOB')}
                        onChange={(e) => setValue('oppType', e.target.value)}
                        disabled={type === 'WALKIN'}
                        className={inputClass}
                    >
                        <option value="JOB">Job</option>
                        <option value="INTERNSHIP">Internship</option>
                        {type === 'WALKIN' ? <option value="WALKIN">Walk-in</option> : null}
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="cs-description" className="text-xs font-semibold text-foreground">
                        Description
                    </label>
                    <textarea
                        id="cs-description"
                        rows={3}
                        value={values.description ?? ''}
                        onChange={(e) => setValue('description', e.target.value)}
                        placeholder="Role, eligibility, how to apply…"
                        className={inputClass}
                    />
                </div>
            </div>

            {showDetails ? (
                <div className="space-y-4 rounded-2xl border border-border p-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label htmlFor="cs-locations" className="text-xs font-semibold text-foreground">
                                Locations (comma separated)
                            </label>
                            <Input
                                id="cs-locations"
                                type="text"
                                value={values.locations ?? ''}
                                onChange={(e) => setValue('locations', e.target.value)}
                                placeholder="Bangalore, Remote"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="cs-workMode" className="text-xs font-semibold text-foreground">
                                Work mode
                            </label>
                            <select
                                id="cs-workMode"
                                value={values.workMode ?? ''}
                                onChange={(e) => setValue('workMode', e.target.value)}
                                className={inputClass}
                            >
                                <option value="">—</option>
                                <option value="ONSITE">Onsite</option>
                                <option value="HYBRID">Hybrid</option>
                                <option value="REMOTE">Remote</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-1.5">
                            <label htmlFor="cs-salaryRange" className="text-xs font-semibold text-foreground">
                                Salary range
                            </label>
                            <Input
                                id="cs-salaryRange"
                                type="text"
                                value={values.salaryRange ?? ''}
                                onChange={(e) => setValue('salaryRange', e.target.value)}
                                placeholder="6-8 LPA"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="cs-salaryMin" className="text-xs font-semibold text-foreground">
                                Salary min
                            </label>
                            <Input
                                id="cs-salaryMin"
                                type="number"
                                min={0}
                                value={values.salaryMin ?? ''}
                                onChange={(e) => setValue('salaryMin', e.target.value)}
                                placeholder="600000"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="cs-salaryMax" className="text-xs font-semibold text-foreground">
                                Salary max
                            </label>
                            <Input
                                id="cs-salaryMax"
                                type="number"
                                min={0}
                                value={values.salaryMax ?? ''}
                                onChange={(e) => setValue('salaryMax', e.target.value)}
                                placeholder="800000"
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-1.5">
                            <label htmlFor="cs-employmentType" className="text-xs font-semibold text-foreground">
                                Employment type
                            </label>
                            <Input
                                id="cs-employmentType"
                                type="text"
                                value={values.employmentType ?? ''}
                                onChange={(e) => setValue('employmentType', e.target.value)}
                                placeholder="full-time"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="cs-stipend" className="text-xs font-semibold text-foreground">
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
                        <div className="space-y-1.5">
                            <label htmlFor="cs-jobFunction" className="text-xs font-semibold text-foreground">
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
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label htmlFor="cs-experienceMin" className="text-xs font-semibold text-foreground">
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
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="cs-experienceMax" className="text-xs font-semibold text-foreground">
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
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label htmlFor="cs-requiredSkills" className="text-xs font-semibold text-foreground">
                                Skills (comma separated)
                            </label>
                            <Input
                                id="cs-requiredSkills"
                                type="text"
                                value={values.requiredSkills ?? ''}
                                onChange={(e) => setValue('requiredSkills', e.target.value)}
                                placeholder="react, node"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="cs-tags" className="text-xs font-semibold text-foreground">
                                Tags (comma separated)
                            </label>
                            <Input
                                id="cs-tags"
                                type="text"
                                value={values.tags ?? ''}
                                onChange={(e) => setValue('tags', e.target.value)}
                                placeholder="fresher, 2025-batch"
                            />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label htmlFor="cs-allowedCourses" className="text-xs font-semibold text-foreground">
                                Eligible courses (comma separated)
                            </label>
                            <Input
                                id="cs-allowedCourses"
                                type="text"
                                value={values.allowedCourses ?? ''}
                                onChange={(e) => setValue('allowedCourses', e.target.value)}
                                placeholder="B.Tech, MCA"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="cs-allowedPassoutYears" className="text-xs font-semibold text-foreground">
                                Pass-out years (comma separated)
                            </label>
                            <Input
                                id="cs-allowedPassoutYears"
                                type="text"
                                value={values.allowedPassoutYears ?? ''}
                                onChange={(e) => setValue('allowedPassoutYears', e.target.value)}
                                placeholder="2024, 2025"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="cs-selectionProcess" className="text-xs font-semibold text-foreground">
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
                        <label htmlFor="cs-notesHighlights" className="text-xs font-semibold text-foreground">
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
                        <label htmlFor="cs-expiresAt" className="text-xs font-semibold text-foreground">
                            Apply by (date)
                        </label>
                        <Input
                            id="cs-expiresAt"
                            type="date"
                            value={values.expiresAt ?? ''}
                            onChange={(e) => setValue('expiresAt', e.target.value)}
                        />
                    </div>
                </div>
            ) : null}

            {type === 'WALKIN' ? (
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <label htmlFor="cs-dateRange" className="text-xs font-semibold text-foreground">
                            Date range <span className="text-destructive">*</span>
                        </label>
                        <Input
                            id="cs-dateRange"
                            type="text"
                            required
                            value={values.dateRange ?? ''}
                            onChange={(e) => setValue('dateRange', e.target.value)}
                            placeholder="2nd Feb - 6th Feb"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor="cs-timeRange" className="text-xs font-semibold text-foreground">
                            Time range
                        </label>
                        <Input
                            id="cs-timeRange"
                            type="text"
                            value={values.timeRange ?? ''}
                            onChange={(e) => setValue('timeRange', e.target.value)}
                            placeholder="11:00 AM - 1:00 PM"
                        />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                        <label htmlFor="cs-venueAddress" className="text-xs font-semibold text-foreground">
                            Venue address <span className="text-destructive">*</span>
                        </label>
                        <Input
                            id="cs-venueAddress"
                            type="text"
                            required
                            value={values.venueAddress ?? ''}
                            onChange={(e) => setValue('venueAddress', e.target.value)}
                            placeholder="Full walk-in venue"
                        />
                    </div>
                </div>
            ) : null}
        </div>
    );
}

// ─── Interview experience fields ─────────────────────────────────────────────

function InterviewFields({
    values,
    setValue,
    rounds,
    setRounds,
}: {
    values: Record<string, string>;
    setValue: (key: string, value: string) => void;
    rounds: Array<{ name: string; questions: string }>;
    setRounds: React.Dispatch<React.SetStateAction<Array<{ name: string; questions: string }>>>;
}) {
    const addRound = () => setRounds((prev) => [...prev, { name: '', questions: '' }]);
    const updateRound = (idx: number, field: 'name' | 'questions', value: string) =>
        setRounds((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
    const removeRound = (idx: number) => setRounds((prev) => prev.filter((_, i) => i !== idx));

    return (
        <div className="space-y-4">
            <div className="space-y-1.5">
                <label htmlFor="cs-iex-opp" className="text-xs font-semibold text-foreground">
                    Job link on FresherFlow <span className="text-destructive">*</span>
                </label>
                <Input
                    id="cs-iex-opp"
                    type="text"
                    required
                    value={values.opportunitySlug ?? ''}
                    onChange={(e) => setValue('opportunitySlug', e.target.value)}
                    placeholder="Paste the /jobs/… link or slug"
                />
                <p className="text-xs text-muted-foreground">
                    Experiences attach to a job listing, so others find them in context.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <label htmlFor="cs-iex-role" className="text-xs font-semibold text-foreground">
                        Role <span className="text-destructive">*</span>
                    </label>
                    <Input
                        id="cs-iex-role"
                        type="text"
                        required
                        value={values.iexRole ?? ''}
                        onChange={(e) => setValue('iexRole', e.target.value)}
                        placeholder="e.g. Software Engineer"
                    />
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="cs-iex-batch" className="text-xs font-semibold text-foreground">
                        Batch
                    </label>
                    <Input
                        id="cs-iex-batch"
                        type="number"
                        value={values.iexBatch ?? ''}
                        onChange={(e) => setValue('iexBatch', e.target.value)}
                        placeholder="e.g. 2026"
                    />
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="cs-iex-difficulty" className="text-xs font-semibold text-foreground">
                        Difficulty
                    </label>
                    <select
                        id="cs-iex-difficulty"
                        value={values.iexDifficulty ?? ''}
                        onChange={(e) => setValue('iexDifficulty', e.target.value)}
                        className={inputClass}
                    >
                        <option value="">Select</option>
                        <option value="EASY">Easy</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HARD">Hard</option>
                        <option value="VERY_HARD">Very Hard</option>
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="cs-iex-result" className="text-xs font-semibold text-foreground">
                        Result
                    </label>
                    <select
                        id="cs-iex-result"
                        value={values.iexResult ?? ''}
                        onChange={(e) => setValue('iexResult', e.target.value)}
                        className={inputClass}
                    >
                        <option value="">Select</option>
                        <option value="SELECTED">Selected</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="WAITING">Waiting</option>
                        <option value="WITHDRAWN">Withdrawn</option>
                    </select>
                </div>
            </div>

            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground">
                        Rounds <span className="text-destructive">*</span>
                    </label>
                    <button
                        type="button"
                        onClick={addRound}
                        className="text-xs font-semibold text-primary hover:underline"
                    >
                        + Add Round
                    </button>
                </div>
                {rounds.map((round, idx) => (
                    <div key={idx} className="space-y-1.5 rounded-lg bg-muted/20 p-2.5">
                        <div className="flex items-center gap-2">
                            <Input
                                value={round.name}
                                onChange={(e) => updateRound(idx, 'name', e.target.value)}
                                placeholder={`Round ${idx + 1} name`}
                            />
                            {rounds.length > 1 ? (
                                <button
                                    type="button"
                                    onClick={() => removeRound(idx)}
                                    className="text-xs text-muted-foreground hover:text-destructive"
                                >
                                    
                                </button>
                            ) : null}
                        </div>
                        <textarea
                            value={round.questions}
                            onChange={(e) => updateRound(idx, 'questions', e.target.value)}
                            rows={2}
                            placeholder="Questions asked (one per line)"
                            className={inputClass}
                        />
                    </div>
                ))}
            </div>

            <div className="space-y-1.5">
                <label htmlFor="cs-iex-notes" className="text-xs font-semibold text-foreground">
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
}

export function ContributeSheet({ open, onOpenChange, initialType = 'JOB', onSubmitted }: ContributeSheetProps) {
    const { user } = useAuth();
    const [type, setType] = useState<ContributeType | null>(initialType);
    const [values, setValues] = useState<Record<string, string>>({});
    const [rounds, setRounds] = useState<Array<{ name: string; questions: string }>>([
        { name: 'Online Assessment', questions: '' },
    ]);
    const [showDetails, setShowDetails] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [outcome, setOutcome] = useState<SubmitOutcome>(null);
    const [draftBanner, setDraftBanner] = useState<'none' | 'offer' | 'restored'>('none');

    const { hasDraft, clearDraft, restoreDraft } = useDraft(open ? type : null);

    // Reset per open, seeding from the trigger's type.
    useEffect(() => {
        if (open) {
            setType(initialType ?? 'JOB');
            setOutcome(null);
            setError(null);
            setValues({});
            setRounds([{ name: 'Online Assessment', questions: '' }]);
            setShowDetails(false);
            setDraftBanner('none');
        }
    }, [open, initialType]);

    const setValue = useCallback((key: string, value: string) => {
        setValues((prev) => {
            const next = { ...prev, [key]: value };
            if (type) writeDraft(type, next);
            return next;
        });
    }, [type]);

    // Offer draft restore as soon as a type is chosen with a saved draft present.
    useEffect(() => {
        if (!open || !type || outcome) return;
        const draft = readDraft(type);
        if (draft && Object.keys(draft).length > 0 && Object.keys(values).length === 0) {
            setDraftBanner('offer');
        }
    }, [open, type, outcome, values]);

    const restore = () => {
        const draft = restoreDraft();
        if (draft) {
            setValues(draft);
            setDraftBanner('restored');
        }
    };

    const discard = () => {
        clearDraft();
        setValues({});
        setDraftBanner('none');
    };

    const payload = useMemo(() => {
        const years = csv(values.allowedPassoutYears ?? '')
            .map(Number)
            .filter((y) => Number.isInteger(y) && y >= 1990 && y <= 2100);
        return {
            sourceUrl: (values.sourceUrl ?? '').trim(),
            applyUrl: (values.applyUrl ?? '').trim() || undefined,
            title: (values.title ?? '').trim(),
            company: (values.company ?? '').trim() || undefined,
            type:
                type === 'WALKIN'
                    ? ('WALKIN' as OpportunityType)
                    : ((values.oppType ?? 'JOB') as OpportunityType),
            description: (values.description ?? '').trim() || undefined,
            locations: (values.locations ?? '').trim() ? csv(values.locations).slice(0, 15) : undefined,
            workMode: (values.workMode ?? '') as WorkMode | '' as WorkMode | null,
            employmentType: (values.employmentType ?? '').trim() || null,
            salaryRange: (values.salaryRange ?? '').trim() || null,
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
            dateRange: (values.dateRange ?? '').trim() || null,
            timeRange: (values.timeRange ?? '').trim() || null,
            venueAddress: (values.venueAddress ?? '').trim() || null,
            submitterName: (values.submitterName ?? '').trim() || null,
            contact: (values.contact ?? '').trim() || null,
        };
    }, [type, values]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!type) return;
        setError(null);

        if (type !== 'INTERVIEW_EXPERIENCE') {
            if (!payload.sourceUrl || !payload.title) {
                setError('A job link and a title are required.');
                return;
            }
            if (payload.salaryMin !== null && payload.salaryMax !== null && payload.salaryMin > payload.salaryMax) {
                setError('Salary min cannot be greater than max.');
                return;
            }
        } else {
            const { slug, error: slugError } = extractOpportunitySlug(values.opportunitySlug ?? '');
            if (slugError) {
                setError(slugError);
                return;
            }
            if (!slug || !(values.iexRole ?? '').trim()) {
                setError('The job link and role are required.');
                return;
            }
            if (slug.length > 200) {
                setError('Job link is too long.');
                return;
            }
            if (rounds.length === 0 || !rounds[0].name.trim()) {
                setError('At least one round is required.');
                return;
            }
        }

        setSubmitting(true);
        try {
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
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not submit this. Try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const meta = type ? TYPE_META[type] : null;

    return (
        <Sheet
            open={open}
            onOpenChange={(next) => {
                if (!next && submitting) return; // don't close mid-submit
                onOpenChange(next);
            }}
        >
            <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
                <SheetHeader className="pr-8 text-left">
                    <SheetTitle>{meta ? meta.title : 'Contribute'}</SheetTitle>
                    <SheetDescription>{meta ? meta.description : null}</SheetDescription>
                </SheetHeader>

                {outcome ? (
                    <div className="mt-6 space-y-4">
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
                            <p className="text-xs text-muted-foreground">
                                {outcome.kind === 'existing'
                                    ? 'We folded your link into the existing listing.'
                                    : 'It has not been published yet. It appears in listings only after a moderator approves it.'}
                            </p>
                            {outcome.kind === 'existing' ? (
                                <Button asChild variant="outline" className="w-full">
                                    <a href={`/jobs/${outcome.slug}`}>View listing</a>
                                </Button>
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    Your share appears under “Your contributions” with its review
                                    status. The listing link unlocks once a moderator approves it.
                                </p>
                            )}
                        </div>
                        <Button variant="secondary" className="w-full" onClick={() => onOpenChange(false)}>
                            Done
                        </Button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                        {!user ? (
                            <p className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                                No account needed — guest posts are welcome. Sign in to track your
                                submissions in history.
                            </p>
                        ) : null}

                        {!type ? (
                            <div className="space-y-2">
                                {(Object.keys(TYPE_META) as ContributeType[]).map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setType(t)}
                                        className="w-full rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40"
                                    >
                                        <p className="text-sm font-semibold text-foreground">{TYPE_META[t].title}</p>
                                        <p className="text-xs text-muted-foreground">{TYPE_META[t].description}</p>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <>
                                {draftBanner === 'offer' && hasDraft ? (
                                    <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2">
                                        <p className="text-xs text-muted-foreground">You have a draft for this.</p>
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

                                {type === 'INTERVIEW_EXPERIENCE' ? (
                                    <InterviewFields
                                        values={values}
                                        setValue={setValue}
                                        rounds={rounds}
                                        setRounds={setRounds}
                                    />
                                ) : (
                                    <>
                                        <JobFields
                                            type={type}
                                            values={values}
                                            setValue={setValue}
                                            showDetails={showDetails}
                                        />
                                        {type === 'JOB' ? (
                                            <button
                                                type="button"
                                                onClick={() => setShowDetails((v) => !v)}
                                                className="text-xs font-bold uppercase tracking-widest text-primary hover:underline"
                                            >
                                                {showDetails ? 'Hide job details −' : 'Add job details +'}
                                            </button>
                                        ) : null}
                                    </>
                                )}

                                {!user ? (
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="space-y-1.5">
                                            <label htmlFor="cs-submitterName" className="text-xs font-semibold text-foreground">
                                                Your name (optional)
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
                                            <label htmlFor="cs-contact" className="text-xs font-semibold text-foreground">
                                                Contact (optional)
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
                                ) : null}

                                {error ? <p className="text-xs text-destructive">{error}</p> : null}

                                <div className="sticky bottom-0 -mx-6 border-t border-border bg-background px-6 py-3">
                                    <Button type="submit" disabled={submitting} className="w-full">
                                        {submitting
                                            ? 'Sharing…'
                                            : type === 'INTERVIEW_EXPERIENCE'
                                              ? 'Submit experience'
                                              : 'Share for review'}
                                    </Button>
                                </div>
                            </>
                        )}
                    </form>
                )}
            </SheetContent>
        </Sheet>
    );
}

export type { MySubmissionItem };
