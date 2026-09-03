import { Opportunity } from '@fresherflow/types';
import { getOpportunityDisplaySalary, normalizeSalaryInput } from '@/features/opportunities/domain/opportunityDisplay';
import { getDriveMetadata, isCampusDriveOpportunity } from '@/lib/utils/driveTimeline';
import { parseOpportunityLocation } from '@/features/opportunities/domain/opportunityDisplay';

export function resolvePassoutYears(job: Opportunity): number[] {
    let passoutYears = [...(job.allowedPassoutYears || [])];
    if (passoutYears.length === 0 && job.passoutYearMin && job.passoutYearMax) {
        const min = Number(job.passoutYearMin);
        const max = Number(job.passoutYearMax);
        if (!isNaN(min) && !isNaN(max) && min <= max) {
            passoutYears = Array.from({ length: max - min + 1 }, (_, i) => min + i);
        }
    }
    if (passoutYears.length === 0 && job.title) {
        const titleMatch = job.title.match(/(202[0-9]|2030)/g);
        if (titleMatch) passoutYears = Array.from(new Set(titleMatch.map(Number))).sort((a, b) => a - b);
    }
    if (passoutYears.length === 0 && job.description) {
        const descMatch = job.description.match(/(202[0-9]|2030)/g);
        if (descMatch) passoutYears = Array.from(new Set(descMatch.map(Number))).sort((a, b) => a - b);
    }
    return passoutYears;
}

export function formatPassoutYears(years: number[]): string | null {
    if (!years || years.length === 0) return null;
    const sorted = Array.from(new Set(years)).sort((a, b) => a - b);
    if (sorted.length === 1) return `${sorted[0]}`;
    if (sorted.length === 2) return `${sorted[0]}, ${String(sorted[1]).slice(-2)}`;

    // Check if consecutive (e.g. 2024, 2025, 2026, 2027 -> 2024-27)
    const isConsecutive = sorted.every((y, idx) => idx === 0 || y === sorted[idx - 1] + 1);
    if (isConsecutive && sorted.length >= 3) {
        return `${sorted[0]}-${String(sorted[sorted.length - 1]).slice(-2)}`;
    }

    return `${sorted[0]}, ${sorted.slice(1).map((y) => String(y).slice(-2)).join(', ')}`;
}

export function formatEducationEligibility(job: Opportunity): string | null {
    const rawDegrees = (job.allowedDegrees || []).map((d) => d.trim()).filter(Boolean);
    const rawCourses = [...(job.allowedCourses || []), ...(job.allowedSpecializations || [])].map((c) => c.trim()).filter(Boolean);

    // Clean course names (e.g. "B.Tech / B.E." -> "B.Tech/B.E", "M.Tech / M.E." -> "M.Tech/M.E")
    const cleanCourses = Array.from(
        new Set(
            rawCourses.map((c) => {
                return c.replace(/\s*\/\s*/g, '/');
            })
        )
    ).filter(Boolean);

    // If specific courses exist, they are superior to generic "DEGREE" tags
    if (cleanCourses.length > 0) {
        const branchString = cleanCourses.slice(0, 4).join(', ');
        const remaining = cleanCourses.length - 4;
        const suffix = remaining > 0 ? ` +${remaining}` : '';
        return `${branchString}${suffix}`;
    }

    // Map database enum degrees to human terms (never raw DEGREE)
    const mappedDegrees = rawDegrees
        .map((d) => {
            const upper = d.toUpperCase();
            if (upper === 'DEGREE' || upper === 'GRADUATE' || upper === 'BACHELOR') return 'Any Graduate';
            if (upper === 'PG' || upper === 'POSTGRADUATE' || upper === 'MASTERS') return 'Postgraduate';
            if (upper === 'DIPLOMA') return 'Diploma';
            if (upper === 'INTER' || upper === '12TH') return '12th Pass';
            if (upper === 'TENTH' || upper === '10TH') return '10th Pass';
            return d;
        })
        .filter(Boolean);

    const uniqueDegrees = Array.from(new Set(mappedDegrees));
    if (uniqueDegrees.length > 0) {
        return uniqueDegrees.join(', ');
    }

    return null;
}

export function generateJobSummaryText(job: Opportunity, shareUrl: string): string {
    const loc = parseOpportunityLocation(job.locations).shortLabel;
    const rawMode = (job.workMode as string) || (job as { mode?: string }).mode || 'Onsite';
    const workMode = rawMode.toLowerCase().includes('remote')
        ? 'Remote'
        : rawMode.toLowerCase().includes('hybrid')
        ? 'Hybrid'
        : 'Onsite';
    const salary = getOpportunityDisplaySalary(job);
    const passoutYears = resolvePassoutYears(job);
    const formattedBatches = formatPassoutYears(passoutYears);
    const formattedEdu = formatEducationEligibility(job);

    const lines: string[] = [
        `*${job.normalizedRole || job.title}* at *${job.company ?? 'FresherFlow'}*`,
        `Location: ${loc}`,
        `Work Mode: ${workMode}`,
    ];

    if (salary) lines.push(`Salary: ${salary}`);
    if (formattedBatches) lines.push(`Batches: ${formattedBatches}`);
    if (formattedEdu) lines.push(`Eligibility: ${formattedEdu}`);

    if ((job.type === 'WALKIN' || isCampusDriveOpportunity(job)) && job.walkInDetails) {
        if (job.walkInDetails.dateRange) lines.push(`Dates: ${job.walkInDetails.dateRange}`);
        if (job.walkInDetails.venueAddress) lines.push(`Venue: ${job.walkInDetails.venueAddress}`);
    }

    lines.push('');
    if (shareUrl) lines.push(`Apply here: ${shareUrl}`);
    lines.push('Verified on FresherFlow (fresherflow.in)');

    return lines.join('\n');
}

