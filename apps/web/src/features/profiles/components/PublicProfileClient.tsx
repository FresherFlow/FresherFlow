'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/ui/Button';
import { Badge } from '@/ui/Badge';
import { apiClient } from '@/lib/api/core';
import { authApi } from '@/lib/api/auth';

export interface PublicProfile {
    userId: string;
    fullName: string | null;
    username: string | null;
    avatarUrl: string | null;
    memberSince?: string;
    headline: string | null;
    about: string | null;
    degree: string | null;
    specialization: string | null;
    gradYear: number | null;
    collegeName: string | null;
    educationLevel: string | null;
    skills: string[];
    availability: string | null;
    preferredCities: string[];
    workModes: string[];
    expectedCtc: number | null;
    resumeUrl: string | null;
    willingToRelocate: boolean | null;
    openToRecruiters: boolean;
    completionPercentage?: number;
    projects: Array<{
        id: string;
        title: string;
        description: string | null;
        githubUrl: string | null;
        liveUrl: string | null;
        skills: string[];
    }>;
}

const AVAILABILITY_LABEL: Record<string, string> = {
    IMMEDIATE: 'Actively looking',
    DAYS_15: 'Open to offers',
    MONTH_1: 'Open to offers',
};

function EyeIcon() {
    return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    );
}

function ShareIcon() {
    return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
        </svg>
    );
}

