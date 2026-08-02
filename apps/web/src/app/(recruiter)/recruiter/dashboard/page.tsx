'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import {
    UsersIcon,
    BookmarkIcon,
    EyeIcon,
    SparklesIcon,
    MagnifyingGlassIcon,
    ArrowRightIcon,
    BuildingOfficeIcon,
} from '@heroicons/react/24/outline';
import { fetchRecruiterCandidates, fetchSavedCandidates } from '@/lib/api/recruiter';

export default function RecruiterDashboardPage() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { user } = useAuth();
    const [optedInCount, setOptedInCount] = useState<number>(0);
    const [savedCount, setSavedCount] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        async function loadStats() {
            setLoading(true);
            try {
                const [candidatesRes, savedRes] = await Promise.all([
                    fetchRecruiterCandidates({ limit: 1 }),
                    fetchSavedCandidates()
                ]);

                if (isMounted) {
                    if (candidatesRes?.pagination) {
                        setOptedInCount(candidatesRes.pagination.total || 0);
                    }
                    if (savedRes?.data) {
                        setSavedCount(savedRes.data.length || 0);
                    }
                }
            } catch {
                // Ignore API failures on unauthenticated state
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        void loadStats();
        return () => { isMounted = false; };
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 pb-20 pt-6 md:pt-8 font-sans">
            <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-6">

                {/* Top Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border/50">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20 flex items-center gap-1">
                                <BuildingOfficeIcon className="w-3.5 h-3.5" /> Verified Recruiter Workspace
                            </span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                            Recruiter Workspace
                        </h1>
                        <p className="text-xs md:text-sm text-muted-foreground">
                            Discover fresher talent and track Apply to Hire interest requests.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link
                            href="/recruiter/candidates"
                            className="px-5 py-2.5 bg-primary text-primary-foreground text-xs font-bold rounded-xl shadow-md shadow-primary/20 hover:opacity-90 transition-all flex items-center gap-2"
                        >
                            <MagnifyingGlassIcon className="w-4 h-4" />
                            <span>Find Candidates</span>
                        </Link>
                    </div>
                </div>

                {/* Stat Cards Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-card border border-border/70 rounded-3xl p-5 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Opted-in Candidates
                            </span>
                            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                <UsersIcon className="w-5 h-5" />
                            </div>
                        </div>
                        <div>
                            <p className="text-3xl font-extrabold text-foreground tracking-tight">
                                {loading ? '...' : optedInCount}
                            </p>
                            <p className="text-[11px] font-semibold text-muted-foreground mt-1">Active freshers open to recruiters</p>
                        </div>
                    </div>

                    <div className="bg-card border border-border/70 rounded-3xl p-5 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Saved Candidates
                            </span>
                            <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <BookmarkIcon className="w-5 h-5" />
                            </div>
                        </div>
                        <div>
                            <p className="text-3xl font-extrabold text-foreground tracking-tight">
                                {loading ? '...' : savedCount}
                            </p>
                            <p className="text-[11px] font-semibold text-muted-foreground mt-1">In your saved talent pool</p>
                        </div>
                    </div>

                    <div className="bg-card border border-border/70 rounded-3xl p-5 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Apply-to-Hire Sent
                            </span>
                            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                                <SparklesIcon className="w-5 h-5" />
                            </div>
                        </div>
                        <div>
                            <p className="text-3xl font-extrabold text-foreground tracking-tight">0</p>
                            <p className="text-[11px] font-semibold text-muted-foreground mt-1">
                                Hiring requests sent
                            </p>
                        </div>
                    </div>

                    <div className="bg-card border border-border/70 rounded-3xl p-5 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Profile Views
                            </span>
                            <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <EyeIcon className="w-5 h-5" />
                            </div>
                        </div>
                        <div>
                            <p className="text-3xl font-extrabold text-foreground tracking-tight">0</p>
                            <p className="text-[11px] font-semibold text-muted-foreground mt-1">Candidate profiles viewed</p>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                    {/* Left Column: Recent Apply-to-Hire Requests (8 cols) */}
                    <div className="lg:col-span-8 bg-card border border-border/70 rounded-3xl p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-border/40">
                            <div className="flex items-center gap-2">
                                <SparklesIcon className="w-5 h-5 text-primary" />
                                <h2 className="text-base font-bold text-foreground">Recent Apply-to-Hire Requests</h2>
                            </div>
                            <Link
                                href="/recruiter/candidates"
                                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                            >
                                Find candidates <ArrowRightIcon className="w-3.5 h-3.5" />
                            </Link>
                        </div>

                        {/* Empty state for requests */}
                        <div className="bg-background border border-dashed border-border/60 rounded-2xl p-8 text-center space-y-3">
                            <SparklesIcon className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                            <h3 className="text-sm font-bold text-foreground">No hiring requests sent yet</h3>
                            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                Search opted-in fresher candidates and click &quot;Apply to Hire&quot; to express hiring interest.
                            </p>
                            <Link
                                href="/recruiter/candidates"
                                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl shadow-sm hover:opacity-90 transition-opacity"
                            >
                                <span>Browse Candidate Pool</span>
                                <ArrowRightIcon className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    </div>

                    {/* Right Column: Sourcing Guidelines (4 cols) */}
                    <div className="lg:col-span-4 bg-card border border-border/70 rounded-3xl p-6 shadow-sm space-y-4">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sourcing Guidelines</h2>
                        <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                            <div className="p-3 bg-muted/40 border border-border/50 rounded-2xl space-y-1">
                                <p className="font-bold text-foreground"> Intent-Gated Contact</p>
                                <p className="text-[11px]">
                                    Candidate emails and phone numbers are kept private until they accept your Apply to Hire request.
                                </p>
                            </div>
                            <div className="p-3 bg-muted/40 border border-border/50 rounded-2xl space-y-1">
                                <p className="font-bold text-foreground"> Verified Freshers Only</p>
                                <p className="text-[11px]">
                                    Candidates in discovery are active freshers from verified graduation batches (2024–2027).
                                </p>
                            </div>
                        </div>

                        <Link
                            href="/recruiter/candidates"
                            className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-2xl text-xs hover:opacity-95 transition-opacity flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-primary/20"
                        >
                            <span>Search Candidate Pool</span>
                            <ArrowRightIcon className="w-4 h-4" />
                        </Link>
                    </div>

                </div>

            </div>
        </div>
    );
}
