'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { communityApi } from '@fresherflow/api-client';
import type { InterviewExperience, InterviewExperienceListResult } from '@fresherflow/types';
import { useAuth } from '@/lib/auth/AuthContext';
import { cn } from '@repo/ui/utils/cn';

const DIFFICULTY_COLORS: Record<string, string> = {
    EASY: 'bg-green-500/10 text-green-600',
    MEDIUM: 'bg-amber-500/10 text-amber-600',
    HARD: 'bg-orange-500/10 text-orange-600',
    VERY_HARD: 'bg-red-500/10 text-red-600',
};

const RESULT_COLORS: Record<string, string> = {
    SELECTED: 'bg-green-500/10 text-green-600',
    REJECTED: 'bg-red-500/10 text-red-600',
    WAITING: 'bg-amber-500/10 text-amber-600',
    WITHDRAWN: 'bg-muted text-muted-foreground',
};

type Props = { opportunityIdOrSlug: string };

export function InterviewExperiences({ opportunityIdOrSlug }: Props) {
    const pathname = usePathname();
    const { user } = useAuth();
    const [data, setData] = useState<InterviewExperienceListResult>({
        experiences: [], total: 0, summary: { total: 0, selected: 0, rejected: 0, waiting: 0, avgDifficulty: null },
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [showForm, setShowForm] = useState(false);

    const loginHref = `/login?next=${encodeURIComponent(pathname || `/jobs/${opportunityIdOrSlug}`)}`;

    const load = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const result = await communityApi.listInterviewExperiences(opportunityIdOrSlug);
            setData(result);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, [opportunityIdOrSlug]);

    useEffect(() => { void load(); }, [load]);

    return (
        <div className="space-y-4">
            {/* Summary cards */}
            {data.summary.total > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="rounded-xl bg-muted/30 p-3 text-center">
                        <div className="text-lg font-bold text-foreground">{data.summary.total}</div>
                        <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                    <div className="rounded-xl bg-success/5 p-3 text-center">
                        <div className="text-lg font-bold text-success">{data.summary.selected}</div>
                        <div className="text-xs text-muted-foreground">Selected</div>
                    </div>
                    <div className="rounded-xl bg-error/5 p-3 text-center">
                        <div className="text-lg font-bold text-error">{data.summary.rejected}</div>
                        <div className="text-xs text-muted-foreground">Rejected</div>
                    </div>
                    <div className="rounded-xl bg-warning/5 p-3 text-center">
                        <div className="text-lg font-bold text-warning">{data.summary.waiting}</div>
                        <div className="text-xs text-muted-foreground">Waiting</div>
                    </div>
                </div>
            )}

            {/* Add experience button */}
            {user ? (
                <button
                    type="button"
                    onClick={() => setShowForm(!showForm)}
                    className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-4 text-xs font-bold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90"
                >
                    {showForm ? 'Cancel' : '+ Share Interview Experience'}
                </button>
            ) : (
                <div className="rounded-xl border border-dashed border-border bg-card px-4 py-3 text-xs text-muted-foreground">
                    <Link href={loginHref} className="font-semibold text-primary hover:underline">Sign in</Link> to share your interview experience.
                </div>
            )}

            {/* Interview experience form */}
            {showForm && <InterviewForm opportunityIdOrSlug={opportunityIdOrSlug} onSubmitted={() => { setShowForm(false); void load(); }} />}

            {/* List */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/40" />)}
                </div>
            ) : error ? (
                <div className="rounded-xl border border-dashed border-border bg-card px-4 py-6 text-center text-xs text-muted-foreground">
                    Could not load interview experiences.{' '}
                    <button type="button" onClick={() => void load()} className="font-semibold text-primary hover:underline">Retry</button>
                </div>
            ) : data.experiences.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card px-4 py-6 text-center text-xs text-muted-foreground">
                    No interview experiences yet. Be the first to share!
                </div>
            ) : (
                <div className="space-y-3">
                    {data.experiences.map((exp) => (
                        <InterviewCard key={exp.id} experience={exp} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Interview Card ──────────────────────────────────────────────────────────

function InterviewCard({ experience: exp }: { experience: InterviewExperience }) {
    const { user } = useAuth();
    const rounds = (exp.rounds ?? []) as Array<{ name: string; questions: string[]; notes?: string }>;
    const [voteData, setVoteData] = useState<{ upvotes: number; downvotes: number; myVote: number | null }>({
        upvotes: exp.upvotes,
        downvotes: exp.downvotes,
        myVote: (exp as { myVote?: number | null }).myVote ?? null,
    });
    const [voting, setVoting] = useState(false);

    const handleVote = async (value: number) => {
        if (voting || !user) return;
        setVoting(true);
        const prev = voteData;
        setVoteData({
            upvotes: prev.myVote === value ? prev.upvotes - 1 : prev.myVote ? prev.upvotes : prev.upvotes + 1,
            downvotes: prev.myVote === -value ? prev.downvotes - 1 : prev.myVote ? prev.downvotes : prev.downvotes + (value === -1 ? 1 : 0),
            myVote: prev.myVote === value ? null : value,
        });
        try {
            const result = await communityApi.voteInterviewExperience(exp.id, value);
            setVoteData({ upvotes: result.upvotes, downvotes: result.downvotes, myVote: result.myVote });
        } catch {
            setVoteData(prev => ({ upvotes: exp.upvotes, downvotes: exp.downvotes, myVote: prev.myVote }));
        } finally {
            setVoting(false);
        }
    };

    return (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs">
                    <span className="font-semibold text-foreground">
                        @{exp.author.username || exp.author.fullName || 'Anonymous'}
                    </span>
                    {exp.batch && <span className="text-muted-foreground">Batch {exp.batch}</span>}
                    <span className="text-muted-foreground">
                        {formatDistanceToNow(new Date(exp.createdAt), { addSuffix: true })}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    {exp.difficulty && (
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', DIFFICULTY_COLORS[exp.difficulty] ?? 'bg-muted text-muted-foreground')}>
                            {exp.difficulty}
                        </span>
                    )}
                    {exp.result && (
                        <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold', RESULT_COLORS[exp.result] ?? 'bg-muted text-muted-foreground')}>
                            {exp.result}
                        </span>
                    )}
                </div>
            </div>

            <div className="text-xs text-muted-foreground">
                Role: <span className="font-semibold text-foreground">{exp.role}</span>
            </div>

            {rounds.length > 0 && (
                <div className="space-y-2">
                    {rounds.map((round, idx) => (
                        <div key={idx} className="rounded-lg bg-muted/20 p-2.5 text-xs space-y-1">
                            <div className="font-bold text-foreground">Round {idx + 1}: {round.name}</div>
                            {round.questions.length > 0 && (
                                <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                                    {round.questions.map((q, qi) => <li key={qi}>{q}</li>)}
                                </ul>
                            )}
                            {round.notes && <p className="text-muted-foreground italic">{round.notes}</p>}
                        </div>
                    ))}
                </div>
            )}

            {exp.overallNotes && (
                <p className="text-sm text-foreground whitespace-pre-wrap break-words">{exp.overallNotes}</p>
            )}

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {user ? (
                    <>
                        <button
                            type="button"
                            onClick={() => void handleVote(1)}
                            className={cn('font-semibold transition-colors', voteData.myVote === 1 ? 'text-primary' : 'hover:text-primary')}
                        >
                            ▲ {voteData.upvotes}
                        </button>
                        <button
                            type="button"
                            onClick={() => void handleVote(-1)}
                            className={cn('font-semibold transition-colors', voteData.myVote === -1 ? 'text-destructive' : 'hover:text-destructive')}
                        >
                            ▼ {voteData.downvotes}
                        </button>
                    </>
                ) : (
                    <>
                        <span>▲ {voteData.upvotes}</span>
                        <span>▼ {voteData.downvotes}</span>
                    </>
                )}
            </div>
        </div>
    );
}

// ─── Interview Form ──────────────────────────────────────────────────────────

function InterviewForm({ opportunityIdOrSlug, onSubmitted }: { opportunityIdOrSlug: string; onSubmitted: () => void }) {
    const [role, setRole] = useState('');
    const [batch, setBatch] = useState('');
    const [difficulty, setDifficulty] = useState('');
    const [result, setResult] = useState('');
    const [overallNotes, setOverallNotes] = useState('');
    const [rounds, setRounds] = useState<Array<{ name: string; questions: string }>>([
        { name: 'Online Assessment', questions: '' },
    ]);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const addRound = () => setRounds((prev) => [...prev, { name: '', questions: '' }]);
    const updateRound = (idx: number, field: 'name' | 'questions', value: string) => {
        setRounds((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
    };
    const removeRound = (idx: number) => setRounds((prev) => prev.filter((_, i) => i !== idx));

    const handleSubmit = async () => {
        if (!role.trim()) { setError('Role is required.'); return; }
        if (rounds.length === 0 || !rounds[0].name.trim()) { setError('At least one round is required.'); return; }
        setSubmitting(true);
        setError(null);
        try {
            await communityApi.createInterviewExperience({
                opportunityId: opportunityIdOrSlug,
                role: role.trim(),
                batch: batch ? Number(batch) : undefined,
                difficulty: difficulty as 'EASY' | 'MEDIUM' | 'HARD' | 'VERY_HARD' | undefined,
                result: result as 'SELECTED' | 'REJECTED' | 'WAITING' | 'WITHDRAWN' | undefined,
                overallNotes: overallNotes.trim() || undefined,
                rounds: rounds
                    .filter((r) => r.name.trim())
                    .map((r) => ({
                        name: r.name.trim(),
                        questions: r.questions.split('\n').map((q) => q.trim()).filter(Boolean),
                    })),
            });
            onSubmitted();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to submit.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">Role *</label>
                    <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Software Engineer"
                        className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30" />
                </div>
                <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">Batch</label>
                    <input value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="e.g. 2026" type="number"
                        className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30" />
                </div>
                <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">Difficulty</label>
                    <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30">
                        <option value="">Select</option>
                        <option value="EASY">Easy</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HARD">Hard</option>
                        <option value="VERY_HARD">Very Hard</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs font-semibold text-foreground mb-1 block">Result</label>
                    <select value={result} onChange={(e) => setResult(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30">
                        <option value="">Select</option>
                        <option value="SELECTED">Selected</option>
                        <option value="REJECTED">Rejected</option>
                        <option value="WAITING">Waiting</option>
                        <option value="WITHDRAWN">Withdrawn</option>
                    </select>
                </div>
            </div>

            {/* Rounds */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-foreground">Rounds *</label>
                    <button type="button" onClick={addRound} className="text-xs font-semibold text-primary hover:underline">+ Add Round</button>
                </div>
                {rounds.map((round, idx) => (
                    <div key={idx} className="rounded-lg bg-muted/20 p-2.5 space-y-1.5">
                        <div className="flex items-center gap-2">
                            <input value={round.name} onChange={(e) => updateRound(idx, 'name', e.target.value)}
                                placeholder={`Round ${idx + 1} name`}
                                className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30" />
                            {rounds.length > 1 && (
                                <button type="button" onClick={() => removeRound(idx)} className="text-muted-foreground hover:text-destructive text-xs"></button>
                            )}
                        </div>
                        <textarea value={round.questions} onChange={(e) => updateRound(idx, 'questions', e.target.value)}
                            rows={2} placeholder="Questions asked (one per line)"
                            className="w-full rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30" />
                    </div>
                ))}
            </div>

            <div>
                <label className="text-xs font-semibold text-foreground mb-1 block">Overall Notes</label>
                <textarea value={overallNotes} onChange={(e) => setOverallNotes(e.target.value)} rows={3}
                    placeholder="Any tips or overall experience..."
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30" />
            </div>

            <button type="button" onClick={() => void handleSubmit()} disabled={submitting}
                className="inline-flex h-8 items-center justify-center rounded-lg bg-primary px-4 text-xs font-bold uppercase tracking-widest text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50">
                {submitting ? 'Submitting…' : 'Submit Experience'}
            </button>
        </div>
    );
}