export function reorderSkillsBySearch(skills: string[] = [], searchQuery?: string): string[] {
    if (!skills.length || !searchQuery?.trim()) return skills;

    const normalizedQuery = searchQuery.trim().toLowerCase();
    const queryTokens = normalizedQuery
        .split(/[\s,]+/)
        .map((t) => t.trim())
        .filter((t) => t.length > 1);

    const matches: string[] = [];
    const nonMatches: string[] = [];

    for (const skill of skills) {
        const lowerSkill = skill.toLowerCase();
        const isMatch =
            lowerSkill === normalizedQuery ||
            normalizedQuery.includes(lowerSkill) ||
            lowerSkill.includes(normalizedQuery) ||
            queryTokens.some((token) => lowerSkill.includes(token) || token.includes(lowerSkill));

        if (isMatch) matches.push(skill);
        else nonMatches.push(skill);
    }

    return [...matches, ...nonMatches];
}

export function getVisibleSkills(skills: string[] = [], budget = 30) {
    const visible: string[] = [];
    let currentLen = 0;
    for (const s of skills) {
        const est = s.length + 3;
        if (currentLen + est > budget && visible.length > 0) break;
        visible.push(s);
        currentLen += est;
    }
    return { visible, remainingCount: skills.length - visible.length };
}

export function getPostedLabel(job: Opportunity): string | null {
    const postedAt = job.postedAt ? new Date(job.postedAt) : null;
    if (!postedAt || Number.isNaN(postedAt.getTime())) return null;
    const days = Math.max(0, Math.floor((Date.now() - postedAt.getTime()) / (24 * 60 * 60 * 1000)));
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
}

export function isFreshlyPosted(job: Opportunity): boolean {
    const postedAt = job.postedAt ? new Date(job.postedAt) : null;
    if (!postedAt || Number.isNaN(postedAt.getTime())) return false;
    const days = Math.max(0, Math.floor((Date.now() - postedAt.getTime()) / (24 * 60 * 60 * 1000)));
    return days <= 1;
}

export function isJobExpired(job: Opportunity): boolean {
    if (!job.expiresAt) return false;
    return new Date(job.expiresAt) < new Date();
}

export function daysToExpiry(job: Opportunity): number | null {
    if (!job.expiresAt) return null;
    return Math.ceil((new Date(job.expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

export function getExpiryLabel(job: Opportunity, isGovernment: boolean): string | null {
    if (!job.expiresAt) return null;
    if (isJobExpired(job)) return isGovernment ? 'Closed' : 'Expired';
    const days = daysToExpiry(job);
    if (days === null) return null;
    if (days <= 0) return 'Closing today';
    if (days === 1) return '1 day left';
    if (days <= 3) return `${days} days left`;
    if (isGovernment) {
        const dateStr = new Date(job.expiresAt).toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        });
        return `Apply by ${dateStr}`;
    }
    return `Closes in ${days} days`;
}

export function getEligibilityLine(job: Opportunity): string | null {
    const passoutYears = resolvePassoutYears(job);
    const formattedBatch = formatPassoutYears(passoutYears);
    const formattedEdu = formatEducationEligibility(job);

    const parts: string[] = [];
    if (formattedBatch) parts.push(`Batch ${formattedBatch}`);
    if (formattedEdu) parts.push(formattedEdu);

    if (parts.length === 0) return null;
    return parts.join(' · ');
}

export function getSalaryLabel(job: Opportunity, isGovernment: boolean, isDrive: boolean): string | null {
    const govtMeta = job.governmentJobDetails as { payScale?: string } | undefined;
    const payScale = govtMeta?.payScale;

    if (isGovernment && payScale) return payScale;
    if (isDrive) {
        const driveMeta = getDriveMetadata(job);
        return normalizeSalaryInput(driveMeta.maxCtcLabel) ?? null;
    }
    return getOpportunityDisplaySalary(job);
}

export function getJobTypeLabel(job: Opportunity, isDrive: boolean, isGovernment: boolean): string {
    if (isDrive) return 'Drive';
    if (isGovernment) return (job as { governmentJobDetails?: { jobCategory?: string[] } }).governmentJobDetails?.jobCategory?.[0] || 'Govt';
    if (job.type === 'INTERNSHIP' || job.employmentType === 'INTERNSHIP') return 'Intern';
    if (job.type === 'WALKIN') return 'Walk-in';
    return 'Job';
}

export function getAccentBorderClass(job: Opportunity, isDrive: boolean, isGovernment: boolean, isWalkin: boolean): string {
    if (isWalkin || isDrive) return 'border-l-amber-500';
    if (isGovernment) return 'border-l-slate-500';
    if (job.type === 'INTERNSHIP' || job.employmentType === 'INTERNSHIP') return 'border-l-violet-500';
    return 'border-l-primary';
}
