'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
    ArrowLeftIcon,
    ShieldCheckIcon, 
    AdjustmentsHorizontalIcon, 
    TrophyIcon,
    CheckIcon,
    ClipboardIcon,
    CpuChipIcon,
    UserIcon,
    PaperAirplaneIcon,
    ChevronDownIcon,
} from '@heroicons/react/24/outline';

interface PipelineStep {
    number: string;
    label: string;
    title: string;
    desc: string;
    detail: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    mockup: React.ReactNode;
}

export function AboutClient() {
    const [activeStep, setActiveStep] = useState<number>(0);
    const [selectedProfile, setSelectedProfile] = useState<'match' | 'mismatch'>('match');

    const PIPELINE_STEPS: PipelineStep[] = [
        {
            number: '01',
            label: 'Source',
            title: 'Opportunities Ingestion',
            desc: 'Community submit via clipboard detection, or our crawlers index from official corporate career directories automatically.',
            detail: 'Community & Crawlers',
            icon: ClipboardIcon,
            mockup: (
                <div className="border border-border/80 bg-background/50 rounded-2xl p-4 space-y-3 shadow-inner">
                    <div className="flex items-center gap-2 border-b border-border/65 pb-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary/30" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Mobile Clipboard Monitor</span>
                    </div>
                    <div className="bg-card border border-border p-3.5 rounded-xl shadow-sm space-y-2">
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <CheckIcon className="w-3 h-3 text-success" /> Link detected in clipboard
                        </div>
                        <p className="text-xs font-mono bg-muted/60 p-2 rounded border border-border/55 truncate text-foreground/80">
                            careers.company.com/jobs/sde-1
                        </p>
                        <div className="text-center">
                            <span className="inline-block text-[10px] font-bold bg-primary text-primary-foreground px-3 py-1 rounded-lg">
                                Auto-Fill Opportunity
                            </span>
                        </div>
                    </div>
                </div>
            )
        },
        {
            number: '02',
            label: 'Parse',
            title: 'NLP Data Extraction',
            desc: 'Our NLP engine parses batch year eligibility, extracts role constraints, scans required skills, and runs a strict duplicate URL matching algorithm.',
            detail: 'NLP Processing',
            icon: CpuChipIcon,
            mockup: (
                <div className="border border-border/80 bg-background/50 rounded-2xl p-4 space-y-3 shadow-inner">
                    <div className="flex items-center gap-2 border-b border-border/65 pb-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary/30" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Parser Extracted Tags</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="bg-card border border-border/65 p-2 rounded-xl">
                            <span className="block text-[9px] text-muted-foreground uppercase">Role</span>
                            <span className="text-xs font-bold text-foreground">SDE Graduate</span>
                        </div>
                        <div className="bg-card border border-border/65 p-2 rounded-xl">
                            <span className="block text-[9px] text-muted-foreground uppercase">Eligible Batch</span>
                            <span className="text-xs font-bold text-foreground">2025, 2026</span>
                        </div>
                        <div className="bg-card border border-border/65 p-2 rounded-xl col-span-2 flex items-center justify-center gap-1.5 py-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-success" />
                            <span className="text-[10px] font-bold text-foreground">Duplicate Check: Clean ✓</span>
                        </div>
                    </div>
                </div>
            )
        },
        {
            number: '03',
            label: 'Verify',
            title: 'Human Moderation',
            desc: 'A moderator manually reviews the application link, tests for active hiring state, verifies degree match, and flags any external redirect loops.',
            detail: 'Human Review',
            icon: UserIcon,
            mockup: (
                <div className="border border-border/80 bg-background/50 rounded-2xl p-4 space-y-3 shadow-inner">
                    <div className="flex items-center gap-2 border-b border-border/65 pb-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary/30" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Admin Moderator Panel</span>
                    </div>
                    <div className="bg-card border border-border p-3.5 rounded-xl shadow-sm space-y-3">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">URL Health</span>
                            <span className="font-bold text-success">Active (200 OK)</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground">Parameters Match</span>
                            <span className="font-bold text-foreground">Verified</span>
                        </div>
                        <div className="flex gap-2">
                            <span className="flex-1 text-[10px] font-bold text-center bg-muted text-muted-foreground border border-border py-1 rounded-lg">Reject</span>
                            <span className="flex-1 text-[10px] font-bold text-center bg-foreground text-background py-1 rounded-lg">Approve & Publish</span>
                        </div>
                    </div>
                </div>
            )
        },
        {
            number: '04',
            label: 'Deliver',
            title: 'Edge Deployment',
            desc: 'The verified job package is built into compressed JSON shards, uploaded to Cloudflare R2 edge locations, and broadcast via instant push notification.',
            detail: 'Edge CDN Delivery',
            icon: PaperAirplaneIcon,
            mockup: (
                <div className="border border-border/80 bg-background/50 rounded-2xl p-4 space-y-3 shadow-inner">
                    <div className="flex items-center gap-2 border-b border-border/65 pb-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary/30" />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Client Push Alert</span>
                    </div>
                    <div className="bg-card border border-border p-3 rounded-xl shadow-sm flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-foreground text-background flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">FF</div>
                        <div className="space-y-0.5 leading-tight flex-1">
                            <span className="text-[10px] font-bold text-foreground block">FresherFlow</span>
                            <p className="text-[10.5px] text-muted-foreground">New Software Engineer role matches your profile batch!</p>
                        </div>
                    </div>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-0">

            {/* ── Hero ─────────────────────────────────────────────────────── */}
            <section className="pt-2 pb-20 md:pb-28">
                <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-10 group"
                >
                    <ArrowLeftIcon className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
                    Back
                </Link>

                <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-12 lg:gap-20 items-end">
                    {/* Left: Statement */}
                    <div className="space-y-8">
                        <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[0.92] text-foreground">
                            We killed<br />
                            the job board.<br />
                            <span className="text-muted-foreground/50">Built this instead.</span>
                        </h1>
                        <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-lg">
                            Every listing you see was touched by a real person before it reached you. 
                            No algorithms deciding what&apos;s &ldquo;relevant&rdquo;. No affiliate links in disguise.
                        </p>
                    </div>

                    {/* Right: Raw stats — no cards, just type */}
                    <div className="space-y-6 border-l-2 border-border pl-8 lg:pl-10">
                        {[
                            { value: '4', label: 'steps to verify every listing' },
                            { value: '1', label: 'human reviews every link' },
                            { value: '0', label: 'ads. Ever. Not one.' },
                        ].map(stat => (
                            <div key={stat.label}>
                                <div className="text-5xl md:text-6xl font-black text-foreground leading-none tracking-tight">{stat.value}</div>
                                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Core Pillars — Editorial Rows ───────────────────────────── */}
            <section className="border-t border-border/40 py-20 md:py-28 space-y-20">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-3">Core Pillars</p>
                    <h2 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
                        A clean path to application,<br className="hidden md:block" /> designed for speed.
                    </h2>
                </div>

                {/* Pillar 1 */}
                <div className="grid grid-cols-1 lg:grid-cols-[80px_1fr_340px] gap-6 lg:gap-12 items-start">
                    <div className="text-7xl font-black text-foreground/8 leading-none select-none hidden lg:block">01</div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg border border-border bg-muted/40 flex items-center justify-center shrink-0">
                                <ShieldCheckIcon className="w-4 h-4" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground">100% Moderated & Direct</h3>
                        </div>
                        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                            No third-party ad networks, tracking links, or endless redirect loops. When you tap Apply, 
                            the mobile app opens the official company site directly in an ad-free in-app browser. 
                            Every single link is checked by our team first.
                        </p>
                    </div>
                    {/* Visual — floating, no container */}
                    <div className="bg-muted/20 rounded-2xl border border-border/60 p-4 space-y-2">
                        <div className="flex items-center gap-2 h-9 bg-card border border-border rounded-xl px-3">
                            <div className="w-2 h-2 rounded-full bg-success shrink-0" />
                            <span className="text-[11px] font-mono text-muted-foreground truncate">careers.google.com/jobs/...</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] px-1">
                            <span className="text-muted-foreground">Direct connection</span>
                            <span className="text-success font-bold flex items-center gap-1">
                                <CheckIcon className="w-3 h-3" /> Verified
                            </span>
                        </div>
                    </div>
                </div>

                {/* Pillar 2 */}
                <div className="grid grid-cols-1 lg:grid-cols-[80px_1fr_340px] gap-6 lg:gap-12 items-start">
                    <div className="text-7xl font-black text-foreground/8 leading-none select-none hidden lg:block">02</div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg border border-border bg-muted/40 flex items-center justify-center shrink-0">
                                <AdjustmentsHorizontalIcon className="w-4 h-4" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground">Interactive Eligibility Match Score</h3>
                        </div>
                        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                            Stop wasting hours reading lengthy job descriptions only to find out they require a 2025 batch 
                            and you graduated in 2026. The app parses structural criteria and matches it with your profile instantly.
                        </p>
                    </div>
                    {/* Interactive gauge — no card wrapper, just the element */}
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            {(['match', 'mismatch'] as const).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setSelectedProfile(p)}
                                    className={`flex-1 text-[11px] font-bold py-1.5 px-3 rounded-lg border transition-all ${
                                        selectedProfile === p
                                            ? 'bg-foreground text-background border-foreground'
                                            : 'bg-transparent border-border hover:bg-muted text-muted-foreground'
                                    }`}
                                >
                                    {p === 'match' ? 'Match' : 'Mismatch'}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-4 p-3 border border-border/50 rounded-xl bg-card/40">
                            <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                                <svg className="absolute w-full h-full -rotate-90" viewBox="0 0 36 36">
                                    <path className="text-border" strokeWidth="3.5" stroke="currentColor" fill="transparent"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                                    <path
                                        className={`transition-all duration-500 ${selectedProfile === 'match' ? 'text-success' : 'text-warning'}`}
                                        strokeWidth="3.5"
                                        strokeDasharray={`${selectedProfile === 'match' ? 94 : 45}, 100`}
                                        strokeLinecap="round"
                                        stroke="currentColor"
                                        fill="transparent"
                                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    />
                                </svg>
                                <span className="text-xs font-black">{selectedProfile === 'match' ? '94%' : '45%'}</span>
                            </div>
                            <div>
                                <p className={`text-xs font-bold ${selectedProfile === 'match' ? 'text-success' : 'text-warning'}`}>
                                    {selectedProfile === 'match' ? 'Excellent Match' : 'Ineligible'}
                                </p>
                                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">
                                    {selectedProfile === 'match'
                                        ? 'Your batch (2026) and Node.js skills match.'
                                        : 'Requires 2025 batch, your profile is 2026.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pillar 3 */}
                <div className="grid grid-cols-1 lg:grid-cols-[80px_1fr_340px] gap-6 lg:gap-12 items-start">
                    <div className="text-7xl font-black text-foreground/8 leading-none select-none hidden lg:block">03</div>
                    <div className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg border border-border bg-muted/40 flex items-center justify-center shrink-0">
                                <TrophyIcon className="w-4 h-4" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground">Community Sharing & Referral Ranks</h3>
                        </div>
                        <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                            Share off-campus links straight from your clipboard with automated duplicate scanning. 
                            Refer peers, track community ranking statuses, and progress from Newbie to Community Champion.
                        </p>
                    </div>
                    {/* Rank stack — no card border, just the rows */}
                    <div className="space-y-1.5">
                        {[
                            { rank: 'Champion', level: 'Level 3', active: false },
                            { rank: 'Contributor', level: 'Level 2', active: true },
                            { rank: 'Newbie', level: 'Level 1', active: false },
                        ].map(item => (
                            <div
                                key={item.rank}
                                className={`flex justify-between items-center px-3.5 py-2.5 rounded-xl text-xs transition-all ${
                                    item.active
                                        ? 'bg-foreground text-background font-bold'
                                        : 'border border-border/40 text-muted-foreground opacity-50'
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    {item.active && <CheckIcon className="w-3.5 h-3.5" />}
                                    <span>{item.rank}</span>
                                </div>
                                <span className="font-mono text-[10px]">{item.level}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Verification Pipeline — Accordion ───────────────────────── */}
            <section className="border-t border-border/40 py-20 md:py-28">
                <div className="mb-12 space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Our Verification Pipeline</p>
                    <h2 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">How we check opportunities</h2>
                </div>

                <div className="space-y-0 border border-border/50 rounded-2xl overflow-hidden">
                    {PIPELINE_STEPS.map((step, idx) => {
                        const isActive = activeStep === idx;
                        const StepIcon = step.icon;
                        return (
                            <div key={step.number} className={`border-b border-border/40 last:border-b-0 ${isActive ? 'bg-card/60' : ''}`}>
                                {/* Row header */}
                                <button
                                    onClick={() => setActiveStep(idx)}
                                    className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/20 ${isActive ? 'border-l-2 border-primary' : 'border-l-2 border-transparent'}`}
                                >
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isActive ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'}`}>
                                        <StepIcon className="w-4 h-4" />
                                    </div>
                                    <span className="text-[10px] font-mono text-muted-foreground/60 shrink-0">Step {step.number}</span>
                                    <span className={`text-sm font-bold flex-1 ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{step.label} — {step.detail}</span>
                                    <ChevronDownIcon className={`w-4 h-4 text-muted-foreground transition-transform duration-200 shrink-0 ${isActive ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Expandable detail */}
                                <div className={`overflow-hidden transition-all duration-300 ${isActive ? 'max-h-96' : 'max-h-0'}`}>
                                    <div className="px-5 pb-6 pt-2 grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6 items-start">
                                        <div className="space-y-2 pl-12">
                                            <h3 className="text-base font-bold text-foreground">{step.title}</h3>
                                            <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                                        </div>
                                        <div>{step.mockup}</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ── CTA ────────────────────────────────────────────────────── */}
            <section className="border-t border-border/40 py-20 md:py-24 flex flex-col md:flex-row md:items-end md:justify-between gap-8">
                <h2 className="text-3xl md:text-5xl font-black leading-tight tracking-tight text-foreground max-w-lg">
                    Join the community.<br />
                    <span className="text-muted-foreground font-medium text-xl md:text-2xl">Start applying directly today.</span>
                </h2>
                <div className="flex flex-wrap gap-3 shrink-0">
                    <Link
                        href="/download"
                        className="h-11 px-6 rounded-xl bg-foreground text-background text-sm font-semibold inline-flex items-center justify-center hover:opacity-85 transition-all active:scale-95"
                    >
                        Download App
                    </Link>
                    <Link
                        href="/feedback"
                        className="h-11 px-6 rounded-xl border border-border text-foreground text-sm font-semibold inline-flex items-center justify-center hover:bg-muted/50 transition-all active:scale-95"
                    >
                        Send Feedback
                    </Link>
                </div>
            </section>
        </div>
    );
}
