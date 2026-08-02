'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthGate } from '@/lib/components/ProfileGate';
import { referralApi } from '@/lib/api/client';
import { SITE_URL } from '@/lib/utils/runtimeConfig';
import {
    ClipboardDocumentIcon,
    ShareIcon,
    CheckIcon,
    UserGroupIcon,
    CursorArrowRaysIcon,
    BoltIcon,
    TrophyIcon,
    LockClosedIcon,
    ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

type ReferralData = {
    referralCode: string;
    shareUrl: string;
    stats: { totalClicks: number; totalSignups: number; activated: number };
    referrals: Array<{
        id: string;
        fullName: string | null;
        joinedAt: string;
        completionPct: number;
        activated: boolean;
    }>;
    badges: Array<{
        badge: string;
        label: string;
        description: string;
        emoji: string;
        unlocked: boolean;
        earnedAt: string | null;
    }>;
};

const BADGE_THRESHOLDS: Record<string, number> = {
    FIRST_INVITE: 1, CONNECTOR: 3, CAMPUS_SCOUT: 5, GROWTH_NODE: 10, NETWORK_BUILDER: 25,
};

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
    return (
        <div className="rounded-xl border border-border/60 bg-card p-3 text-center space-y-1 shadow-sm">
            <div className="text-muted-foreground flex justify-center">{icon}</div>
            <p className="text-xl font-bold text-foreground">{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
        </div>
    );
}

function BadgeCard({ badge, signups }: { badge: ReferralData['badges'][0]; signups: number }) {
    const threshold = BADGE_THRESHOLDS[badge.badge] ?? 0;
    const progress = Math.min(100, Math.round((signups / threshold) * 100));
    return (
        <div className={`rounded-xl border p-3 space-y-2 transition-all ${badge.unlocked ? 'border-primary/30 bg-primary/5' : 'border-border/50 bg-background opacity-60'}`}>
            <div className="flex items-start justify-between">
                <span className="text-xl leading-none">{badge.emoji}</span>
                {badge.unlocked
                    ? <TrophyIcon className="w-3.5 h-3.5 text-primary" />
                    : <LockClosedIcon className="w-3.5 h-3.5 text-muted-foreground/40" />}
            </div>
            <div>
                <p className="text-xs font-bold text-foreground">{badge.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{badge.description}</p>
            </div>
            {!badge.unlocked && (
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
                </div>
            )}
            {badge.unlocked && badge.earnedAt && (
                <p className="text-[10px] text-primary font-semibold">
                    {new Date(badge.earnedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </p>
            )}
        </div>
    );
}

function ReferralRow({ referral }: { referral: ReferralData['referrals'][0] }) {
    return (
        <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary text-xs font-extrabold flex items-center justify-center shrink-0">
                {(referral.fullName || '?')[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{referral.fullName || 'User'}</p>
                <p className="text-[11px] text-muted-foreground">
                    Joined {new Date(referral.joinedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </p>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${referral.activated ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                {referral.activated ? 'Active' : `${referral.completionPct}%`}
            </span>
        </div>
    );
}

function ReferralPageContent() {
    const router = useRouter();
    const { user } = useAuth();
    const [data, setData] = useState<ReferralData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [copied, setCopied] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const response = await referralApi.getMe();
            setData(response as ReferralData);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void fetchData(); }, [fetchData]);

    if (!user) return null;

    const origin = typeof window !== 'undefined' ? window.location.origin : (SITE_URL || 'https://fresherflow.com');
    const shortUrl = data?.referralCode
        ? `${origin}/r/${data.referralCode}`
        : '…';

    const handleCopy = async () => {
        if (shortUrl === '…') return;
        try { await navigator.clipboard.writeText(shortUrl); }
        catch {
            const el = document.createElement('textarea');
            el.value = shortUrl;
            document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el);
        }
        toast.success('Invite link copied!');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = async () => {
        if (shortUrl === '…') return;
        const shareData = { title: 'Join FresherFlow', text: 'Find verified fresher jobs, internships & walk-ins.', url: shortUrl };
        if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
            try { await navigator.share(shareData); return; }
            catch (e) { if ((e as Error).name === 'AbortError') return; }
        }
        await handleCopy();
    };

    return (
        <div className="min-h-screen bg-background animate-in fade-in duration-500 pb-20 font-sans">
            <main className="max-w-5xl mx-auto px-4 md:px-8 py-5 md:py-10">
                <div className="flex items-center gap-3 mb-6 md:mb-8">
                    <button type="button" onClick={() => router.back()} className="p-1.5 -ml-1.5 rounded-lg hover:bg-muted transition-colors active:scale-95 group cursor-pointer" aria-label="Go back">
                        <ArrowLeftIcon className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-foreground">Referrals & Community</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">Invite freshers and track your impact</p>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 text-sm flex items-center justify-between">
                        <span>Failed to load referral data. Please try again.</span>
                        <button onClick={fetchData} className="px-3 py-1.5 bg-background text-foreground rounded-lg text-xs font-semibold hover:bg-muted border border-border transition-colors">
                            Retry
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6 md:gap-8 items-start">
                    {/* LEFT: Share panel */}
                    <div className="md:sticky md:top-8 space-y-4">
                        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm space-y-4">
                            <p className="text-xs font-bold text-muted-foreground capitalize tracking-widest mb-1.5">Your invite link</p>
                            {loading ? (
                                <div className="h-10 bg-muted/40 rounded-xl animate-pulse" />
                            ) : (
                                <div className="group relative flex items-center gap-2 bg-background border border-border/60 hover:border-primary/40 rounded-xl px-3 py-2.5 transition-colors shadow-inner overflow-hidden">
                                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                    <span className="flex-1 text-sm font-mono text-foreground truncate relative z-10 pl-1">{shortUrl}</span>
                                    <button onClick={handleCopy} className="relative z-10 shrink-0 p-1.5 rounded-lg bg-card border border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all active:scale-95 shadow-sm cursor-pointer" title="Copy">
                                        {copied
                                            ? <CheckIcon className="w-4 h-4 text-emerald-500 group-hover:text-primary-foreground" />
                                            : <ClipboardDocumentIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary" />}
                                    </button>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <button onClick={handleShare} className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-2 text-sm font-semibold hover:bg-primary/90 transition-colors active:scale-95 shadow-sm">
                                    <ShareIcon className="w-4 h-4" /> Share
                                </button>
                                <button onClick={handleCopy} className="flex-1 flex items-center justify-center gap-2 border border-border rounded-xl py-2 text-sm font-semibold hover:bg-muted transition-colors active:scale-95">
                                    {copied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
                                    {copied ? 'Copied!' : 'Copy link'}
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-3 gap-3 animate-pulse">
                                {[0, 1, 2].map(i => <div key={i} className="h-20 bg-muted rounded-xl" />)}
                            </div>
                        ) : data && (
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 gap-3">
                                    <StatCard icon={<CursorArrowRaysIcon className="w-4 h-4" />} label="Clicks" value={data.stats.totalClicks} />
                                    <StatCard icon={<UserGroupIcon className="w-4 h-4" />} label="Sign-ups" value={data.stats.totalSignups} />
                                    <StatCard icon={<BoltIcon className="w-4 h-4" />} label="Active" value={data.stats.activated} />
                                </div>
                                {data.stats.totalSignups === 0 && (
                                    <p className="text-[11px] text-muted-foreground text-center">
                                        Share your link to start tracking referrals
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* RIGHT: Badges + referral list */}
                    <div className="space-y-5">
                        <section className="space-y-2">
                            <h2 className="text-[11px] font-bold text-muted-foreground capitalize tracking-widest px-1">Badges</h2>
                            <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
                                {loading ? (
                                    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 animate-pulse">
                                        {[0, 1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-muted rounded-xl" />)}
                                    </div>
                                ) : data ? (
                                    <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {data.badges.map(b => (
                                            <BadgeCard key={b.badge} badge={b} signups={data.stats.totalSignups} />
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        </section>

                        <section className="space-y-2">
                            <h2 className="text-[11px] font-bold text-muted-foreground capitalize tracking-widest px-1">
                                Your referrals{data ? ` · ${data.referrals.length}` : ''}
                            </h2>
                            <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
                                {loading ? (
                                    <div className="divide-y divide-border/40">
                                        {[0, 1, 2].map(i => <div key={i} className="h-14 animate-pulse bg-muted/30" />)}
                                    </div>
                                ) : !data || data.referrals.length === 0 ? (
                                    <div className="py-12 text-center space-y-2">
                                        <p className="text-2xl">👋</p>
                                        <p className="text-sm font-medium text-foreground">No referrals yet</p>
                                        <p className="text-xs text-muted-foreground">Share your link to get started</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-border/40">
                                        {data.referrals.map(r => <ReferralRow key={r.id} referral={r} />)}
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function ReferralPage() {
    return (
        <AuthGate>
            <ReferralPageContent />
        </AuthGate>
    );
}