export default function PublicProfileClient({ profile }: { profile: PublicProfile }) {
    const [views, setViews] = useState<number | null>(null);
    const [isOwner, setIsOwner] = useState(false);
    const [introState, setIntroState] = useState<'idle' | 'sending' | 'sent'>('idle');
    const [showIntroForm, setShowIntroForm] = useState(false);
    const [introForm, setIntroForm] = useState({ name: '', company: '', email: '', phone: '', message: '' });

    const profileUrl = useMemo(() => {
        if (typeof window !== 'undefined') return window.location.href;
        return `https://fresherflow.in/u/${profile.username}`;
    }, [profile.username]);

    const shareText = `Made my fresher profile — ${profileUrl.replace('https://', '')}. 2 minutes, make yours.`;

    // Fire the view ping once per session; render counter only to the owner.
    useEffect(() => {
        let cancelled = false;
        const KEY = `ff_view_session_${profile.username}`;
        let viewerSession = '';
        try {
            viewerSession = sessionStorage.getItem(KEY) || '';
            if (!viewerSession) {
                viewerSession = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
                sessionStorage.setItem(KEY, viewerSession);
            }
        } catch {
            viewerSession = 'no-storage';
        }

        apiClient<{ success: boolean; views: number; countedNow: boolean }>(
            `/api/public/profiles/${profile.username}/view`,
            { method: 'POST', body: JSON.stringify({ viewerSession }) },
        )
            .then((data) => {
                if (cancelled || !data) return;
                // Owner check via session — the counter is only rendered for the profile owner.
                authApi.me().then((me) => {
                    const mine = (me as { user?: { id?: string } })?.user?.id === profile.userId;
                    setIsOwner(mine);
                    if (mine) setViews(data.views);
                }).catch(() => { /* visitor — no counter shown */ });
            })
            .catch(() => { });
        return () => { cancelled = true; };
    }, [profile.username, profile.userId]);

    const submitIntro = async () => {
        if (!introForm.name.trim() || (!introForm.email.trim() && !introForm.phone.trim())) {
            alert('Please add your name and an email or phone number.');
            return;
        }
        setIntroState('sending');
        try {
            await apiClient(`/api/public/profiles/${profile.username}/intro-request`, {
                method: 'POST',
                body: JSON.stringify({
                    candidateId: profile.userId,
                    recruiterName: introForm.name.trim(),
                    recruiterCompany: introForm.company.trim() || undefined,
                    recruiterEmail: introForm.email.trim() || undefined,
                    recruiterPhone: introForm.phone.trim() || undefined,
                    message: introForm.message.trim() || undefined,
                }),
            });
            setIntroState('sent');
        } catch {
            setIntroState('idle');
            alert('Could not send the request. Please try again.');
        }
    };

    const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    const linkedinHref = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`;

    return (
        <div className="min-h-screen bg-background">
            {/* Sticky mini-bar */}
            <div className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur">
                <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
                    <Link href="/" className="text-sm font-bold text-primary">FresherFlow</Link>
                    <div className="flex items-center gap-2">
                        {views !== null && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground px-2 py-1 rounded-full bg-muted border border-border/60">
                                <EyeIcon /> {views} views
                            </span>
                        )}
                        <Button size="sm" onClick={() => setShowIntroForm(true)}>Request intro</Button>
                    </div>
                    {isOwner && (
                        <Link href="/profile" className="ml-3 text-xs font-semibold text-primary hover:underline">Edit profile</Link>
                    )}
                </div>
            </div>

            <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
                {/* Identity card */}
                <section className="rounded-2xl border border-border/60 bg-card shadow-sm p-6 space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xl font-bold text-primary overflow-hidden shrink-0">
                            {profile.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={profile.avatarUrl} alt={profile.fullName || 'Profile'} className="w-full h-full object-cover" />
                            ) : (
                                (profile.fullName || profile.username || '?').slice(0, 1).toUpperCase()
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <h1 className="text-2xl font-bold text-foreground truncate">{profile.fullName || profile.username}</h1>
                            <p className="text-sm text-muted-foreground truncate">
                                {profile.degree ? `${profile.degree}${profile.specialization ? ` · ${profile.specialization}` : ''}` : null}
                                {profile.gradYear ? ` · ${profile.gradYear} batch` : ''}
                                {profile.collegeName ? ` · ${profile.collegeName}` : ''}
                            </p>
                            {profile.headline && <p className="mt-2 text-sm text-foreground">{profile.headline}</p>}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {profile.availability && (
                            <Badge variant={profile.availability === 'IMMEDIATE' ? 'default' : 'secondary'}>
                                {AVAILABILITY_LABEL[profile.availability] || 'Open to offers'}
                            </Badge>
                        )}
                        {profile.expectedCtc != null && profile.expectedCtc > 0 && (
                            <Badge variant="outline">{profile.expectedCtc} LPA expected</Badge>
                        )}
                        {profile.willingToRelocate === false && <Badge variant="outline">No relocation</Badge>}
                    </div>

                    {profile.about && <p className="text-sm text-muted-foreground whitespace-pre-line">{profile.about}</p>}

                    {/* Share row — the growth loop */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40">
                        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp">
                            <Button variant="outline" size="sm"><ShareIcon /> WhatsApp</Button>
                        </a>
                        <a href={linkedinHref} target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn">
                            <Button variant="outline" size="sm"><ShareIcon /> LinkedIn</Button>
                        </a>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigator.clipboard?.writeText(shareText).then(() => alert('Copied!'))}
                        >
                            Copy link text
                        </Button>
                    </div>
                </section>

                {/* Skills */}
                {profile.skills?.length > 0 && (
                    <section className="rounded-2xl border border-border/60 bg-card shadow-sm p-6">
                        <h2 className="text-base font-bold text-foreground mb-3">Skills</h2>
                        <div className="flex flex-wrap gap-2">
                            {profile.skills.map((s) => <Badge key={s} variant="secondary">{s}</Badge>)}
                        </div>
                    </section>
                )}

                {/* Projects */}
                {profile.projects?.length > 0 && (
                    <section className="rounded-2xl border border-border/60 bg-card shadow-sm p-6 space-y-4">
                        <h2 className="text-base font-bold text-foreground">Projects</h2>
                        {profile.projects.map((p) => (
                            <div key={p.id} className="rounded-xl border border-border/50 p-4 space-y-2">
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="font-semibold text-foreground text-sm">{p.title}</h3>
                                    <div className="flex gap-2">
                                        {p.githubUrl && (
                                            <a href={p.githubUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary hover:underline">GitHub</a>
                                        )}
                                        {p.liveUrl && (
                                            <a href={p.liveUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary hover:underline">Live</a>
                                        )}
                                    </div>
                                </div>
                                {p.description && <p className="text-xs text-muted-foreground line-clamp-3">{p.description}</p>}
                                {p.skills?.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {p.skills.slice(0, 6).map((s) => <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0">{s}</Badge>)}
                                    </div>
                                )}
                            </div>
                        ))}
                    </section>
                )}

                {/* Preferences */}
                {(profile.preferredCities?.length > 0 || profile.workModes?.length > 0 || profile.resumeUrl) && (
                    <section className="rounded-2xl border border-border/60 bg-card shadow-sm p-6 space-y-3">
                        <h2 className="text-base font-bold text-foreground">Looking for</h2>
                        {profile.preferredCities?.length > 0 && (
                            <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Cities:</span> {profile.preferredCities.join(', ')}</p>
                        )}
                        {profile.workModes?.length > 0 && (
                            <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Work mode:</span> {profile.workModes.map((m) => m.toLowerCase()).join(', ')}</p>
                        )}
                        {profile.resumeUrl && (
                            <a href={profile.resumeUrl} target="_blank" rel="noopener noreferrer" className="inline-block text-sm font-semibold text-primary hover:underline">View resume ↗</a>
                        )}
                    </section>
                )}

                {/* Recruiter CTA (mobile-first, always visible) */}
                <section className="rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center space-y-3">
                    <h2 className="text-lg font-bold text-foreground">Hiring {profile.fullName?.split(' ')[0] || 'this fresher'}?</h2>
                    <p className="text-sm text-muted-foreground">Request an intro — they respond directly. No middlemen.</p>
                    <Button onClick={() => setShowIntroForm(true)}>Request intro</Button>
                </section>

                {/* Intro request modal */}
                {showIntroForm && introState !== 'sent' && (
                    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={() => setShowIntroForm(false)}>
                        <div className="w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                            <h3 className="text-lg font-bold text-foreground">Request an intro</h3>
                            <p className="text-xs text-muted-foreground">Goes straight to {profile.fullName?.split(' ')[0] || 'the candidate'}. No account needed.</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input className="h-10 px-3 rounded-xl border border-border bg-background text-sm" placeholder="Your name *" value={introForm.name} onChange={(e) => setIntroForm({ ...introForm, name: e.target.value })} />
                                <input className="h-10 px-3 rounded-xl border border-border bg-background text-sm" placeholder="Company" value={introForm.company} onChange={(e) => setIntroForm({ ...introForm, company: e.target.value })} />
                                <input className="h-10 px-3 rounded-xl border border-border bg-background text-sm" placeholder="Work email *" type="email" value={introForm.email} onChange={(e) => setIntroForm({ ...introForm, email: e.target.value })} />
                                <input className="h-10 px-3 rounded-xl border border-border bg-background text-sm" placeholder="Phone" value={introForm.phone} onChange={(e) => setIntroForm({ ...introForm, phone: e.target.value })} />
                            </div>
                            <textarea className="w-full min-h-20 px-3 py-2 rounded-xl border border-border bg-background text-sm" placeholder="Message (optional)" value={introForm.message} onChange={(e) => setIntroForm({ ...introForm, message: e.target.value })} />
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={() => setShowIntroForm(false)}>Cancel</Button>
                                <Button size="sm" onClick={submitIntro} disabled={introState === 'sending'}>
                                    {introState === 'sending' ? 'Sending…' : 'Send request'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {introState === 'sent' && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowIntroForm(false)}>
                        <div className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-xl p-6 text-center space-y-2" onClick={(e) => e.stopPropagation()}>
                            <div className="text-3xl"></div>
                            <h3 className="text-lg font-bold text-foreground">Request sent</h3>
                            <p className="text-sm text-muted-foreground">The candidate has your details and will reach out.</p>
                            <Button variant="outline" size="sm" onClick={() => { setShowIntroForm(false); setIntroState('idle'); }}>Done</Button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
