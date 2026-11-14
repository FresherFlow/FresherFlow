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
import { getAtsName } from '@/features/jobs/hooks/useOpportunitiesFeed';
import { formatDistance, getDriveDetails, getTransitWalkTimeLabel, getWalkingTimeLabel, parseTransitInfo } from '@/features/jobs/utils/walkinMapUtils';
import {
    daysToExpiry,
    formatEducationEligibility,
    formatPassoutYears,
    getExpiryLabel,
    getSalaryLabel,
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

/**
 * A raw, possibly-scraped work mode turned into a meta-strip label.
 *
 * Distinct from `formatWorkMode` in `features/profile/preferences`, which maps
 * the *stored enum* (`ONSITE`/`ON_SITE`/`HYBRID`/`REMOTE`). This one normalises
 * the free-text variants a source page can carry ('in office', 'in-office').
 * The label vocabulary must still match that map, hence 'On-site' rather than
 * 'Onsite' — the split-view row renders the same job's mode.
 */
export function getWorkModeMetaLabel(mode: string | null): string | null {
    if (!mode) return null;
    const normalized = mode.toLowerCase().replace(/_/g, ' ');
    if (normalized === 'in office' || normalized === 'onsite' || normalized === 'in-office') return 'On-site';
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
    const workMode = getWorkModeMetaLabel((job.workMode as string) || (job as { mode?: string }).mode || null);
    const salary = getSalaryLabel(job, isGovernment, isDrive);
    const expiry = getExpiryLabel(job, isGovernment);
    const ats = getAtsName(job.applyLink || (job as { sourceLink?: string }).sourceLink);
    // `vacancyCount` is the field on `GovernmentJobDetails`; `totalVacancies`
    // only ever appears on legacy payloads. Reading the legacy key alone meant
    // the vacancies badge never rendered for current listings.
    const govtMeta = job.governmentJobDetails as
        | { vacancyCount?: number; totalVacancies?: number; applicationStatus?: string }
        | undefined;
    const vacancyCount = govtMeta?.vacancyCount ?? govtMeta?.totalVacancies;

    if (isWalkin || isDrive) {
        const driveDetails = getDriveDetails(job);
        if (driveDetails?.dateRange) {
            items.push({
                key: 'walkin-date',
                icon: CalendarDaysIcon,
                value: driveDetails.dateRange,
                urgent: true,
            });
        }

        const distKm = (job as { distanceKm?: number }).distanceKm;
        if (typeof distKm === 'number') {
            // A walking estimate only makes sense for a walk-in you could walk
            // to. At 1,284 km it produced "~285h 20m walk".
            const walkTime =
                getTransitWalkTimeLabel(driveDetails?.transitInfo) ||
                (distKm <= 3 ? getWalkingTimeLabel(distKm) : null);
            items.push({
                key: 'distance',
                icon: MapPinIcon,
                value: walkTime ? `${formatDistance(distKm)} · ${walkTime}` : formatDistance(distKm),
            });
        } else if (driveDetails?.timeRange || driveDetails?.reportingTime) {
            items.push({
                key: 'walkin-time',
                icon: ClockIcon,
                value: driveDetails.timeRange || driveDetails.reportingTime || '',
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

        if (driveDetails?.venueAddress) {
            const venue = driveDetails.venueAddress;
            items.push({
                key: 'venue',
                icon: MapPinIcon,
                // The badge truncates with CSS and carries the full value in
                // its `title`; slicing here threw the rest away.
                value: venue,
            });
        }
    } else if (isGovernment) {
        if (vacancyCount) {
            items.push({
                key: 'vacancies',
                icon: UsersIcon,
                value: `${Number(vacancyCount).toLocaleString('en-IN')} posts`,
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
        }
        // No posted-label fallback: the card already prints it next to the
        // bookmark button, and repeating it in the strip showed "2 days ago"
        // twice on the same row.
    }

    return items.slice(0, MAX_META_ITEMS);
}
