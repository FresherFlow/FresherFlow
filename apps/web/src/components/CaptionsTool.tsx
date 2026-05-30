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
    ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { Opportunity } from '@fresherflow/types';
import toast from 'react-hot-toast';
import CompanyLogo from '@/components/ui/CompanyLogo';
import { useInstallPrompt } from '@/contexts/InstallPromptContext';

export default function CaptionsTool() {
    const { canInstall, promptInstall } = useInstallPrompt();
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
            ? opp.requiredSkills.slice(0, 4) 
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
https://fresherflow.in/opportunities/${opp.slug}

📱 More jobs: fresherflow.in/download`;
        }

        if (platform === 'twitter') {
            const twBatch = batchYears ? `\n🎯 ${batchYears}` : '';
            const twHashtags = (companyHash && locationHash) ? `${companyHash} ${locationHash} #Freshers` : '#Jobs #Hiring #Freshers';

            return `🚀 ${opp.company} Hiring ${opp.title}
${twBatch}
💼 ${exp}
📍 ${locations}

Apply 👇
https://fresherflow.in/opportunities/${opp.slug}

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
https://fresherflow.in/opportunities/${opp.slug}

📱 More jobs: fresherflow.in/download

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
https://fresherflow.in/opportunities/${opp.slug}

📱 *More jobs on FresherFlow:* fresherflow.in/download`;
    };

    const formatBulkCaption = () => {
        const selectedOpps = opportunities.filter((opp) => selectedOppIds.includes(opp.id));
        if (selectedOpps.length === 0) return '';

        if (activePlatform === 'whatsapp') {
            let body = `🚨 *Today's Job Updates*\n\n`;
            selectedOpps.forEach((opp, index) => {
                const numEmoji = getNumberEmoji(index + 1);
                body += `${numEmoji} *${opp.company}*\n> ${opp.title}\n🔗 https://fresherflow.in/opportunities/${opp.slug}\n\n`;
            });
            body += `📱 *More jobs:* fresherflow.in/download`;
            return body;
        }

        if (activePlatform === 'telegram') {
            let body = `🚨 Today's Job Updates\n\n`;
            selectedOpps.forEach((opp, index) => {
                const numEmoji = getNumberEmoji(index + 1);
                body += `${numEmoji} ${opp.company} — ${opp.title}\n🔗 https://fresherflow.in/opportunities/${opp.slug}\n\n`;
            });
            body += `📱 More jobs: fresherflow.in/download`;
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    {/* Left: Feed opportunities selector */}
                    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm space-y-4">
                        {/* Title inside left column */}
                        <div className="border-b border-border pb-3">
                            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                <SparklesIcon className="h-5 w-5 text-primary" />
                                Social Captions Generator
                            </h1>
                            <p className="text-[11px] text-muted-foreground mt-1">
                                Extract live jobs from the CDN feed and generate custom WhatsApp & Telegram broadcast updates.
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
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

                        <div className="max-h-[580px] overflow-y-auto space-y-4 pr-1">
                            {sortedCategories.length === 0 ? (
                                <p className="text-center text-xs text-muted-foreground py-8">No opportunities found matching search.</p>
                            ) : (
                                sortedCategories.map((category) => (
                                    <div key={category} className="space-y-2">
                                        <h4 
                                            onClick={() => toggleCollapseCategory(category)}
                                            className="text-[10px] font-bold uppercase tracking-wider text-primary border-b border-border pb-1 flex items-center justify-between cursor-pointer select-none hover:text-primary/80"
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
                                                {groupedOpportunities[category].map((opp) => (
                                                    <div
                                                        key={opp.id}
                                                        onClick={() => setActiveOppId(opp.id)}
                                                        className={`group rounded-xl border p-3 cursor-pointer transition-all duration-200 flex items-start gap-3 ${
                                                            activeOppId === opp.id
                                                                ? 'border-primary bg-primary/5'
                                                                : 'border-border/85 bg-secondary/20 hover:bg-secondary/40'
                                                        }`}
                                                    >
                                                        <CompanyLogo
                                                            companyName={opp.company}
                                                            companyWebsite={opp.companyWebsite}
                                                            companyLogoUrl={opp.companyLogoUrl}
                                                            applyLink={opp.applyLink}
                                                            className="w-12 h-12 rounded-xl border border-border mt-0.5"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs font-bold text-foreground truncate">{opp.company}</p>
                                                            <p className="text-[11px] text-muted-foreground truncate">{opp.title}</p>
                                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                                {getSalaryText(opp) && (
                                                                    <span className="text-[9px] px-1.5 py-0.5 rounded-md border border-border bg-muted text-muted-foreground">
                                                                        {getSalaryText(opp)}
                                                                    </span>
                                                                )}
                                                                <span className="text-[9px] px-1.5 py-0.5 rounded-md border border-border bg-muted text-muted-foreground">
                                                                    {opp.type}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedOppIds.includes(opp.id)}
                                                            onChange={() => toggleSelectOpp(opp.id)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="mt-3.5 h-5 w-5 rounded-md border-border text-primary focus:ring-primary cursor-pointer shrink-0"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right: Caption Previewers */}
                    <div className="hidden lg:block space-y-6">
                        {/* Single WhatsApp/Telegram/Twitter/LinkedIn Caption */}
                        {activeOpportunity ? (
                            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
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
                                            <h3 className="text-sm font-bold text-foreground">Single Opportunity Caption</h3>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">Selected: <span className="font-semibold text-foreground">{activeOpportunity.company}</span></p>
                                        </div>
                                    </div>
                                </div>

                                <textarea
                                    readOnly
                                    value={formatSingleCaption(activeOpportunity, activePlatform)}
                                    rows={9}
                                    className="w-full bg-muted/20 border border-border rounded-xl p-4 text-xs font-mono outline-none resize-none"
                                />

                                {/* Footer with Selector Tabs and Copy Button */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border">
                                    <div className="flex flex-wrap gap-1.5">
                                        {(['whatsapp', 'telegram', 'twitter', 'linkedin'] as const).map((platform) => (
                                            <button
                                                key={platform}
                                                onClick={() => setActivePlatform(platform)}
                                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase ${
                                                    activePlatform === platform
                                                        ? 'bg-primary/10 text-primary border border-primary/20'
                                                        : 'bg-muted/40 hover:bg-muted text-muted-foreground border border-transparent'
                                                }`}
                                            >
                                                {platform}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => copyToClipboard(formatSingleCaption(activeOpportunity, activePlatform), `single_${activeOpportunity.id}`)}
                                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold transition-all duration-200 shrink-0 justify-center"
                                    >
                                        {copiedStates[`single_${activeOpportunity.id}`] ? (
                                            <>
                                                <CheckIcon className="h-3.5 w-3.5" />
                                                Copied
                                            </>
                                        ) : (
                                            <>
                                                <ClipboardIcon className="h-3.5 w-3.5" />
                                                Copy Caption
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-border border-dashed p-10 text-center text-xs text-muted-foreground bg-card">
                                Select an opportunity to view single post caption.
                            </div>
                        )}

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
                                <textarea
                                    readOnly
                                    value={formatBulkCaption()}
                                    rows={10}
                                    className="w-full bg-muted/20 border border-border rounded-xl p-4 text-xs font-mono outline-none resize-none"
                                />
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
            <div className="fixed bottom-20 right-6 flex flex-col gap-3 z-40 lg:hidden">
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
