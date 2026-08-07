'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    MagnifyingGlassIcon,
    FunnelIcon,
    MapPinIcon,
    ClockIcon,
    AcademicCapIcon,
    SparklesIcon,
    StarIcon,
    CheckBadgeIcon,
    ArrowRightIcon,
    ArrowPathIcon,
    NoSymbolIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import { SkillPill } from '@/ui/SkillPill';
import toast from 'react-hot-toast';
import { Select } from '@/ui/Select';
import ApplyToHireModal from '@/app/u/[username]/ApplyToHireModal';
import {
    fetchRecruiterCandidates,
    fetchSavedCandidates,
    saveCandidateToPool,
    removeSavedCandidateFromPool,
    CandidateProfileItem,
} from '@/lib/api/recruiter';

export default function RecruiterCandidateSearchPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedYear, setSelectedYear] = useState<string>('ALL');
    const [selectedDegree, setSelectedDegree] = useState<string>('ALL');
    const [candidates, setCandidates] = useState<CandidateProfileItem[]>([]);
    const [savedCandidateIds, setSavedCandidateIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [hireModalCandidate, setHireModalCandidate] = useState<CandidateProfileItem | null>(null);

    const loadCandidates = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetchRecruiterCandidates({
                search: searchQuery.trim() || undefined,
                batch: selectedYear !== 'ALL' ? selectedYear : undefined,
                degree: selectedDegree !== 'ALL' ? selectedDegree : undefined,
            });
            if (res.success) {
                setCandidates(res.data || []);
            }
        } catch {
            // Silence API fallback or offline
            setCandidates([]);
        } finally {
            setLoading(false);
        }
    }, [searchQuery, selectedYear, selectedDegree]);

    const loadSavedPool = useCallback(async () => {
        try {
            const res = await fetchSavedCandidates();
            if (res.success && Array.isArray(res.data)) {
                setSavedCandidateIds(new Set(res.data.map((item) => item.candidateId)));
            }
        } catch {
            // Ignore
        }
    }, []);

    useEffect(() => {
        void loadCandidates();
        void loadSavedPool();
    }, [loadCandidates, loadSavedPool]);

    const toggleSave = async (candidateUserId: string) => {
        const isSaved = savedCandidateIds.has(candidateUserId);
        setSavedCandidateIds((prev) => {
            const next = new Set(prev);
            if (isSaved) next.delete(candidateUserId);
            else next.add(candidateUserId);
            return next;
        });

        try {
            if (isSaved) {
                await removeSavedCandidateFromPool(candidateUserId);
                toast.success('Removed from saved candidates');
            } else {
                await saveCandidateToPool(candidateUserId);
                toast.success('Saved to talent pool');
            }
        } catch {
            toast.error('Could not update saved status');
            void loadSavedPool();
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20 pb-20 pt-6 md:pt-10 font-sans">
            <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border/50">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-indigo-500/20">
                                Recruiter Workspace
                            </span>
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                            Candidate Discovery
                        </h1>
                        <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                            Discover verified fresher talent actively open to hiring opportunities.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => void loadCandidates()}
                            className="p-2 text-muted-foreground hover:text-foreground rounded-xl bg-card border border-border/60 transition-colors"
                            title="Refresh Candidate Pool"
                        >
                            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <Link
                            href="/dashboard"
                            className="px-4 py-2 text-xs font-semibold rounded-xl bg-card border border-border/60 hover:bg-muted text-foreground transition-colors"
                        >
                            Candidate View
                        </Link>
                    </div>
                </div>

                {/* Main Grid: Filters Left + Results Right */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

                    {/* Left Column: Filter Panel */}
                    <div className="lg:col-span-3 bg-card border border-border/60 rounded-3xl p-5 shadow-sm space-y-5 lg:sticky lg:top-8">
                        <div className="flex items-center gap-2 text-foreground font-bold text-sm pb-3 border-b border-border/40">
                            <FunnelIcon className="w-4 h-4 text-primary" />
                            <span>Filters</span>
                        </div>

                        {/* Search Input */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Search Skills / Role
                            </label>
                            <div className="relative">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="React, Java, MCA..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full h-9 pl-9 pr-3 text-xs bg-background border border-border rounded-xl placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary transition-all"
                                />
                            </div>
                        </div>

                        {/* Graduation Year */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Batch / Passout Year
                            </label>
                            <Select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(e.target.value)}
                                className="w-full h-9 px-3 text-xs bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-all"
                            >
                                <option value="ALL">All Batches</option>
                                <option value="2024">2024</option>
                                <option value="2025">2025</option>
                                <option value="2026">2026</option>
                                <option value="2027">2027</option>
                            </Select>
                        </div>

                        {/* Degree */}
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Degree
                            </label>
                            <Select
                                value={selectedDegree}
                                onChange={(e) => setSelectedDegree(e.target.value)}
                                className="w-full h-9 px-3 text-xs bg-background border border-border rounded-xl text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer transition-all"
                            >
                                <option value="ALL">All Degrees</option>
                                <option value="MCA">MCA</option>
                                <option value="B.TECH">B.Tech</option>
                                <option value="M.TECH">M.Tech</option>
                                <option value="BCA">BCA / B.Sc</option>
                            </Select>
                        </div>
                    </div>

                    {/* Right Column: Candidate Results Grid */}
                    <div className="lg:col-span-9 space-y-4">
                        <div className="flex items-center justify-between px-1">
                            <span className="text-xs font-semibold text-muted-foreground">
                                {loading ? 'Loading candidates...' : `Showing ${candidates.length} opted-in candidates`}
                            </span>
                        </div>

                        {loading ? (
                            <div className="space-y-4">
                                {[1, 2].map((i) => (
                                    <div key={i} className="bg-card border border-border/60 rounded-3xl p-6 h-36 animate-pulse" />
                                ))}
                            </div>
                        ) : candidates.length === 0 ? (
                            <div className="bg-card border border-dashed border-border/60 rounded-3xl p-12 text-center space-y-3">
                                <SparklesIcon className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                                <h3 className="text-base font-bold text-foreground">No opted-in candidates found</h3>
                                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                                    Candidates appear here when they opt-in to recruiter discovery on their profile settings.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {candidates.map((profileItem) => {
                                    const userObj = profileItem.user;
                                    const candidateUserId = userObj.id || profileItem.userId;
                                    const isSaved = savedCandidateIds.has(candidateUserId);
                                    const displayName = userObj.fullName || `@${userObj.username}`;
                                    const initials = displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

                                    return (
                                        <div
                                            key={profileItem.id}
                                            className="group bg-card border border-border/70 hover:border-primary/40 rounded-3xl p-5 md:p-6 shadow-sm hover:shadow-md transition-all space-y-4"
                                        >
                                            {/* Candidate Card Top Row */}
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary via-primary/80 to-indigo-600 text-primary-foreground font-extrabold text-lg flex items-center justify-center shrink-0 shadow-md shadow-primary/20">
                                                        {initials}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h2 className="text-lg font-bold text-foreground">
                                                                {displayName}
                                                            </h2>
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold border border-emerald-500/20">
                                                                <CheckBadgeIcon className="w-3.5 h-3.5" /> Open to Hire
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground font-medium">@{userObj.username}</p>
                                                        {profileItem.headline && (
                                                            <p className="text-xs md:text-sm font-semibold text-foreground/90 leading-tight">
                                                                {profileItem.headline}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => void toggleSave(candidateUserId)}
                                                    className="p-2 text-muted-foreground hover:text-amber-500 rounded-xl hover:bg-muted transition-colors cursor-pointer"
                                                    title={isSaved ? 'Remove from saved' : 'Save candidate'}
                                                >
                                                    {isSaved ? <StarSolidIcon className="w-5 h-5 text-amber-500" /> : <StarIcon className="w-5 h-5" />}
                                                </button>
                                            </div>

                                            {/* Skills Chips */}
                                            {profileItem.skills && profileItem.skills.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {profileItem.skills.map((skill) => (
                                                        <SkillPill
                                                            key={skill}
                                                            skill={skill}
                                                            className="bg-muted/50 border border-border/60 text-foreground font-semibold text-xs rounded-lg"
                                                        />
                                                    ))}
                                                </div>
                                            )}

                                            {/* Metadata Row: Education, Location, Availability */}
                                            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border/40">
                                                {profileItem.gradCourse && (
                                                    <span className="inline-flex items-center gap-1 font-medium">
                                                        <AcademicCapIcon className="w-4 h-4 shrink-0 text-primary" />
                                                        {profileItem.gradCourse} {profileItem.gradYear ? `(${profileItem.gradYear})` : ''}
                                                    </span>
                                                )}
                                                {profileItem.preferredCities && profileItem.preferredCities.length > 0 && (
                                                    <span className="inline-flex items-center gap-1 font-medium">
                                                        <MapPinIcon className="w-4 h-4 shrink-0" />
                                                        {profileItem.preferredCities.join(', ')}
                                                    </span>
                                                )}
                                                {profileItem.availability && (
                                                    <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                                                        <ClockIcon className="w-4 h-4 shrink-0 text-muted-foreground" />
                                                        Available: {profileItem.availability.replace('_', ' ')}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Card Action CTAs */}
                                            <div className="flex items-center justify-end gap-3 pt-2">
                                                <Link
                                                    href={`/u/${userObj.username}`}
                                                    target="_blank"
                                                    className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-xl text-xs transition-colors flex items-center gap-1.5"
                                                >
                                                    <span>View Profile</span>
                                                    <ArrowRightIcon className="w-3.5 h-3.5" />
                                                </Link>
                                                <button
                                                    type="button"
                                                    onClick={() => setHireModalCandidate(profileItem)}
                                                    className="px-5 py-2 bg-primary text-primary-foreground font-bold rounded-xl text-xs hover:opacity-90 shadow-md shadow-primary/20 transition-all cursor-pointer"
                                                >
                                                    Apply to Hire
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Recruiter Apply To Hire Modal */}
            {hireModalCandidate && (
                <ApplyToHireModal
                    username={hireModalCandidate.user.username}
                    candidateName={hireModalCandidate.user.fullName || `@${hireModalCandidate.user.username}`}
                    isOpen={Boolean(hireModalCandidate)}
                    onClose={() => setHireModalCandidate(null)}
                />
            )}
        </div>
    );
}
