'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/core';
import { Button } from '@/ui/Button';
import { Badge } from '@/ui/Badge';
import { Input } from '@/ui/Input';
import { Skeleton } from '@/ui/Skeleton';

interface CandidateItem {
    id: string;
    userId: string;
    headline: string | null;
    about: string | null;
    skills: string[];
    gradCourse: string | null;
    gradSpecialization: string | null;
    gradYear: number | null;
    availability: string | null;
    preferredCities: string[];
    workModes: string[];
    openToRecruiters: boolean;
    expectedCtc?: number | null;
    resumeUrl?: string | null;
    willingToRelocate?: boolean | null;
    user: {
        id: string;
        fullName: string | null;
        username: string | null;
        projects?: Array<{ id: string; title: string; skills: string[] }>;
    };
}

const BATCHES = ['ALL', '2026', '2025', '2024', '2023'];
const DEGREES = ['ALL', 'B.Tech', 'Degree', 'MCA', 'MBA', 'Diploma'];

const AVAILABILITY_LABEL: Record<string, string> = {
    IMMEDIATE: 'Actively looking',
    DAYS_15: 'Open',
    MONTH_1: 'Open',
};

export default function RecruiterBrowsePage() {
    const [skill, setSkill] = useState('');
    const [batch, setBatch] = useState('ALL');
    const [degree, setDegree] = useState('ALL');
    const [search, setSearch] = useState('');
    const [candidates, setCandidates] = useState<CandidateItem[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [introSent, setIntroSent] = useState<Record<string, boolean>>({});

    const load = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const qs = new URLSearchParams();
            if (skill.trim()) qs.set('skill', skill.trim());
            if (batch !== 'ALL') qs.set('batch', batch);
            if (degree !== 'ALL') qs.set('degree', degree);
            if (search.trim()) qs.set('search', search.trim());
            qs.set('page', String(page));
            qs.set('limit', '24');

            const res = await apiClient<{ success: boolean; data: CandidateItem[]; pagination: { total: number } }>(
                `/api/public/profiles/browse?${qs.toString()}`,
            );
            setCandidates(res.data ?? []);
            setTotal(res.pagination?.total ?? 0);
        } catch {
            setError('Could not load candidates. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, [skill, batch, degree, search, page]);

    useEffect(() => {
        const t = setTimeout(load, 250);
        return () => clearTimeout(t);
    }, [load]);

    const totalPages = Math.max(1, Math.ceil(total / 24));

    const sendIntro = async (c: CandidateItem) => {
        if (!c.user.username) return;
        try {
            await apiClient(`/api/public/profiles/${encodeURIComponent(c.user.username)}/intro-request`, {
                method: 'POST',
                body: JSON.stringify({ candidateId: c.user.id }),
            });
            setIntroSent((prev) => ({ ...prev, [c.user.id]: true }));
        } catch {
            alert('Could not send the request. Please try again.');
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
            <header className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Browse fresher profiles</h1>
                <p className="text-sm text-muted-foreground">
                    Filter by skill, batch, degree. Request an intro — the candidate gets your details directly.
                </p>
            </header>

            {/* Filters */}
            <section className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Input
                        placeholder="Skill (e.g. React)"
                        value={skill}
                        onChange={(e) => { setSkill(e.target.value); setPage(1); }}
                        className="h-9"
                    />
                    <Input
                        placeholder="Search headline/bio"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="h-9"
                    />
                    <select
                        className="h-9 rounded-xl border border-border bg-background px-2 text-sm"
                        value={batch}
                        onChange={(e) => { setBatch(e.target.value); setPage(1); }}
                    >
                        {BATCHES.map((b) => <option key={b} value={b}>{b === 'ALL' ? 'All batches' : b}</option>)}
                    </select>
                    <select
                        className="h-9 rounded-xl border border-border bg-background px-2 text-sm"
                        value={degree}
                        onChange={(e) => { setDegree(e.target.value); setPage(1); }}
                    >
                        {DEGREES.map((d) => <option key={d} value={d}>{d === 'ALL' ? 'All degrees' : d}</option>)}
                    </select>
                </div>
                <p className="text-xs text-muted-foreground">{total} candidates open to intros</p>
            </section>

            {error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm px-4 py-3">
                    {error}
                </div>
            )}

            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
                </div>
            ) : candidates.length === 0 ? (
                <div className="rounded-xl border border-border/60 p-10 text-center text-sm text-muted-foreground">
                    No candidates match these filters yet.
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {candidates.map((c) => (
                        <div key={c.id} className="rounded-2xl border border-border/60 bg-card p-5 space-y-3 flex flex-col">
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <h3 className="font-semibold text-foreground truncate">
                                        {c.user.fullName || c.user.username}
                                    </h3>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {c.gradCourse || 'Fresher'}{c.gradYear ? ` · ${c.gradYear}` : ''}
                                        {c.gradSpecialization ? ` · ${c.gradSpecialization}` : ''}
                                    </p>
                                </div>
                                {c.availability && (
                                    <Badge variant={c.availability === 'IMMEDIATE' ? 'default' : 'secondary'} className="shrink-0">
                                        {AVAILABILITY_LABEL[c.availability] || 'Open'}
                                    </Badge>
                                )}
                            </div>
                            {c.headline && <p className="text-sm text-muted-foreground line-clamp-2">{c.headline}</p>}
                            <div className="flex flex-wrap gap-1.5">
                                {c.skills.slice(0, 5).map((s) => <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>)}
                            </div>
                            {c.preferredCities?.length > 0 && (
                                <p className="text-xs text-muted-foreground"> {c.preferredCities.join(', ')}</p>
                            )}
                            <div className="flex-1" />
                            <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                                {c.user.username && (
                                    <a href={`/u/${c.user.username}`} target="_blank" rel="noopener noreferrer" className="flex-1">
                                        <Button variant="outline" size="sm" className="w-full">View profile</Button>
                                    </a>
                                )}
                                <Button
                                    size="sm"
                                    className="flex-1"
                                    disabled={introSent[c.user.id]}
                                    onClick={() => sendIntro(c)}
                                >
                                    {introSent[c.user.id] ? 'Request sent' : 'Request intro'}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-3">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                    <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
            )}
        </div>
    );
}
