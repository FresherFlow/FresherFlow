'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { communityApi } from '@fresherflow/api-client';
import type { OpportunityType, WorkMode } from '@fresherflow/types';
import { useAuth } from '@/lib/auth/AuthContext';

type Result =
    | { kind: 'created'; slug: string }
    | { kind: 'existing'; slug: string }
    | null;

const csv = (v: string) =>
    v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 30);

export function PostJobForm() {
    const { user } = useAuth();
    const [sourceUrl, setSourceUrl] = useState('');
    const [applyUrl, setApplyUrl] = useState('');
    const [title, setTitle] = useState('');
    const [company, setCompany] = useState('');
    const [companyWebsite, setCompanyWebsite] = useState('');
    const [type, setType] = useState<'JOB' | 'INTERNSHIP' | 'WALKIN'>('JOB');
    const [description, setDescription] = useState('');
    const [locations, setLocations] = useState('');
    const [workMode, setWorkMode] = useState('');
    const [employmentType, setEmploymentType] = useState('');
    const [salaryRange, setSalaryRange] = useState('');
    const [salaryMin, setSalaryMin] = useState('');
    const [salaryMax, setSalaryMax] = useState('');
    const [stipend, setStipend] = useState('');
    const [experienceMin, setExperienceMin] = useState('');
    const [experienceMax, setExperienceMax] = useState('');
    const [requiredSkills, setRequiredSkills] = useState('');
    const [tags, setTags] = useState('');
    const [allowedCourses, setAllowedCourses] = useState('');
    const [allowedPassoutYears, setAllowedPassoutYears] = useState('');
    const [jobFunction, setJobFunction] = useState('');
    const [selectionProcess, setSelectionProcess] = useState('');
    const [notesHighlights, setNotesHighlights] = useState('');
    const [expiresAt, setExpiresAt] = useState('');
    const [dateRange, setDateRange] = useState('');
    const [timeRange, setTimeRange] = useState('');
    const [venueAddress, setVenueAddress] = useState('');
    const [contact, setContact] = useState('');
    const [submitterName, setSubmitterName] = useState('');
    const [showDetails, setShowDetails] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<Result>(null);

    const onSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError(null);
        setResult(null);

        if (!sourceUrl.trim() || !title.trim()) {
            setError('A source link and a title are required.');
            return;
        }

        setSubmitting(true);
        try {
            const numOrNull = (v: string) => (v.trim() === '' ? null : Number(v));
            const years = csv(allowedPassoutYears)
                .map(Number)
                .filter((y) => Number.isInteger(y) && y >= 1990 && y <= 2100);
            const res = await communityApi.submitJob({
                sourceUrl: sourceUrl.trim(),
                applyUrl: applyUrl.trim() || undefined,
                title: title.trim(),
                company: company.trim() || undefined,
                companyWebsite: companyWebsite.trim() || undefined,
                type: type as unknown as OpportunityType,
                description: description.trim() || undefined,
                locations: locations.trim() ? csv(locations).slice(0, 15) : undefined,
                workMode: (workMode || null) as unknown as WorkMode | null,
                employmentType: employmentType.trim() || null,
                salaryRange: salaryRange.trim() || null,
                salaryMin: numOrNull(salaryMin),
                salaryMax: numOrNull(salaryMax),
                stipend: stipend.trim() || null,
                experienceMin: experienceMin.trim() === '' ? null : Number(experienceMin),
                experienceMax: experienceMax.trim() === '' ? null : Number(experienceMax),
                requiredSkills: requiredSkills.trim() ? csv(requiredSkills) : undefined,
                tags: tags.trim() ? csv(tags).slice(0, 20) : undefined,
                allowedCourses: allowedCourses.trim() ? csv(allowedCourses).slice(0, 20) : undefined,
                allowedPassoutYears: years.length ? years : undefined,
                jobFunction: jobFunction.trim() || null,
                selectionProcess: selectionProcess.trim() || null,
                notesHighlights: notesHighlights.trim() || null,
                expiresAt: expiresAt.trim() || null,
                dateRange: dateRange.trim() || null,
                timeRange: timeRange.trim() || null,
                venueAddress: venueAddress.trim() || null,
                contact: contact.trim() || null,
                submitterName: submitterName.trim() || null,
            });
            setResult(
                res.existing
                    ? { kind: 'existing', slug: res.slug }
                    : { kind: 'created', slug: res.slug }
            );
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not submit this job.');
        } finally {
            setSubmitting(false);
        }
    };

    if (result) {
        return (
            <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-3">
                <h2 className="text-base font-bold text-foreground">
                    {result.kind === 'existing' ? 'Looks like we already have this job' : 'Job shared'}
                </h2>
                <p className="text-xs text-muted-foreground">
                    {result.kind === 'existing'
                        ? 'We folded your link into the existing listing.'
                        : 'Thanks — your submission is under review and will appear shortly.'}
                </p>
                {result.slug ? (
                    <Link
                        href={`/jobs/${result.slug}`}
                        className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-6 text-xs font-bold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90"
                    >
                        View job
                    </Link>
                ) : null}
            </div>
        );
    }

    const inputClass =
        'w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30';

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            {!user ? (
                <p className="rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    No account needed — guest posts are welcome. <Link href={`/login?next=${encodeURIComponent('/contribute')}`} className="font-semibold text-primary hover:underline">Sign in</Link> to track your shares.
                </p>
            ) : null}

            <div className="space-y-1.5">
                <label htmlFor="sourceUrl" className="text-xs font-semibold text-foreground">
                    Job link <span className="text-destructive">*</span>
                </label>
                <input
                    id="sourceUrl"
                    type="url"
                    required
                    value={sourceUrl}
                    onChange={e => setSourceUrl(e.target.value)}
                    placeholder="https://careers.example.com/jobs/123"
                    className={inputClass}
                />
            </div>

            <div className="space-y-1.5">
                <label htmlFor="title" className="text-xs font-semibold text-foreground">
                    Title <span className="text-destructive">*</span>
                </label>
                <input
                    id="title"
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Software Engineer"
                    className={inputClass}
                />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <label htmlFor="company" className="text-xs font-semibold text-foreground">
                        Company
                    </label>
                    <input
                        id="company"
                        type="text"
                        value={company}
                        onChange={e => setCompany(e.target.value)}
                        placeholder="Acme"
                        className={inputClass}
                    />
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="applyUrl" className="text-xs font-semibold text-foreground">
                        Apply link
                    </label>
                    <input
                        id="applyUrl"
                        type="url"
                        value={applyUrl}
                        onChange={e => setApplyUrl(e.target.value)}
                        placeholder="https://…"
                        className={inputClass}
                    />
                </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <label htmlFor="type" className="text-xs font-semibold text-foreground">
                        Type
                    </label>
                    <select id="type" value={type} onChange={e => setType(e.target.value as 'JOB' | 'INTERNSHIP' | 'WALKIN')} className={inputClass}>
                        <option value="JOB">Job</option>
                        <option value="INTERNSHIP">Internship</option>
                        <option value="WALKIN">Walk-in</option>
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="companyWebsite" className="text-xs font-semibold text-foreground">
                        Company website
                    </label>
                    <input
                        id="companyWebsite"
                        type="url"
                        value={companyWebsite}
                        onChange={e => setCompanyWebsite(e.target.value)}
                        placeholder="https://acme.com"
                        className={inputClass}
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <label htmlFor="description" className="text-xs font-semibold text-foreground">
                    Description
                </label>
                <textarea
                    id="description"
                    rows={4}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Role, eligibility, how to apply…"
                    className={inputClass}
                />
            </div>

            <button
                type="button"
                onClick={() => setShowDetails(v => !v)}
                className="text-xs font-bold uppercase tracking-widest text-primary hover:underline"
            >
                {showDetails ? 'Hide job details −' : 'Add job details +'}
            </button>

            {showDetails ? (
                <div className="space-y-4 rounded-2xl border border-border p-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label htmlFor="locations" className="text-xs font-semibold text-foreground">Locations (comma separated)</label>
                            <input id="locations" type="text" value={locations} onChange={e => setLocations(e.target.value)} placeholder="Bangalore, Remote" className={inputClass} />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="workMode" className="text-xs font-semibold text-foreground">Work mode</label>
                            <select id="workMode" value={workMode} onChange={e => setWorkMode(e.target.value)} className={inputClass}>
                                <option value="">—</option>
                                <option value="ONSITE">Onsite</option>
                                <option value="HYBRID">Hybrid</option>
                                <option value="REMOTE">Remote</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-1.5">
                            <label htmlFor="salaryRange" className="text-xs font-semibold text-foreground">Salary range</label>
                            <input id="salaryRange" type="text" value={salaryRange} onChange={e => setSalaryRange(e.target.value)} placeholder="6-8 LPA" className={inputClass} />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="salaryMin" className="text-xs font-semibold text-foreground">Salary min</label>
                            <input id="salaryMin" type="number" min={0} value={salaryMin} onChange={e => setSalaryMin(e.target.value)} placeholder="600000" className={inputClass} />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="salaryMax" className="text-xs font-semibold text-foreground">Salary max</label>
                            <input id="salaryMax" type="number" min={0} value={salaryMax} onChange={e => setSalaryMax(e.target.value)} placeholder="800000" className={inputClass} />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-1.5">
                            <label htmlFor="employmentType" className="text-xs font-semibold text-foreground">Employment type</label>
                            <input id="employmentType" type="text" value={employmentType} onChange={e => setEmploymentType(e.target.value)} placeholder="full-time" className={inputClass} />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="stipend" className="text-xs font-semibold text-foreground">Stipend</label>
                            <input id="stipend" type="text" value={stipend} onChange={e => setStipend(e.target.value)} placeholder="10k/month" className={inputClass} />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="jobFunction" className="text-xs font-semibold text-foreground">Job function</label>
                            <input id="jobFunction" type="text" value={jobFunction} onChange={e => setJobFunction(e.target.value)} placeholder="Engineering" className={inputClass} />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label htmlFor="experienceMin" className="text-xs font-semibold text-foreground">Experience min (yrs)</label>
                            <input id="experienceMin" type="number" min={0} max={30} step="0.5" value={experienceMin} onChange={e => setExperienceMin(e.target.value)} className={inputClass} />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="experienceMax" className="text-xs font-semibold text-foreground">Experience max (yrs)</label>
                            <input id="experienceMax" type="number" min={0} max={30} step="0.5" value={experienceMax} onChange={e => setExperienceMax(e.target.value)} className={inputClass} />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label htmlFor="requiredSkills" className="text-xs font-semibold text-foreground">Skills (comma separated)</label>
                            <input id="requiredSkills" type="text" value={requiredSkills} onChange={e => setRequiredSkills(e.target.value)} placeholder="react, node" className={inputClass} />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="tags" className="text-xs font-semibold text-foreground">Tags (comma separated)</label>
                            <input id="tags" type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="fresher, 2025-batch" className={inputClass} />
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <label htmlFor="allowedCourses" className="text-xs font-semibold text-foreground">Eligible courses (comma separated)</label>
                            <input id="allowedCourses" type="text" value={allowedCourses} onChange={e => setAllowedCourses(e.target.value)} placeholder="B.Tech, MCA" className={inputClass} />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="allowedPassoutYears" className="text-xs font-semibold text-foreground">Pass-out years (comma separated)</label>
                            <input id="allowedPassoutYears" type="text" value={allowedPassoutYears} onChange={e => setAllowedPassoutYears(e.target.value)} placeholder="2024, 2025" className={inputClass} />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="selectionProcess" className="text-xs font-semibold text-foreground">Selection process</label>
                        <textarea id="selectionProcess" rows={2} value={selectionProcess} onChange={e => setSelectionProcess(e.target.value)} placeholder="Aptitude > Technical > HR" className={inputClass} />
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="notesHighlights" className="text-xs font-semibold text-foreground">Notes / highlights</label>
                        <textarea id="notesHighlights" rows={2} value={notesHighlights} onChange={e => setNotesHighlights(e.target.value)} placeholder="Bond, training, shifts…" className={inputClass} />
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor="expiresAt" className="text-xs font-semibold text-foreground">Apply by (date)</label>
                        <input id="expiresAt" type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className={inputClass} />
                    </div>

                    {type === 'WALKIN' ? (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <label htmlFor="dateRange" className="text-xs font-semibold text-foreground">Date range</label>
                                <input id="dateRange" type="text" value={dateRange} onChange={e => setDateRange(e.target.value)} placeholder="2nd Feb - 6th Feb" className={inputClass} />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="timeRange" className="text-xs font-semibold text-foreground">Time range</label>
                                <input id="timeRange" type="text" value={timeRange} onChange={e => setTimeRange(e.target.value)} placeholder="11:00 AM - 1:00 PM" className={inputClass} />
                            </div>
                            <div className="space-y-1.5 sm:col-span-2">
                                <label htmlFor="venueAddress" className="text-xs font-semibold text-foreground">Venue address</label>
                                <input id="venueAddress" type="text" value={venueAddress} onChange={e => setVenueAddress(e.target.value)} placeholder="Full walk-in venue" className={inputClass} />
                            </div>
                        </div>
                    ) : null}
                </div>
            ) : null}

            {!user ? (
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <label htmlFor="submitterName" className="text-xs font-semibold text-foreground">Your name (optional)</label>
                        <input id="submitterName" type="text" value={submitterName} onChange={e => setSubmitterName(e.target.value)} placeholder="Jane" className={inputClass} />
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor="contact" className="text-xs font-semibold text-foreground">Contact (optional)</label>
                        <input id="contact" type="text" value={contact} onChange={e => setContact(e.target.value)} placeholder="email or handle" className={inputClass} />
                    </div>
                </div>
            ) : null}

            {error && <p className="text-xs text-destructive">{error}</p>}

            <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary text-xs font-bold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50 sm:w-auto sm:px-8"
            >
                {submitting ? 'Sharing…' : 'Share job'}
            </button>
        </form>
    );
}
