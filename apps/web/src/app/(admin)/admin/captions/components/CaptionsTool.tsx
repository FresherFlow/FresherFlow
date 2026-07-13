'use client';

import { useEffect, useState } from 'react';
import { 
    ClipboardIcon, 
    CheckIcon,
    MagnifyingGlassIcon,
    ShareIcon,
    SparklesIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    LinkIcon,
    BellIcon
} from '@heroicons/react/24/outline';
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
    const [activePlatform, setActivePlatform] = useState<'whatsapp' | 'telegram' | 'twitter' | 'linkedin'>('whatsapp');
    const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});

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
${SITE_URL}/${opp.slug}

📱 More jobs: ${SITE_URL.replace(/^https?:\/\//, '')}/app`;
        }

        if (platform === 'twitter') {
            const twBatch = batchYears ? `\n🎯 ${batchYears}` : '';
            const twHashtags = (companyHash && locationHash) ? `${companyHash} ${locationHash} #Freshers` : '#Jobs #Hiring #Freshers';

            return `🚀 ${opp.company} Hiring ${opp.title}
${twBatch}
💼 ${exp}
📍 ${locations}

Apply 👇
${SITE_URL}/${opp.slug}

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
${SITE_URL}/${opp.slug}

📱 More jobs: ${SITE_URL.replace(/^https?:\/\//, '')}/app

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
${SITE_URL}/${opp.slug}

📱 *More jobs on FresherFlow:* ${SITE_URL.replace(/^https?:\/\//, '')}/app`;
    };

    const formatBulkCaption = () => {
        const selectedOpps = opportunities.filter((opp) => selectedOppIds.includes(opp.id));
        if (selectedOpps.length === 0) return '';

        if (activePlatform === 'whatsapp') {
            let body = `🚨 *Today's Job Updates*\n\n`;
            selectedOpps.forEach((opp, index) => {
                const numEmoji = getNumberEmoji(index + 1);
                body += `${numEmoji} *${opp.company}*\n> ${opp.title}\n🔗 ${SITE_URL}/${opp.slug}\n\n`;
            });
            body += `📱 *More jobs:* ${SITE_URL.replace(/^https?:\/\//, '')}/app`;
            return body;
        }

        if (activePlatform === 'telegram') {
            let body = `🚨 Today's Job Updates\n\n`;
            selectedOpps.forEach((opp, index) => {
                const numEmoji = getNumberEmoji(index + 1);
                body += `${numEmoji} ${opp.company} — ${opp.title}\n🔗 ${SITE_URL}/${opp.slug}\n\n`;
            });
            body += `📱 More jobs: ${SITE_URL.replace(/^https?:\/\//, '')}/app`;
            return body;
        }

        if (activePlatform === 'linkedin') {
            return `⚠️ LinkedIn is not optimized for long job lists. To maximize engagement, we recommend posting each job as an individual post instead!`;
        }

        // Twitter Bulk
        return `⚠️ Twitter/X is not optimized for long job lists. To maximize engagement, we recommend posting each job as an individual tweet instead!`;
    };

    // Clipboard copy wrapper
    const copyToClipboard = async (text: string, key: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedStates((prev) => ({ ...prev, [key]: true }));
            toast.success('Caption copied!');
            setTimeout(() => {
                setCopiedStates((prev) => ({ ...prev, [key]: false }));
            }, 2000);
        } catch (err) {
            console.error('Copy failed', err);
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
                    <div className="lg:col-span-2 h-screen sm:h-auto rounded-none sm:rounded-2xl border-y sm:border border-x-0 sm:border-border bg-card p-3 sm:p-4 shadow-none sm:shadow-sm flex flex-col space-y-4 overflow-hidden">
                        {/* Title inside left column */}
                        <div className="border-b border-border pb-3 shrink-0 flex items-start justify-between gap-4">
                            <div className="min-w-0">
                                <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                    <SparklesIcon className="h-5 w-5 text-primary" />
                                    Social Captions Generator
                                </h1>
                                <p className="text-[11px] text-muted-foreground mt-1">
                                    Extract live jobs from the CDN feed and generate custom WhatsApp & Telegram broadcast updates.
                                </p>
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
                                            className="sticky top-0 bg-card z-10 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary border-b border-border flex items-center justify-between cursor-pointer select-none hover:text-primary/80"
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
                                                    const pushUrl = `${SITE_URL}/${opp.slug || opp.id}`;
                                                    const pushQuery = `?title=${encodeURIComponent(pushTitle)}&message=${encodeURIComponent(pushMessage)}&url=${encodeURIComponent(pushUrl)}`;

                                                    return (
                                                        <div
                                                            key={opp.id}
                                                            onClick={() => setActiveOppId(opp.id)}
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
                                                                    <div className="flex items-center gap-2 md:gap-3 shrink-0">
                                                                        <button onClick={(e) => { e.stopPropagation(); copyToClipboard(formatSingleCaption(opp, 'whatsapp'), `wa_${opp.id}`); }} className="p-1.5 md:p-2 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Copy WhatsApp Caption">
                                                                            {copiedStates[`wa_${opp.id}`] ? <CheckIcon className="w-4 h-4 md:w-5 md:h-5 text-green-500" /> : <WhatsAppBrandIcon className="w-4 h-4 md:w-5 md:h-5" />}
                                                                        </button>
                                                                        <button onClick={(e) => { e.stopPropagation(); copyToClipboard(formatSingleCaption(opp, 'telegram'), `tg_${opp.id}`); }} className="p-1.5 md:p-2 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Copy Telegram Caption">
                                                                            {copiedStates[`tg_${opp.id}`] ? <CheckIcon className="w-4 h-4 md:w-5 md:h-5 text-green-500" /> : <TelegramBrandIcon className="w-4 h-4 md:w-5 md:h-5" />}
                                                                        </button>
                                                                        <button onClick={(e) => { e.stopPropagation(); copyToClipboard(formatSingleCaption(opp, 'twitter'), `tw_${opp.id}`); }} className="p-1.5 md:p-2 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Copy Twitter/X Caption">
                                                                            {copiedStates[`tw_${opp.id}`] ? <CheckIcon className="w-4 h-4 md:w-5 md:h-5 text-green-500" /> : <XBrandIcon className="w-4 h-4 md:w-5 md:h-5" />}
                                                                        </button>
                                                                        <button onClick={(e) => { e.stopPropagation(); copyToClipboard(formatSingleCaption(opp, 'linkedin'), `li_${opp.id}`); }} className="p-1.5 md:p-2 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Copy LinkedIn Caption">
                                                                            {copiedStates[`li_${opp.id}`] ? <CheckIcon className="w-4 h-4 md:w-5 md:h-5 text-green-500" /> : <LinkedInBrandIcon className="w-4 h-4 md:w-5 md:h-5" />}
                                                                        </button>
                                                                        <button onClick={(e) => { e.stopPropagation(); copyToClipboard(`${SITE_URL}/${opp.slug}`, `link_${opp.id}`); }} className="p-1.5 md:p-2 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Copy Apply Link">
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

                    {/* Right: Caption Previewers */}
                    <div className="hidden lg:block space-y-6">


                        {/* Bulk Job Updates Caption */}
                        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-border pb-3">
                                <div>
                                    <h3 className="text-sm font-bold text-foreground">{"Today's Bulk Job Updates"}</h3>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        Selected: <span className="font-semibold text-foreground">{selectedOppIds.length} job(s)</span>
                                    </p>
                                </div>
                                <button
                                    disabled={selectedOppIds.length === 0}
                                    onClick={() => copyToClipboard(formatBulkCaption(), 'bulk')}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold transition-all duration-200"
                                >
                                    {copiedStates['bulk'] ? (
                                        <>
                                            <CheckIcon className="h-3.5 w-3.5" />
                                            Copied
                                        </>
                                    ) : (
                                        <>
                                            <ClipboardIcon className="h-3.5 w-3.5" />
                                            Copy Bulk Update
                                        </>
                                    )}
                                </button>
                            </div>
                            {selectedOppIds.length > 0 ? (
                                <div className="w-full bg-muted/20 border border-border rounded-xl p-4 text-xs font-mono whitespace-pre-wrap break-words overflow-y-auto max-h-[600px] select-text">
                                    {formatBulkCaption()}
                                </div>
                            ) : (
                                <div className="py-12 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl bg-muted/15">
                                    Check boxes next to opportunities on the left to compile a bulk update message.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Floating Action Buttons */}
            <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40 lg:hidden">
                {activeOpportunity && (
                    <button
                        onClick={() => setIsSingleModalOpen(true)}
                        className="p-3.5 rounded-full bg-primary text-primary-foreground shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 border border-border flex items-center justify-center"
                        title="View Single Caption"
                    >
                        <ShareIcon className="h-5 w-5" />
                    </button>
                )}
                <button
                    onClick={() => setIsBulkModalOpen(true)}
                    disabled={selectedOppIds.length === 0}
                    className="p-3.5 rounded-full bg-primary text-primary-foreground shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 border border-border flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    title="View Bulk Update"
                >
                    <SparklesIcon className="h-5 w-5" />
                </button>
            </div>

            {/* Mobile Single Caption Modal */}
            {isSingleModalOpen && activeOpportunity && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center lg:hidden"
                    onClick={() => setIsSingleModalOpen(false)}
                >
                    <div 
                        className="bg-card w-full max-w-md rounded-t-3xl p-6 space-y-4 animate-in slide-in-from-bottom duration-300 shadow-2xl border-t border-border"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div className="flex items-center gap-3">
                                <CompanyLogo
                                    companyName={activeOpportunity.company}
                                    companyWebsite={activeOpportunity.companyWebsite}
                                    companyLogoUrl={activeOpportunity.companyLogoUrl}
                                    applyLink={activeOpportunity.applyLink}
                                    className="w-10 h-10 rounded-lg border border-border"
                                />
                                <div>
                                    <h3 className="text-sm font-bold text-foreground">Single Job Caption</h3>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{activeOpportunity.company}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => copyToClipboard(formatSingleCaption(activeOpportunity, activePlatform), `single_m_${activeOpportunity.id}`)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
                            >
                                {copiedStates[`single_m_${activeOpportunity.id}`] ? (
                                    <>
                                        <CheckIcon className="h-3.5 w-3.5" />
                                        Copied
                                    </>
                                ) : (
                                    <>
                                        <ClipboardIcon className="h-3.5 w-3.5" />
                                        Copy
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Mobile Platform Selector Tabs */}
                        <div className="flex gap-1 border-b border-border pb-2">
                            {(['whatsapp', 'telegram', 'twitter', 'linkedin'] as const).map((platform) => (
                                <button
                                    key={platform}
                                    onClick={() => setActivePlatform(platform)}
                                    className={`flex-1 py-1 rounded-md text-[10px] font-bold transition-all uppercase ${
                                        activePlatform === platform
                                            ? 'bg-primary/10 text-primary border border-primary/20'
                                            : 'bg-muted/40 hover:bg-muted text-muted-foreground border border-transparent'
                                    }`}
                                >
                                    {platform}
                                </button>
                            ))}
                        </div>

                        <textarea
                            readOnly
                            value={formatSingleCaption(activeOpportunity, activePlatform)}
                            rows={10}
                            className="w-full bg-muted/20 border border-border rounded-xl p-4 text-xs font-mono outline-none resize-none"
                        />
                        <button
                            onClick={() => setIsSingleModalOpen(false)}
                            className="w-full py-2.5 rounded-xl border border-border bg-muted hover:bg-muted/80 text-xs font-semibold"
                        >
                            Close
                        </button>
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
                        className="bg-card w-full max-w-md rounded-t-3xl p-6 space-y-4 animate-in slide-in-from-bottom duration-300 shadow-2xl border-t border-border"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between border-b border-border pb-3">
                            <div>
                                <h3 className="text-sm font-bold text-foreground">Bulk Job Updates</h3>
                                <p className="text-[10px] text-muted-foreground mt-0.5">Selected: <span className="font-semibold text-foreground">{selectedOppIds.length} job(s)</span></p>
                            </div>
                            <button
                                onClick={() => copyToClipboard(formatBulkCaption(), 'bulk_m')}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
                            >
                                {copiedStates['bulk_m'] ? (
                                    <>
                                        <CheckIcon className="h-3.5 w-3.5" />
                                        Copied
                                    </>
                                ) : (
                                    <>
                                        <ClipboardIcon className="h-3.5 w-3.5" />
                                        Copy All
                                    </>
                                )}
                            </button>
                        </div>
                        <textarea
                            readOnly
                            value={formatBulkCaption()}
                            rows={10}
                            className="w-full bg-muted/20 border border-border rounded-xl p-4 text-xs font-mono outline-none resize-none"
                        />
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
