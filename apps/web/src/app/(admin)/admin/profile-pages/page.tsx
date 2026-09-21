'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/core';
import { Button } from '@/ui/Button';
import { Badge } from '@/ui/Badge';
import { Skeleton } from '@/ui/Skeleton';
import { useAdmin } from '@/lib/auth/AdminContext';

interface IntroRequest {
    id: string;
    message: string | null;
    status: 'PENDING' | 'CONTACTED' | 'ARCHIVED';
    createdAt: string;
    candidate: { id: string; fullName: string | null; username: string | null; email: string | null };
    recruiter: { id: string; fullName: string | null; email: string | null } | null;
}

interface AdminProfile {
    userId: string;
    headline: string | null;
    gradCourse: string | null;
    gradYear: number | null;
    skills: string[];
    visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE';
    openToRecruiters: boolean;
    completionPercentage: number;
    views: number;
    user: { id: string; fullName: string | null; username: string | null; email: string | null; status: string };
}

const STATUS_TABS = ['ALL', 'PENDING', 'CONTACTED', 'ARCHIVED'] as const;

function extractEmail(text: string | null): string | null {
    if (!text) return null;
    const match = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
    return match ? match[0] : null;
}

export default function AdminProfilePagesPage() {
    const { isAuthenticated } = useAdmin();
    const router = useRouter();

    const [tab, setTab] = useState<'intros' | 'profiles'>('intros');
    const [statusFilter, setStatusFilter] = useState<(typeof STATUS_TABS)[number]>('PENDING');
    const [intros, setIntros] = useState<IntroRequest[]>([]);
    const [introStats, setIntroStats] = useState({ total: 0, pending: 0 });
    const [profiles, setProfiles] = useState<AdminProfile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        if (!isAuthenticated) return;
        setIsLoading(true);
        setError(null);
        try {
            if (tab === 'intros') {
                const res = await apiClient<{ success: boolean; data: IntroRequest[]; stats: { total: number; pending: number } }>(
                    `/api/admin/profiles/intro-requests?status=${statusFilter}`,
                );
                setIntros(res.data ?? []);
                if (res.stats) setIntroStats(res.stats);
            } else {
                const res = await apiClient<{ success: boolean; data: AdminProfile[] }>('/api/admin/profiles');
                setProfiles(res.data ?? []);
            }
        } catch {
            setError('Failed to load. Try again.');
        } finally {
            setIsLoading(false);
        }
    }, [isAuthenticated, tab, statusFilter]);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (isAuthenticated === false) router.replace('/admin/login');
    }, [isAuthenticated, router]);

    if (!isAuthenticated) return null;

    const updateStatus = async (id: string, status: string) => {
        setIntros((prev) => prev.map((i) => (i.id === id ? { ...i, status: status as IntroRequest['status'] } : i)));
        try {
            await apiClient(`/api/admin/profiles/intro-requests/${id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status }),
            });
        } catch {
            load();
        }
    };

    const setVisibility = async (userId: string, visibility: string) => {
        setProfiles((prev) =>
            prev.map((p) => (p.userId === userId ? { ...p, visibility: visibility as AdminProfile['visibility'] } : p)),
        );
        try {
            await apiClient(`/api/admin/profiles/${userId}/visibility`, {
                method: 'PATCH',
                body: JSON.stringify({ visibility }),
            });
        } catch {
            load();
        }
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold">Profile Pages</h1>
                    <p className="text-sm text-muted-foreground">
                        Intro requests: <span className="font-bold text-foreground">{introStats.total}</span> total ·{' '}
                        <span className="font-bold text-foreground">{introStats.pending}</span> pending — the Day-30 number.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant={tab === 'intros' ? 'default' : 'outline'} size="sm" onClick={() => setTab('intros')}>
                        Intro requests
                    </Button>
                    <Button variant={tab === 'profiles' ? 'default' : 'outline'} size="sm" onClick={() => setTab('profiles')}>
                        Profiles
                    </Button>
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-sm px-4 py-3">
                    {error}
                </div>
            )}

            {isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                    ))}
                </div>
            ) : tab === 'intros' ? (
                <>
                    <div className="flex gap-2">
                        {STATUS_TABS.map((s) => (
                            <Button
                                key={s}
                                variant={statusFilter === s ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setStatusFilter(s)}
                            >
                                {s}
                            </Button>
                        ))}
                    </div>
                    {intros.length === 0 ? (
                        <div className="rounded-xl border border-border/60 p-10 text-center text-sm text-muted-foreground">
                            No intro requests yet. Share profiles — every request is demand evidence.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {intros.map((intro) => (
                                <div key={intro.id} className="rounded-xl border border-border/60 bg-card p-4 space-y-2">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="text-sm">
                                            <span className="font-semibold">
                                                {intro.recruiter?.fullName || 'Anonymous recruiter'}
                                            </span>
                                            {(intro.recruiter?.email || extractEmail(intro.message)) && (
                                                <span className="text-muted-foreground">
                                                    {' '}· {intro.recruiter?.email || extractEmail(intro.message)}
                                                </span>
                                            )}
                                            <span className="text-muted-foreground"> · </span>
                                            <span className="font-medium">
                                                {intro.candidate.fullName}
                                                {intro.candidate.username ? ` (@${intro.candidate.username})` : ''}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant={intro.status === 'PENDING' ? 'warning' : intro.status === 'CONTACTED' ? 'success' : 'outline'}
                                            >
                                                {intro.status}
                                            </Badge>
                                            <select
                                                className="text-xs border border-border rounded-lg px-2 py-1 bg-background"
                                                value={intro.status}
                                                onChange={(e) => updateStatus(intro.id, e.target.value)}
                                            >
                                                <option value="PENDING">PENDING</option>
                                                <option value="CONTACTED">CONTACTED</option>
                                                <option value="ARCHIVED">ARCHIVED</option>
                                            </select>
                                        </div>
                                    </div>
                                    {intro.message && (
                                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans">
                                            {intro.message}
                                        </pre>
                                    )}
                                    <div className="text-xs text-muted-foreground">
                                        {new Date(intro.createdAt).toLocaleString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            ) : profiles.length === 0 ? (
                <div className="rounded-xl border border-border/60 p-10 text-center text-sm text-muted-foreground">
                    No published profiles yet.
                </div>
            ) : (
                <div className="rounded-xl border border-border/60 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3">Fresher</th>
                                <th className="px-4 py-3">Batch</th>
                                <th className="px-4 py-3">Skills</th>
                                <th className="px-4 py-3">Views</th>
                                <th className="px-4 py-3">Visibility</th>
                            </tr>
                        </thead>
                        <tbody>
                            {profiles.map((p) => (
                                <tr key={p.userId} className="border-t border-border/40">
                                    <td className="px-4 py-3">
                                        <a
                                            href={`/u/${p.user.username}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="font-medium text-primary hover:underline"
                                        >
                                            {p.user.fullName || p.user.username}
                                        </a>
                                        <div className="text-xs text-muted-foreground">{p.user.email}</div>
                                    </td>
                                    <td className="px-4 py-3">{p.gradYear ?? '—'}</td>
                                    <td className="px-4 py-3 max-w-48 truncate">
                                        {p.skills.slice(0, 3).join(', ')}
                                        {p.skills.length > 3 ? '…' : ''}
                                    </td>
                                    <td className="px-4 py-3 font-semibold">{p.views}</td>
                                    <td className="px-4 py-3">
                                        <select
                                            className="text-xs border border-border rounded-lg px-2 py-1 bg-background"
                                            value={p.visibility}
                                            onChange={(e) => setVisibility(p.userId, e.target.value)}
                                        >
                                            <option value="PUBLIC">PUBLIC</option>
                                            <option value="UNLISTED">UNLISTED</option>
                                            <option value="PRIVATE">PRIVATE</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
