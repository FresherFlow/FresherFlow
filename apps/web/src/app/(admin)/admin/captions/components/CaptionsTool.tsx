'use client';

import { useEffect, useRef, useState } from 'react';
import {
    ClipboardIcon,
    CheckIcon,
    MagnifyingGlassIcon,
    SparklesIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    LinkIcon,
    BellIcon,
    PaperAirplaneIcon,
    ArrowPathIcon,
    SignalIcon,
    SignalSlashIcon,
    ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';

function TelegramBrandIcon({ className }: { className?: string }) {
    return <svg viewBox="0 0 24 24" fill="#2CA5E0" className={className}><path d="M9.036 15.803 8.87 19.5c.45 0 .646-.194.88-.427l2.112-2.018 4.38 3.207c.803.444 1.37.21 1.586-.743L20.8 5.59c.316-1.237-.447-1.72-1.227-1.43L2.59 10.72c-1.159.45-1.141 1.098-.197 1.39l4.344 1.356L16.824 7.15c.475-.29.91-.129.555.16L9.036 15.803z" /></svg>;
}

function WhatsAppBrandIcon({ className }: { className?: string }) {
    return <svg viewBox="0 0 24 24" fill="#25D366" className={className}><path d="M20.52 3.48A11.88 11.88 0 0 0 12.06 0C5.49 0 .15 5.34.15 11.91c0 2.1.55 4.15 1.6 5.97L0 24l6.32-1.66a11.83 11.83 0 0 0 5.73 1.46h.01c6.57 0 11.91-5.34 11.91-11.91 0-3.18-1.24-6.17-3.45-8.4zM12.06 21.7h-.01a9.79 9.79 0 0 1-4.98-1.36l-.36-.22-3.75.99.99-3.65-.24-.37a9.79 9.79 0 0 1-1.51-5.2c0-5.4 4.39-9.79 9.8-9.79 2.61 0 5.06 1.01 6.9 2.86a9.72 9.72 0 0 1 2.88 6.92c0 5.4-4.4 9.8-9.72 9.8zm5.37-7.35c-.29-.15-1.7-.84-1.97-.93-.26-.1-.45-.15-.64.15-.19.29-.74.93-.9 1.12-.17.2-.33.22-.62.08-.29-.15-1.22-.45-2.33-1.43-.86-.77-1.43-1.72-1.6-2-.17-.29-.02-.44.13-.59.13-.13.29-.34.44-.5.15-.17.2-.29.3-.49.1-.2.05-.37-.03-.52-.08-.15-.64-1.55-.88-2.13-.23-.55-.47-.48-.64-.49h-.54c-.2 0-.52.07-.79.37-.27.3-1.03 1.01-1.03 2.45s1.06 2.83 1.2 3.02c.15.2 2.08 3.18 5.04 4.46.7.3 1.25.49 1.68.63.7.22 1.34.19 1.84.11.56-.08 1.7-.7 1.95-1.38.24-.67.24-1.25.17-1.37-.08-.12-.27-.2-.56-.34z" /></svg>;
}

function LinkedInBrandIcon({ className }: { className?: string }) {
    return <svg viewBox="0 0 24 24" fill="#0A66C2" className={className}><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5.001A2.5 2.5 0 0 1 4.98 3.5zM3 8.98h3.96V21H3V8.98zm7.02 0h3.8v1.64h.05c.53-1 1.82-2.06 3.75-2.06 4 0 4.74 2.64 4.74 6.08V21h-3.96v-5.6c0-1.34-.03-3.06-1.86-3.06-1.86 0-2.15 1.45-2.15 2.96V21h-3.97V8.98z" /></svg>;
}

function XBrandIcon({ className }: { className?: string }) {
    return <svg viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M18.9 2H22l-6.77 7.74L23 22h-6.17l-4.84-6.31L6.42 22H3.3l7.24-8.27L1 2h6.32l4.37 5.76L18.9 2zm-1.08 18h1.71L6.35 3.9H4.5L17.82 20z" /></svg>;
}
import { Opportunity } from '@fresherflow/types';
import toast from 'react-hot-toast';
import CompanyLogo from '@/ui/CompanyLogo';
import { useTheme } from '@/lib/providers/ThemeContext';
import { ThemeToggle } from '@repo/ui/ThemeToggle';
import { capitalizeSkill } from '@/features/opportunities/domain/opportunityDisplay';
import { SITE_URL } from '@/lib/utils/runtimeConfig';

const PROD_SITE_URL = SITE_URL.includes('localhost') ? 'https://fresherflow.in' : SITE_URL;

// ─── Types ───────────────────────────────────────────────────────────────────
type SendPlatform = 'telegram' | 'x' | 'linkedin';
type SendStatus = 'idle' | 'sending' | 'sent' | 'error';
type PlatformAvailability = Record<SendPlatform, boolean>;
const PLATFORM_LABEL: Record<SendPlatform, string> = { telegram: 'Telegram', x: 'X / Twitter', linkedin: 'LinkedIn' };

type Platform = 'whatsapp' | 'telegram' | 'twitter' | 'linkedin';

export default function CaptionsTool({ isAdmin = false }: { isAdmin?: boolean }) {
    const { theme, toggleTheme } = useTheme();
    const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOppIds, setSelectedOppIds] = useState<string[]>([]);
    const [activeOppId, setActiveOppId] = useState<string | null>(null);
    const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
    const [isSingleModalOpen, setIsSingleModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

    const [bulkPreviewPlatform, setBulkPreviewPlatform] = useState<Platform>('whatsapp');
    const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

    // Worker + platform send state
    const [workerOnline, setWorkerOnline] = useState<boolean>(false);
    const [workerUptime, setWorkerUptime] = useState<number | null>(null);
    const [platforms, setPlatforms] = useState<PlatformAvailability>({ telegram: false, x: false, linkedin: false });
    const [statusLoading, setStatusLoading] = useState(true);
    const [sendStatuses, setSendStatuses] = useState<Record<string, SendStatus>>({});
    const healthIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const toggleCollapseCategory = (category: string) => {
        setCollapsedCategories((prev) => ({
            ...prev,
            [category]: !prev[category],
        }));
    };

    // Fetch the latest opportunities from CDN / bootstrap feed via local proxy
    useEffect(() => {
        async function loadFeed() {
            try {
                const res = await fetch('/api/admin/bootstrap-feed');
                if (!res.ok) throw new Error('Failed to fetch opportunities');
                const data = await res.json();
                const list = Array.isArray(data?.opportunities) ? data.opportunities : [];
                setOpportunities(list);
                if (list.length > 0) {
                    setActiveOppId(list[0].id);
                }
            } catch (err) {
                console.error('[Captions Feed Load Failed]', err);
                toast.error('Could not load opportunities from feed.');
            } finally {
                setLoading(false);
            }
        }
        loadFeed();
    }, []);

    // Filter opportunities
    const filteredOpportunities = opportunities.filter((opp) => {
        const query = searchQuery.toLowerCase();
        return (
            opp.company.toLowerCase().includes(query) ||
            opp.title.toLowerCase().includes(query) ||
            (opp.locations && opp.locations.some((loc: string) => loc.toLowerCase().includes(query)))
        );
    });

    const activeOpportunity = opportunities.find((opp) => opp.id === activeOppId) || null;

    // Helper functions for parsing opportunity values
    const getExperienceText = (opp: Opportunity) => {
        const min = opp.experienceMin;
        const max = opp.experienceMax;
        if (min === undefined && max === undefined) return 'Fresher/0–2 years';
        if (min === 0 && (max === 0 || !max)) return 'Fresher';
        if (min !== undefined && max !== undefined) {
            return `${min === 0 ? 'Fresher' : min}–${max} years`;
        }
        return `${min || 0}+ years`;
    };

    const getSalaryText = (opp: Opportunity) => {
        if (opp.salaryRange) return opp.salaryRange;
        const min = opp.salaryMin;
        const max = opp.salaryMax;
        if (typeof min === 'number' && typeof max === 'number') {
            return `₹${min}L – ₹${max}L`;
        }
        if (typeof min === 'number') return `₹${min}L+`;
        return '';
    };

    const getDegreesText = (opp: Opportunity) => {
        if (opp.allowedCourses && opp.allowedCourses.length > 0) {
            return opp.allowedCourses.join(' / ');
        }
        if (opp.allowedDegrees && opp.allowedDegrees.length > 0) {
            return opp.allowedDegrees.join(' / ');
        }
        return 'B.E / B.Tech / MCA / Any Graduate';
    };

    const getBatchYearsText = (opp: Opportunity) => {
        if (opp.allowedPassoutYears && opp.allowedPassoutYears.length > 0) {
            const sorted = [...opp.allowedPassoutYears].sort((a, b) => a - b);
            if (sorted.length === 1) {
                return `${sorted[0]} Batch`;
            }
            return `${sorted.join(' / ')} Batch`;
        }
        return '';
    };

    const getNumberEmoji = (num: number): string => {
        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        if (num <= 10) return emojis[num - 1];
        return `🔹`;
    };

    const getCleanHashtag = (str?: string) => {
        if (!str) return '';
        const clean = str.replace(/[^a-zA-Z0-9]/g, '');
        return clean ? `#${clean}` : '';
    };

    // Caption formatters
    const formatSingleCaption = (opp: Opportunity, platform: 'whatsapp' | 'telegram' | 'twitter' | 'linkedin') => {
        const salary = getSalaryText(opp);
        const exp = getExperienceText(opp);
        const degrees = getDegreesText(opp);
        const batchYears = getBatchYearsText(opp);
        
        // Limit to 3-4 core skills
        const skillsSlice = opp.requiredSkills && opp.requiredSkills.length > 0 
            ? opp.requiredSkills.slice(0, 4).map(capitalizeSkill) 
            : [];
        const skillsLine = skillsSlice.length > 0 ? skillsSlice.join(', ') : '';
        
        const locations = opp.locations && opp.locations.length > 0 
            ? opp.locations.join(' / ') 
            : 'India';

        const companyHash = getCleanHashtag(opp.company);
        const firstLocation = opp.locations && opp.locations.length > 0 ? opp.locations[0] : '';
        const cleanLoc = firstLocation.replace(/[^a-zA-Z0-9]/g, '');
        const locationHash = cleanLoc ? `#${cleanLoc}Jobs` : '';

        if (platform === 'telegram') {
            const tgSkills = skillsLine ? `\n⚡ Skills: ${skillsLine}` : '';
            const tgSalary = salary ? `\n💰 Salary: ${salary}` : '';
            const tgBatch = batchYears ? `\n🎯 Batch: ${batchYears}` : '';

            return `🚀 ${opp.company} Hiring ${opp.title}

🎓 Eligibility: ${degrees}${tgBatch}
💼 Experience: ${exp}
📍 Location: ${locations}${tgSkills}${tgSalary}

⭕️ Apply Now:
${PROD_SITE_URL}/${opp.slug}

📱 More jobs: ${PROD_SITE_URL.replace(/^https?:\/\//, '')}/app`;
        }

        if (platform === 'twitter') {
            const twBatch = batchYears ? `\n🎯 ${batchYears}` : '';
            const twHashtags = (companyHash && locationHash) ? `${companyHash} ${locationHash} #Freshers` : '#Jobs #Hiring #Freshers';

            return `🚀 ${opp.company} Hiring ${opp.title}
${twBatch}
💼 ${exp}
📍 ${locations}

Apply 👇
${PROD_SITE_URL}/${opp.slug}

${twHashtags}`;
        }

        if (platform === 'linkedin') {
            const liSkills = skillsLine ? `\n⚡ Skills: ${skillsLine}` : '';
            const liSalary = salary ? `\n💰 Salary: ${salary}` : '';
            const liBatch = batchYears ? `\n🎯 Batch: ${batchYears}` : '';
            const liHashtags = (companyHash && locationHash) ? `${companyHash} ${locationHash} #Careers` : '#Hiring #Freshers #Jobs';

            return `🚀 ${opp.company} Hiring ${opp.title}

🎓 Eligibility: ${degrees}${liBatch}
💼 Experience: ${exp}
📍 Location: ${locations}${liSkills}${liSalary}

Apply:
${PROD_SITE_URL}/${opp.slug}

📱 More jobs: ${PROD_SITE_URL.replace(/^https?:\/\//, '')}/app

${liHashtags}`;
        }

        // Default: whatsapp
        const waSkills = skillsLine ? `\n> ⚡ *Skills:* ${skillsLine}` : '';
        const waSalary = salary ? `\n> 💰 *Salary:* ${salary}` : '';
        const waBatch = batchYears ? `\n> 🎯 *Batch:* ${batchYears}` : '';

        return `🚀 *${opp.company}* Hiring *${opp.title}*

> 🎓 *Eligibility:* ${degrees}${waBatch}
> 💼 *Experience:* ${exp}
> 📍 *Location:* ${locations}${waSkills}${waSalary}

⭕️ *Apply Now:*
${PROD_SITE_URL}/${opp.slug}

📱 *More jobs on FresherFlow:* ${PROD_SITE_URL.replace(/^https?:\/\//, '')}/app`;
    };

    const formatBulkCaption = (platformOverride?: Platform) => {
        const p = platformOverride ?? bulkPreviewPlatform;
        const selectedOpps = opportunities.filter((opp) => selectedOppIds.includes(opp.id));
        if (selectedOpps.length === 0) return '';

        if (p === 'whatsapp') {
            let body = `🚨 *Today's Job Updates*\n\n`;
            selectedOpps.forEach((opp, index) => {
                const numEmoji = getNumberEmoji(index + 1);
                body += `${numEmoji} *${opp.company}*\n> ${opp.title}\n🔗 ${PROD_SITE_URL}/${opp.slug}\n\n`;
            });
            body += `📱 *More jobs:* ${PROD_SITE_URL.replace(/^https?:\/\//, '')}/app`;
            return body;
        }

        if (p === 'telegram') {
            let body = `🚨 Today's Job Updates\n\n`;
            selectedOpps.forEach((opp, index) => {
                const numEmoji = getNumberEmoji(index + 1);
                body += `${numEmoji} ${opp.company} — ${opp.title}\n🔗 ${PROD_SITE_URL}/${opp.slug}\n\n`;
            });
            body += `📱 More jobs: ${PROD_SITE_URL.replace(/^https?:\/\//, '')}/app`;
            return body;
        }

        if (p === 'linkedin') {
            return `⚠️ LinkedIn is not optimized for long job lists. To maximize engagement, we recommend posting each job as an individual post instead!`;
        }

        // Twitter Bulk
        return `⚠️ Twitter/X is not optimized for long job lists. To maximize engagement, we recommend posting each job as an individual tweet instead!`;
    };

    // ─── Worker health ────────────────────────────────────────────────────────
    const checkWorkerHealth = async () => {
        try {
            const [healthRes, platRes] = await Promise.all([
                fetch('/api/admin/social/worker-health'),
                fetch('/api/admin/social/platforms'),
            ]);
            const health = await healthRes.json() as { online: boolean; uptime?: number | null };
            const plat = await platRes.json() as PlatformAvailability;
            setWorkerOnline(health.online);
            setWorkerUptime(health.uptime ?? null);
            setPlatforms(plat);
        } catch {
            setWorkerOnline(false);
        } finally {
            setStatusLoading(false);
        }
    };

    useEffect(() => {
        void checkWorkerHealth();
        healthIntervalRef.current = setInterval(() => { void checkWorkerHealth(); }, 300_000);
        return () => { if (healthIntervalRef.current) clearInterval(healthIntervalRef.current); };
    }, []);

    // ─── Send caption ─────────────────────────────────────────────────────────
    const sendCaption = async (platform: SendPlatform, text: string, key: string) => {
        setSendStatuses(prev => ({ ...prev, [key]: 'sending' }));
        try {
            const res = await fetch('/api/admin/social/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ platform, text }),
            });
            const data = await res.json() as { ok?: boolean; error?: string };
            if (!res.ok || !data.ok) throw new Error(data.error ?? 'Send failed');
            setSendStatuses(prev => ({ ...prev, [key]: 'sent' }));
            toast.success(`Sent to ${PLATFORM_LABEL[platform]}!`);
            setTimeout(() => setSendStatuses(prev => ({ ...prev, [key]: 'idle' })), 4000);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            setSendStatuses(prev => ({ ...prev, [key]: 'error' }));
            toast.error(`${PLATFORM_LABEL[platform]} failed: ${msg}`);
            setTimeout(() => setSendStatuses(prev => ({ ...prev, [key]: 'idle' })), 5000);
        }
    };


    const getSendIcon = (status: SendStatus | undefined) => {
        if (status === 'sending') return <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />;
        if (status === 'sent') return <CheckCircleIcon className="w-3.5 h-3.5 text-green-500" />;
        if (status === 'error') return <ExclamationTriangleIcon className="w-3.5 h-3.5 text-red-500" />;
        return <PaperAirplaneIcon className="w-3.5 h-3.5" />;
    };

    const formatUptime = (s: number) => s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}m` : `${Math.floor(s / 3600)}h${Math.floor((s % 3600) / 60)}m`;

    // Clipboard copy wrapper
    const copyToClipboard = async (text: string, key: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedStates((prev) => ({ ...prev, [key]: true }));
            toast.success('Caption copied!');
            setTimeout(() => setCopiedStates((prev) => ({ ...prev, [key]: false })), 2000);
        } catch {
            toast.error('Failed to copy text.');
        }
    };

    const handleSelectAll = () => {
        if (selectedOppIds.length === filteredOpportunities.length) {
            setSelectedOppIds([]);
        } else {
            setSelectedOppIds(filteredOpportunities.map((opp) => opp.id));
        }
    };

    const toggleSelectOpp = (id: string) => {
        setSelectedOppIds((prev) => 
            prev.includes(id) ? prev.filter((oId) => oId !== id) : [...prev, id]
        );
    };

    // Helper to get formatted date category
    const getDateCategory = (dateStr?: string | Date) => {
        if (!dateStr) return 'Unspecified';
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        }
        if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        }
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    };

    // Group opportunities by date category
    const groupedOpportunities: Record<string, Opportunity[]> = {};
    filteredOpportunities.forEach((opp) => {
        const category = getDateCategory(opp.postedAt);
        if (!groupedOpportunities[category]) {
            groupedOpportunities[category] = [];
        }
        groupedOpportunities[category].push(opp);
    });

    const getCategoryPriority = (cat: string) => {
        if (cat === 'Today') return 3;
        if (cat === 'Yesterday') return 2;
        if (cat === 'Unspecified') return 0;
        return 1;
    };

    const sortedCategories = Object.keys(groupedOpportunities).sort((a, b) => {
        const prioA = getCategoryPriority(a);
        const prioB = getCategoryPriority(b);
        if (prioA !== prioB) return prioB - prioA;
        return new Date(b).getTime() - new Date(a).getTime();
    });

    const isDateGroupSelected = (category: string) => {
        const oppsInGroup = groupedOpportunities[category] || [];
        if (oppsInGroup.length === 0) return false;
        return oppsInGroup.every((opp) => selectedOppIds.includes(opp.id));
    };

    const toggleSelectDateGroup = (category: string) => {
        const oppsInGroup = groupedOpportunities[category] || [];
        const oppIdsInGroup = oppsInGroup.map((o) => o.id);
        const allSelected = isDateGroupSelected(category);

        if (allSelected) {
            setSelectedOppIds((prev) => prev.filter((id) => !oppIdsInGroup.includes(id)));
        } else {
            setSelectedOppIds((prev) => Array.from(new Set([...prev, ...oppIdsInGroup])));
        }
    };

    return (
        <div className="animate-in fade-in duration-500 text-foreground">
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-muted-foreground animate-pulse">Fetching live opportunities from CDN...</span>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* Left: Feed opportunities selector */}
                    <div className="lg:col-span-2 h-screen sm:h-auto rounded-none sm:rounded-2xl border-y sm:border border-x-0 sm:border-border bg-[#F5F4EF] dark:bg-card p-3 sm:p-4 shadow-none sm:shadow-sm flex flex-col space-y-4 overflow-hidden">
                        {/* Title + worker status pill */}
                        <div className="border-b border-border pb-3 shrink-0 flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                    <SparklesIcon className="h-5 w-5 text-primary" />
                                    Social Captions Generator
                                </h1>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <p className="text-[11px] text-muted-foreground">
                                        Generate &amp; send captions to Telegram, X, LinkedIn.
                                    </p>
                                    {/* Inline worker status */}
                                    <span className="flex items-center gap-1 text-[10px] font-medium">
                                        {statusLoading
                                            ? <ArrowPathIcon className="w-3 h-3 animate-spin text-muted-foreground" />
                                            : workerOnline
                                            ? <SignalIcon className="w-3 h-3 text-emerald-500" />
                                            : <SignalSlashIcon className="w-3 h-3 text-red-400" />}
                                        <span className={workerOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}>
                                            {statusLoading ? 'checking…' : workerOnline ? `worker online${workerUptime ? ` · ${formatUptime(workerUptime)}` : ''}` : 'worker offline'}
                                        </span>
                                        <button onClick={() => { void checkWorkerHealth(); }} className="text-muted-foreground hover:text-foreground" title="Refresh">
                                            <ArrowPathIcon className="w-2.5 h-2.5" />
                                        </button>
                                    </span>
                                </div>
                            </div>
                            {!isAdmin && (
                                <div className="shrink-0 pt-0.5">
                                    <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                            <div className="relative flex-1">
                                <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search by company or role..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-muted/20 border border-border rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                                />
                            </div>
                            <button
                                onClick={handleSelectAll}
                                className="px-3 py-2 rounded-xl border border-border bg-muted hover:bg-muted/80 text-xs font-semibold shrink-0"
                            >
                                {selectedOppIds.length === filteredOpportunities.length ? 'Clear All' : 'Select All'}
                            </button>
                        </div>

                        <div className="flex-1 sm:max-h-[580px] overflow-y-auto pr-1">
                            {sortedCategories.length === 0 ? (
                                <p className="text-center text-xs text-muted-foreground py-8">No opportunities found matching search.</p>
                            ) : (
                                sortedCategories.map((category) => (
                                    <div key={category} className="pb-5 space-y-2">
                                        <h4 
                                            onClick={() => toggleCollapseCategory(category)}
                                            className="sticky top-0 bg-[#F5F4EF] dark:bg-card z-10 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary border-b border-border flex items-center justify-between cursor-pointer select-none hover:text-primary/80"
                                        >
                                            <span className="flex items-center gap-1">
                                                {collapsedCategories[category] ? (
                                                    <ChevronRightIcon className="h-3 w-3" />
                                                ) : (
                                                    <ChevronDownIcon className="h-3 w-3" />
                                                )}
                                                {category}
                                            </span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleSelectDateGroup(category);
                                                }}
                                                className="text-[9px] font-bold text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                                            >
                                                {isDateGroupSelected(category) ? 'Deselect Group' : 'Select Group'}
                                            </button>
                                        </h4>
                                        {!collapsedCategories[category] && (
                                            <div className="space-y-2">
                                                {groupedOpportunities[category].map((opp) => {
                                                    const pushTitle = `${opp.company} is hiring: ${opp.title}`;
                                                    const pushLocations = opp.locations && opp.locations.length > 0 ? opp.locations.join(', ') : 'India';
                                                    const pushDegrees = getDegreesText(opp);
                                                    const pushMessage = `Location: ${pushLocations} | Eligibility: ${pushDegrees}. Tap to apply.`;
                                                    const pushUrl = `${PROD_SITE_URL}/${opp.slug || opp.id}`;
                                                    const pushQuery = `?title=${encodeURIComponent(pushTitle)}&message=${encodeURIComponent(pushMessage)}&url=${encodeURIComponent(pushUrl)}`;

                                                    return (
                                                        <div
                                                            key={opp.id}
                                                            onClick={() => setActiveOppId(opp.id)}
                                                            onContextMenu={(e) => { e.preventDefault(); setActiveOppId(opp.id); setIsSingleModalOpen(true); }}
                                                            className={`relative overflow-hidden group rounded-xl border p-3 cursor-pointer transition-all duration-200 flex items-start gap-3 ${
                                                                activeOppId === opp.id
                                                                    ? 'border-border bg-primary/5 pl-3.5'
                                                                    : 'border-border/85 bg-secondary/20 hover:bg-secondary/40'
                                                            }`}
                                                        >
                                                            {activeOppId === opp.id && (
                                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                                                            )}
                                                            <CompanyLogo
                                                                companyName={opp.company}
                                                                companyWebsite={opp.companyWebsite}
                                                                companyLogoUrl={opp.companyLogoUrl}
                                                                applyLink={opp.applyLink}
                                                                className="w-10 h-10 shrink-0 rounded-xl border border-border mt-0.5"
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-start justify-between gap-2">
                                                                    <div className="min-w-0">
                                                                        <p className="text-xs font-bold text-foreground truncate">{opp.company}</p>
                                                                        <p className="text-[11px] text-muted-foreground truncate">{opp.title}</p>
                                                                    </div>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selectedOppIds.includes(opp.id)}
                                                                        onChange={() => toggleSelectOpp(opp.id)}
                                                                        onClick={(e) => e.stopPropagation()}
                                                                        className="h-4 w-4 rounded-md border-border text-primary focus:ring-primary cursor-pointer shrink-0 mt-0.5"
                                                                    />
                                                                </div>
                                                                <div className="flex items-center justify-between mt-2.5">
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {getSalaryText(opp) && (
                                                                            <span className="text-[9px] px-1.5 py-0.5 rounded-md border border-border bg-muted text-muted-foreground">
                                                                                {getSalaryText(opp)}
                                                                            </span>
                                                                        )}
                                                                        <span className="text-[9px] px-1.5 py-0.5 rounded-md border border-border bg-muted text-muted-foreground">
                                                                            {opp.type}
                                                                        </span>
                                                                    </div>
                                                                    {/* Copy icons with hover preview captions */}
                                                                    <div className="flex items-center gap-2 md:gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
                                                                        <button onClick={() => copyToClipboard(formatSingleCaption(opp, 'whatsapp'), `wa_${opp.id}`)} className="p-1.5 md:p-2 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title={formatSingleCaption(opp, 'whatsapp')}>
                                                                            {copiedStates[`wa_${opp.id}`] ? <CheckIcon className="w-4 h-4 md:w-5 md:h-5 text-green-500" /> : <WhatsAppBrandIcon className="w-4 h-4 md:w-5 md:h-5" />}
                                                                        </button>
                                                                        <button onClick={() => copyToClipboard(formatSingleCaption(opp, 'telegram'), `tg_${opp.id}`)} className="p-1.5 md:p-2 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title={formatSingleCaption(opp, 'telegram')}>
                                                                            {copiedStates[`tg_${opp.id}`] ? <CheckIcon className="w-4 h-4 md:w-5 md:h-5 text-green-500" /> : <TelegramBrandIcon className="w-4 h-4 md:w-5 md:h-5" />}
                                                                        </button>
                                                                        <button onClick={() => copyToClipboard(formatSingleCaption(opp, 'twitter'), `tw_${opp.id}`)} className="p-1.5 md:p-2 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title={formatSingleCaption(opp, 'twitter')}>
                                                                            {copiedStates[`tw_${opp.id}`] ? <CheckIcon className="w-4 h-4 md:w-5 md:h-5 text-green-500" /> : <XBrandIcon className="w-4 h-4 md:w-5 md:h-5" />}
                                                                        </button>
                                                                        <button onClick={() => copyToClipboard(formatSingleCaption(opp, 'linkedin'), `li_${opp.id}`)} className="p-1.5 md:p-2 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title={formatSingleCaption(opp, 'linkedin')}>
                                                                            {copiedStates[`li_${opp.id}`] ? <CheckIcon className="w-4 h-4 md:w-5 md:h-5 text-green-500" /> : <LinkedInBrandIcon className="w-4 h-4 md:w-5 md:h-5" />}
                                                                        </button>
                                                                        <button onClick={() => copyToClipboard(`${PROD_SITE_URL}/${opp.slug}`, `link_${opp.id}`)} className="p-1.5 md:p-2 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title={`${PROD_SITE_URL}/${opp.slug}`}>
                                                                            {copiedStates[`link_${opp.id}`] ? <CheckIcon className="w-4 h-4 md:w-5 md:h-5 text-green-500" /> : <LinkIcon className="w-4 h-4 md:w-5 md:h-5" />}
                                                                        </button>
                                                                        {isAdmin && (
                                                                            <Link 
                                                                                href={`/admin/push${pushQuery}`}
                                                                                onClick={(e) => e.stopPropagation()}
                                                                                className="p-1.5 md:p-2 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center"
                                                                                title="Send Push Notification"
                                                                            >
                                                                                <BellIcon className="w-4 h-4 md:w-5 md:h-5" />
                                                                            </Link>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right: Single preview + Bulk */}
                    <div className="hidden lg:block space-y-4">

                        {/* Active job — Publish Actions */}
                        {activeOpportunity && (
                            <div className="rounded-2xl border border-border bg-[#F5F4EF] dark:bg-card p-4 shadow-sm space-y-3">
                                <div className="flex items-center gap-3">
                                    <CompanyLogo
                                        companyName={activeOpportunity!.company}
                                        companyWebsite={activeOpportunity!.companyWebsite}
                                        companyLogoUrl={activeOpportunity!.companyLogoUrl}
                                        applyLink={activeOpportunity!.applyLink}
                                        className="w-10 h-10 rounded-lg border border-border shadow-sm flex-shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-sm font-bold text-foreground leading-tight truncate">{activeOpportunity!.company}</h3>
                                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{activeOpportunity!.title}</p>
                                    </div>
                                </div>

                                <div className="space-y-2 border-t border-border/50 pt-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center mb-1">Publish to Platform</p>
                                    {workerOnline ? (
                                        <div className="grid gap-2">
                                            {([
                                                { p: 'telegram' as SendPlatform, label: 'Telegram', icon: <TelegramBrandIcon className="w-4 h-4" /> },
                                                { p: 'x' as SendPlatform, label: 'X (Twitter)', icon: <XBrandIcon className="w-4 h-4" /> },
                                                { p: 'linkedin' as SendPlatform, label: 'LinkedIn', icon: <LinkedInBrandIcon className="w-4 h-4" /> },
                                            ]).map(({ p, label, icon }) => {
                                                const cap = formatSingleCaption(activeOpportunity!, p === 'x' ? 'twitter' : p);
                                                const sKey = `panel_send_${p}_${activeOpportunity!.id}`;
                                                const status = sendStatuses[sKey];
                                                const canSend = platforms[p];
                                                
                                                return (
                                                    <button
                                                        key={p}
                                                        disabled={!canSend || status === 'sending'}
                                                        onClick={() => sendCaption(p, cap, sKey)}
                                                        className={`flex items-center justify-between py-2 px-3 rounded-xl border transition-all ${
                                                            !canSend ? 'border-border bg-muted/20 opacity-50 cursor-not-allowed'
                                                            : status === 'sent' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 shadow-sm'
                                                            : status === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-500 shadow-sm'
                                                            : 'border-border bg-[#F5F4EF] dark:bg-card hover:bg-muted/50 hover:border-primary/30 shadow-sm group'
                                                        }`}
                                                        title={!canSend ? 'Platform not configured' : `Publish directly to ${label}`}
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            {icon}
                                                            <span className="text-xs font-bold text-foreground">{label}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {p === 'x' && cap.length > 280 && (
                                                                <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-md">
                                                                    {cap.length}/280
                                                                </span>
                                                            )}
                                                            <span className={`text-[11px] font-semibold flex items-center gap-1 ${
                                                                !canSend ? 'text-muted-foreground' : 'text-primary opacity-80 group-hover:opacity-100'
                                                            }`}>
                                                                {getSendIcon(status)}
                                                                {!canSend ? 'Offline' : status === 'sent' ? 'Sent' : status === 'error' ? 'Retry' : status === 'sending' ? 'Sending…' : 'Send'}
                                                            </span>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                            {(() => {
                                                const activeTargets = (['telegram', 'x', 'linkedin'] as SendPlatform[]).filter(p => platforms[p]);
                                                const masterKey = `master_publish_${activeOpportunity!.id}`;
                                                const masterStatus = sendStatuses[masterKey];
                                                const masterSending = masterStatus === 'sending';
                                                const masterSent = masterStatus === 'sent';
                                                
                                                const publishToAll = async () => {
                                                    if (activeTargets.length === 0) return;
                                                    setSendStatuses(prev => ({ ...prev, [masterKey]: 'sending' }));
                                                    await Promise.allSettled(activeTargets.map(p => {
                                                        const text = formatSingleCaption(activeOpportunity!, p === 'x' ? 'twitter' : p);
                                                        return sendCaption(p, text, `panel_send_${p}_${activeOpportunity!.id}`);
                                                    }));
                                                    setSendStatuses(prev => ({ ...prev, [masterKey]: 'sent' }));
                                                    setTimeout(() => setSendStatuses(prev => ({ ...prev, [masterKey]: 'idle' })), 4000);
                                                };

                                                return (
                                                    <button
                                                        disabled={activeTargets.length === 0 || masterSending}
                                                        onClick={publishToAll}
                                                        className={`w-full flex items-center justify-center gap-2 py-2 mt-1 rounded-xl text-xs font-bold transition-all shadow-sm ${
                                                            masterSent ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600'
                                                            : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md'
                                                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                                                    >
                                                        {masterSending
                                                            ? <><ArrowPathIcon className="w-4 h-4 animate-spin" /> Publishing All…</>
                                                            : masterSent
                                                            ? <><CheckCircleIcon className="w-4 h-4" /> Published to All</>
                                                            : <><PaperAirplaneIcon className="w-4 h-4" /> Publish</>}
                                                    </button>
                                                );
                                            })()}
                                        </div>
                                    ) : (
                                        <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl bg-muted/15">
                                            Worker offline. Cannot publish.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Bulk Job Updates — with blast send */}
                        <div className="rounded-2xl border border-border bg-[#F5F4EF] dark:bg-card p-4 shadow-sm space-y-3">
                            <div className="flex items-center justify-between border-b border-border pb-2">
                                <div>
                                    <h3 className="text-sm font-bold text-foreground">{"Today's Bulk Job Updates"}</h3>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        Selected: <span className="font-semibold text-foreground">{selectedOppIds.length} job(s)</span>
                                    </p>
                                </div>
                                <button
                                    disabled={selectedOppIds.length === 0}
                                    onClick={() => copyToClipboard(formatBulkCaption(), 'bulk')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold transition-all duration-200 shadow-sm"
                                >
                                    {copiedStates['bulk'] ? <><CheckIcon className="h-3.5 w-3.5" /> Copied</> : <><ClipboardIcon className="h-3.5 w-3.5" /> Copy Bulk</>}
                                </button>
                            </div>
                            <div className="flex gap-2 h-48">
                                <div className="flex-1 bg-muted/20 border border-border rounded-xl p-3 text-xs font-mono whitespace-pre-wrap break-words overflow-y-auto select-text">
                                    {selectedOppIds.length > 0 ? formatBulkCaption() : <span className="text-muted-foreground/50">Check boxes next to jobs on the left to generate bulk captions.</span>}
                                </div>
                                <div className="flex flex-col gap-1.5 bg-muted/30 border border-border rounded-xl p-1.5 justify-center">
                                    {([
                                        { p: 'whatsapp' as Platform, icon: <WhatsAppBrandIcon className="w-4 h-4" /> },
                                        { p: 'telegram' as Platform, icon: <TelegramBrandIcon className="w-4 h-4" /> },
                                        { p: 'twitter' as Platform, icon: <XBrandIcon className="w-4 h-4" /> },
                                        { p: 'linkedin' as Platform, icon: <LinkedInBrandIcon className="w-4 h-4" /> },
                                    ]).map(({ p, icon }) => (
                                        <button
                                            key={p}
                                            onClick={() => setBulkPreviewPlatform(p)}
                                            className={`p-2 rounded-lg transition-all ${bulkPreviewPlatform === p ? 'bg-[#F5F4EF] dark:bg-card shadow-sm text-foreground border border-border' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-transparent'}`}
                                            title={`Preview for ${p}`}
                                        >
                                            {icon}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Publish Bulk to Telegram */}
                            {workerOnline && (
                                <div className="pt-2 border-t border-border">
                                    {(() => {
                                        const sKey = `bulk_send_telegram`;
                                        const status = sendStatuses[sKey];
                                        const isSent = status === 'sent';
                                        const sending = status === 'sending';
                                        
                                        const publishBulkToTg = async () => {
                                            const text = formatBulkCaption('telegram');
                                            await sendCaption('telegram', text, sKey);
                                        };

                                        return (
                                            <button
                                                disabled={!platforms.telegram || sending || selectedOppIds.length === 0}
                                                onClick={publishBulkToTg}
                                                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                                                    isSent ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600'
                                                    : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md'
                                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                            >
                                                {sending
                                                    ? <><ArrowPathIcon className="w-4 h-4 animate-spin" /> Publishing to TG…</>
                                                    : isSent
                                                    ? <><CheckCircleIcon className="w-4 h-4" /> Published to TG</>
                                                    : <><TelegramBrandIcon className="w-4 h-4" /> Publish Bulk to TG</>}
                                            </button>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile FAB — bulk only */}
            <div className="fixed bottom-6 right-6 z-40 lg:hidden">
                <button
                    onClick={() => setIsBulkModalOpen(true)}
                    disabled={selectedOppIds.length === 0}
                    className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-primary text-primary-foreground shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold"
                    title="Bulk caption"
                >
                    <SparklesIcon className="h-4 w-4" />
                    {selectedOppIds.length > 0 ? `Bulk (${selectedOppIds.length})` : 'Bulk'}
                </button>
            </div>

            {/* Mobile Single Caption Bottom Sheet */}
            {isSingleModalOpen && activeOpportunity! && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center lg:hidden"
                    onClick={() => setIsSingleModalOpen(false)}
                >
                    <div
                        className="bg-[#F5F4EF] dark:bg-card w-full max-w-md rounded-t-3xl p-5 space-y-3 animate-in slide-in-from-bottom duration-300 shadow-2xl border-t border-border"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center gap-3 pb-3 border-b border-border">
                            <CompanyLogo
                                companyName={activeOpportunity!.company}
                                companyWebsite={activeOpportunity!.companyWebsite}
                                companyLogoUrl={activeOpportunity!.companyLogoUrl}
                                applyLink={activeOpportunity!.applyLink}
                                className="w-9 h-9 rounded-xl border border-border shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                                <h3 className="text-sm font-bold text-foreground truncate">{activeOpportunity!.company}</h3>
                                <p className="text-[10px] text-muted-foreground truncate">{activeOpportunity!.title}</p>
                            </div>
                            <button onClick={() => setIsSingleModalOpen(false)} className="p-1.5 rounded-lg bg-muted text-muted-foreground">
                                <CheckIcon className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Per-platform rows */}
                        {([
                            { p: 'whatsapp' as const, label: 'WhatsApp', icon: <WhatsAppBrandIcon className="w-4 h-4" /> },
                            { p: 'telegram' as const, label: 'Telegram', icon: <TelegramBrandIcon className="w-4 h-4" />, sendP: 'telegram' as SendPlatform },
                            { p: 'twitter' as const, label: 'X / Twitter', icon: <XBrandIcon className="w-4 h-4" />, sendP: 'x' as SendPlatform },
                            { p: 'linkedin' as const, label: 'LinkedIn', icon: <LinkedInBrandIcon className="w-4 h-4" />, sendP: 'linkedin' as SendPlatform },
                        ] as { p: 'whatsapp'|'telegram'|'twitter'|'linkedin'; label: string; icon: React.ReactNode; sendP?: SendPlatform }[]).map(({ p, label, icon, sendP }) => {
                            const cap = formatSingleCaption(activeOpportunity!, p);
                            const copyKey = `mob_${p}_${activeOpportunity!.id}`;
                            const sKey = sendP ? `mob_send_${sendP}_${activeOpportunity!.id}` : '';
                            const status = sKey ? sendStatuses[sKey] : undefined;
                            const canSend = workerOnline && sendP && platforms[sendP];
                            return (
                                <div key={p} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
                                    <span className="shrink-0">{icon}</span>
                                    <span className="flex-1 text-xs font-medium text-muted-foreground">{label}</span>
                                    <button
                                        onClick={() => copyToClipboard(cap, copyKey)}
                                        className="p-2 rounded-xl bg-muted/50 hover:bg-muted text-muted-foreground transition-colors"
                                        title={`Copy ${label}`}
                                    >
                                        {copiedStates[copyKey] ? <CheckIcon className="w-4 h-4 text-green-500" /> : <ClipboardIcon className="w-4 h-4" />}
                                    </button>
                                    {canSend && (
                                        <button
                                            disabled={status === 'sending'}
                                            onClick={() => sendCaption(sendP!, cap, sKey)}
                                            className={`flex items-center justify-center p-2 rounded-xl text-xs font-semibold transition-all ${
                                                status === 'sent' ? 'bg-emerald-500/10 text-emerald-600 px-3'
                                                : status === 'error' ? 'bg-red-500/10 text-red-500 px-3'
                                                : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                            } disabled:opacity-60`}
                                            title="Send to platform"
                                        >
                                            {getSendIcon(status)}
                                            {status === 'sent' ? <span className="ml-1">Sent</span> : status === 'error' ? <span className="ml-1">Retry</span> : null}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                        
                        {/* Master Publish All Button for Mobile */}
                        {(() => {
                            const activeTargets = (['telegram', 'x', 'linkedin'] as SendPlatform[]).filter(p => platforms[p]);
                            const masterKey = `mob_master_publish_${activeOpportunity!.id}`;
                            const masterStatus = sendStatuses[masterKey];
                            const masterSending = masterStatus === 'sending';
                            const masterSent = masterStatus === 'sent';
                            
                            const publishToAll = async () => {
                                if (activeTargets.length === 0) return;
                                setSendStatuses(prev => ({ ...prev, [masterKey]: 'sending' }));
                                await Promise.allSettled(activeTargets.map(p => {
                                    const text = formatSingleCaption(activeOpportunity!, p === 'x' ? 'twitter' : p);
                                    return sendCaption(p, text, `mob_send_${p}_${activeOpportunity!.id}`);
                                }));
                                setSendStatuses(prev => ({ ...prev, [masterKey]: 'sent' }));
                                setTimeout(() => setSendStatuses(prev => ({ ...prev, [masterKey]: 'idle' })), 4000);
                            };

                            return workerOnline && (
                                <button
                                    disabled={activeTargets.length === 0 || masterSending}
                                    onClick={publishToAll}
                                    className={`w-full flex items-center justify-center gap-2 py-3 mt-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                                        masterSent ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600'
                                        : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {masterSending
                                        ? <><ArrowPathIcon className="w-4 h-4 animate-spin" /> Publishing All…</>
                                        : masterSent
                                        ? <><CheckCircleIcon className="w-4 h-4" /> Published to All</>
                                        : <><PaperAirplaneIcon className="w-4 h-4" /> Publish to All</>}
                                </button>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* Mobile Bulk Caption Modal */}
            {isBulkModalOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center lg:hidden"
                    onClick={() => setIsBulkModalOpen(false)}
                >
                    <div
                        className="bg-[#F5F4EF] dark:bg-card w-full max-w-md rounded-t-3xl p-5 space-y-3 animate-in slide-in-from-bottom duration-300 shadow-2xl border-t border-border"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-border">
                            <div>
                                <h3 className="text-sm font-bold text-foreground">Bulk Job Updates</h3>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Selected: <span className="font-semibold text-foreground">{selectedOppIds.length} job(s)</span></p>
                            </div>
                            <button
                                onClick={() => copyToClipboard(formatBulkCaption(), 'bulk_m')}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted hover:bg-muted/80 border border-border text-xs font-semibold"
                            >
                                {copiedStates['bulk_m'] ? <><CheckIcon className="h-3.5 w-3.5 text-green-500" /> Copied</> : <><ClipboardIcon className="h-3.5 w-3.5" /> Copy</>}
                            </button>
                        </div>

                        {/* Publish Bulk to Telegram */}
                        {workerOnline && (
                            <div className="pt-2 border-t border-border">
                                {(() => {
                                    const sKey = `bulk_send_telegram`;
                                    const status = sendStatuses[sKey];
                                    const isSent = status === 'sent';
                                    const sending = status === 'sending';
                                    
                                    const publishBulkToTg = async () => {
                                        const text = formatBulkCaption('telegram');
                                        await sendCaption('telegram', text, sKey);
                                    };

                                    return (
                                        <button
                                            disabled={!platforms.telegram || sending || selectedOppIds.length === 0}
                                            onClick={publishBulkToTg}
                                            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all shadow-sm ${
                                                isSent ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600'
                                                : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md'
                                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                                        >
                                            {sending
                                                ? <><ArrowPathIcon className="w-4 h-4 animate-spin" /> Publishing to TG…</>
                                                : isSent
                                                ? <><CheckCircleIcon className="w-4 h-4" /> Published to TG</>
                                                : <><TelegramBrandIcon className="w-4 h-4" /> Publish Bulk to TG</>}
                                        </button>
                                    );
                                })()}
                            </div>
                        )}

                        <button
                            onClick={() => setIsBulkModalOpen(false)}
                            className="w-full py-2.5 rounded-xl border border-border bg-muted hover:bg-muted/80 text-xs font-semibold"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}


