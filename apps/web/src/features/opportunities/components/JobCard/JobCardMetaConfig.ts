import type { ComponentType } from 'react';
import { Opportunity } from '@fresherflow/types';
import CurrencyRupeeIcon from '@heroicons/react/24/outline/CurrencyRupeeIcon';
import HomeIcon from '@heroicons/react/24/outline/HomeIcon';
import BuildingOffice2Icon from '@heroicons/react/24/outline/BuildingOffice2Icon';
import ArrowsRightLeftIcon from '@heroicons/react/24/outline/ArrowsRightLeftIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import CalendarIcon from '@heroicons/react/24/outline/CalendarIcon';
import CalendarDaysIcon from '@heroicons/react/24/outline/CalendarDaysIcon';
import AcademicCapIcon from '@heroicons/react/24/outline/AcademicCapIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import LinkIcon from '@heroicons/react/24/outline/LinkIcon';
import UsersIcon from '@heroicons/react/24/outline/UsersIcon';
import { getAtsName } from '@/features/opportunities/hooks/useOpportunitiesFeed';
import { formatDistance, getTransitWalkTimeLabel, getWalkingTimeLabel, parseTransitInfo } from '@/features/opportunities/utils/walkinMapUtils';
import {
    daysToExpiry,
    formatEducationEligibility,
    formatPassoutYears,
    getExpiryLabel,
    getPostedLabel,
    getSalaryLabel,
    isFreshlyPosted,
    isJobExpired,
    resolvePassoutYears,
} from './jobCardUtils';

export type MetaItem = {
    key: string;
    icon: ComponentType<{ className?: string }>;
    value: string;
    urgent?: boolean;
    fresh?: boolean;
};

const MAX_META_ITEMS = 5;

function formatWorkMode(mode: string | null): string | null {
    if (!mode) return null;
    const normalized = mode.toLowerCase().replace(/_/g, ' ');
    if (normalized === 'in office' || normalized === 'onsite' || normalized === 'in-office') return 'Onsite';
    if (normalized === 'hybrid') return 'Hybrid';
    if (normalized === 'remote') return 'Remote';
    return mode.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function workModeIcon(mode: string | null): ComponentType<{ className?: string }> {
    const normalized = (mode || '').toLowerCase();
    if (normalized === 'remote') return HomeIcon;
    if (normalized === 'hybrid') return ArrowsRightLeftIcon;
    return BuildingOffice2Icon;
}

export function buildMetaItems(
    job: Opportunity,
    opts: {
        isGovernment: boolean;
        isDrive: boolean;
        isWalkin: boolean;
    }
): MetaItem[] {
    const { isGovernment, isDrive, isWalkin } = opts;
    const items: MetaItem[] = [];
    const workMode = formatWorkMode((job.workMode as string) || (job as { mode?: string }).mode || null);
    const salary = getSalaryLabel(job, isGovernment, isDrive);
    const posted = getPostedLabel(job);
    const expiry = getExpiryLabel(job, isGovernment);
    const ats = getAtsName(job.applyLink || (job as { sourceLink?: string }).sourceLink);
    const govtMeta = job.governmentJobDetails as { totalVacancies?: number; applicationStatus?: string } | undefined;

    if (isWalkin || isDrive) {
        if (job.walkInDetails?.dateRange) {
            items.push({
                key: 'walkin-date',
                icon: CalendarDaysIcon,
                value: job.walkInDetails.dateRange,
                urgent: true,
            });
        }

        const distKm = (job as { distanceKm?: number }).distanceKm;
        if (typeof distKm === 'number') {
            const walkTime = getTransitWalkTimeLabel(job.walkInDetails?.transitInfo) || getWalkingTimeLabel(distKm);
            items.push({
                key: 'distance',
                icon: MapPinIcon,
                value: walkTime ? `${formatDistance(distKm)} · ${walkTime}` : formatDistance(distKm),
            });
        } else if (job.walkInDetails?.timeRange || job.walkInDetails?.reportingTime) {
            items.push({
                key: 'walkin-time',
                icon: ClockIcon,
                value: job.walkInDetails.timeRange || job.walkInDetails.reportingTime || '',
            });
        }

        const passoutYears = resolvePassoutYears(job);
        const formattedBatches = formatPassoutYears(passoutYears);
        if (formattedBatches) {
            items.push({ key: 'batch', icon: CalendarIcon, value: formattedBatches });
        }

        const education = formatEducationEligibility(job);
        if (education) {
            items.push({ key: 'education', icon: AcademicCapIcon, value: education });
        }

        if (job.walkInDetails?.venueAddress) {
            const venue = job.walkInDetails.venueAddress;
            items.push({
                key: 'venue',
                icon: MapPinIcon,
                value: venue.length > 36 ? `${venue.slice(0, 36)}…` : venue,
            });
        }
    } else if (isGovernment) {
        if (govtMeta?.totalVacancies) {
            items.push({
                key: 'vacancies',
                icon: UsersIcon,
                value: `${Number(govtMeta.totalVacancies).toLocaleString('en-IN')} posts`,
            });
        }
        if (salary) {
            items.push({ key: 'salary', icon: CurrencyRupeeIcon, value: salary });
        }
        const education = formatEducationEligibility(job);
        if (education) {
            items.push({ key: 'education', icon: AcademicCapIcon, value: education });
        }
        if (expiry) {
            items.push({
                key: 'expiry',
                icon: ClockIcon,
                value: expiry,
                urgent: !isJobExpired(job) && (daysToExpiry(job) ?? 99) <= 3,
            });
        }
        if (govtMeta?.applicationStatus && govtMeta.applicationStatus !== 'OPEN') {
            items.push({
                key: 'govt-status',
                icon: ClockIcon,
                value: govtMeta.applicationStatus.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()),
            });
        }
    } else {
        if (salary) {
            items.push({ key: 'salary', icon: CurrencyRupeeIcon, value: salary });
        }
        if (workMode) {
            items.push({ key: 'mode', icon: workModeIcon((job.workMode as string) || null), value: workMode });
        }

        const passoutYears = resolvePassoutYears(job);
        const formattedBatches = formatPassoutYears(passoutYears);
        if (formattedBatches) {
            items.push({ key: 'batch', icon: CalendarIcon, value: formattedBatches });
        }

        const education = formatEducationEligibility(job);
        if (education) {
            items.push({ key: 'education', icon: AcademicCapIcon, value: education });
        }

        if (ats) {
            const cleanSource = ats.replace(/^direct[-:\s·]*/i, '').trim();
            items.push({ key: 'ats', icon: LinkIcon, value: cleanSource });
        } else if (expiry) {
            items.push({
                key: 'expiry',
                icon: ClockIcon,
                value: expiry,
                urgent: !isJobExpired(job) && (daysToExpiry(job) ?? 99) <= 3,
            });
        } else if (posted) {
            items.push({
                key: 'posted',
                icon: ClockIcon,
                value: posted,
                fresh: isFreshlyPosted(job),
            });
        }
    }

    return items.slice(0, MAX_META_ITEMS);
}
