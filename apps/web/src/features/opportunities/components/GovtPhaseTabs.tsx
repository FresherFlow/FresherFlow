'use client';

import { cn } from '@repo/ui/utils/cn';
import CheckCircleIcon from '@heroicons/react/24/solid/CheckCircleIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import IdentificationIcon from '@heroicons/react/24/outline/IdentificationIcon';
import KeyIcon from '@heroicons/react/24/outline/KeyIcon';
import TrophyIcon from '@heroicons/react/24/outline/TrophyIcon';
import BuildingLibraryIcon from '@heroicons/react/24/outline/BuildingLibraryIcon';
import TrainIcon from '@heroicons/react/24/outline/BuildingStorefrontIcon';
import BanknotesIcon from '@heroicons/react/24/outline/BanknotesIcon';
import AcademicCapIcon from '@heroicons/react/24/outline/AcademicCapIcon';
import ShieldCheckIcon from '@heroicons/react/24/outline/ShieldCheckIcon';
import UserGroupIcon from '@heroicons/react/24/outline/UserGroupIcon';
import WrenchScrewdriverIcon from '@heroicons/react/24/outline/WrenchScrewdriverIcon';
import HeartIcon from '@heroicons/react/24/outline/HeartIcon';
import BuildingOffice2Icon from '@heroicons/react/24/outline/BuildingOffice2Icon';
import type { ComponentType, SVGProps } from 'react';

// ─── Phase Definitions ────────────────────────────────────────────────────────

export type GovtPhaseFilter =
    | 'ALL'
    | 'APPLY_NOW'
    | 'ADMIT_CARD'
    | 'ANSWER_KEY'
    | 'RESULT'
    | 'UPCOMING';

export const GOVT_PHASE_STATUSES: Record<GovtPhaseFilter, string[]> = {
    ALL:         [],
    UPCOMING:    ['UPCOMING'],
    APPLY_NOW:   ['OPEN'],
    ADMIT_CARD:  ['ADMIT_CARD_RELEASED', 'EXAM_SCHEDULED'],
    ANSWER_KEY:  ['ANSWER_KEY_RELEASED'],
    RESULT:      ['RESULT_DECLARED', 'COUNSELLING', 'DOCUMENT_VERIFICATION'],
};

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const PHASE_TABS: { key: GovtPhaseFilter; label: string; Icon: IconComponent }[] = [
    { key: 'ALL',        label: 'All',          Icon: BuildingLibraryIcon },
    { key: 'APPLY_NOW',  label: 'Apply Now',    Icon: CheckCircleIcon },
    { key: 'UPCOMING',   label: 'Upcoming',     Icon: ClockIcon },
    { key: 'ADMIT_CARD', label: 'Admit Card',   Icon: IdentificationIcon },
    { key: 'ANSWER_KEY', label: 'Answer Key',   Icon: KeyIcon },
    { key: 'RESULT',     label: 'Result',       Icon: TrophyIcon },
];

interface GovtPhaseTabsProps {
    active: GovtPhaseFilter;
    onChange: (phase: GovtPhaseFilter) => void;
    counts?: Partial<Record<GovtPhaseFilter, number>>;
}

export function GovtPhaseTabs({ active, onChange, counts }: GovtPhaseTabsProps) {
    return (
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5 -mx-1 px-1">
            {PHASE_TABS.map(({ key, label, Icon }) => {
                const isActive = active === key;
                const count = counts?.[key];
                return (
                    <button
                        key={key}
                        onClick={() => onChange(key)}
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-all duration-150 shrink-0',
                            isActive
                                ? 'bg-foreground text-background border-foreground shadow-sm'
                                : 'bg-card text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground'
                        )}
                    >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span>{label}</span>
                        {count !== undefined && count > 0 && (
                            <span className={cn(
                                'text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                                isActive ? 'bg-background/20 text-background' : 'bg-muted text-muted-foreground'
                            )}>
                                {count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

// ─── Category Filter ──────────────────────────────────────────────────────────

export type GovtCategoryFilter = string | null; // null = All

export const GOVT_CATEGORIES: { label: string; Icon: IconComponent; match: string[] }[] = [
    { label: 'SSC',         Icon: BuildingLibraryIcon,  match: ['SSC', 'Staff Selection'] },
    { label: 'Railways',    Icon: TrainIcon,             match: ['Railway', 'Railways', 'RRB', 'Rail'] },
    { label: 'Banking',     Icon: BanknotesIcon,         match: ['Banking', 'Bank', 'IBPS', 'RBI', 'SBI'] },
    { label: 'Teaching',    Icon: AcademicCapIcon,       match: ['Teaching', 'Teacher', 'Education', 'UGC', 'NET'] },
    { label: 'Defence',     Icon: ShieldCheckIcon,       match: ['Defence', 'Defense', 'Army', 'Navy', 'Air Force', 'AFCAT', 'NDA', 'CDS', 'CRPF', 'BSF', 'CISF'] },
    { label: 'Police',      Icon: UserGroupIcon,         match: ['Police', 'Constable'] },
    { label: 'UPSC',        Icon: BuildingOffice2Icon,   match: ['UPSC', 'IAS', 'IPS', 'Civil Services'] },
    { label: 'State PSC',   Icon: BuildingOffice2Icon,   match: ['PSC', 'State Public Service', 'BPSC', 'MPSC', 'RPSC', 'UPPSC', 'MPPSC', 'HPSC', 'KPSC'] },
    { label: 'Engineering', Icon: WrenchScrewdriverIcon, match: ['Engineering', 'Engineer', 'JE', 'Technical', 'JTO'] },
    { label: 'Nursing',     Icon: HeartIcon,             match: ['Nursing', 'Nurse', 'ANM', 'GNM', 'Medical', 'Health'] },
];

export function jobMatchesCategory(govtDetails: any, categoryLabel: string): boolean {
    const cat = GOVT_CATEGORIES.find(c => c.label === categoryLabel);
    if (!cat) return false;
    const categories: string[] = govtDetails?.jobCategory || [];
    const title: string = govtDetails?.recruitingBody || '';
    const haystack = [...categories, title].join(' ').toLowerCase();
    return cat.match.some(m => haystack.includes(m.toLowerCase()));
}

interface GovtCategoryFilterProps {
    active: GovtCategoryFilter;
    onChange: (cat: GovtCategoryFilter) => void;
    counts?: Record<string, number>;
}

export function GovtCategoryFilter({ active, onChange, counts }: GovtCategoryFilterProps) {
    return (
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-0.5 -mx-1 px-1">
            <button
                onClick={() => onChange(null)}
                className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all duration-150 shrink-0',
                    active === null
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-card text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground'
                )}
            >
                <BuildingLibraryIcon className="w-3.5 h-3.5 shrink-0" />
                All
            </button>
            {GOVT_CATEGORIES.map(({ label, Icon: CatIcon }) => {
                const isActive = active === label;
                const count = counts?.[label];
                return (
                    <button
                        key={label}
                        onClick={() => onChange(isActive ? null : label)}
                        className={cn(
                            'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all duration-150 shrink-0',
                            isActive
                                ? 'bg-foreground text-background border-foreground'
                                : 'bg-card text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground'
                        )}
                    >
                        <CatIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>{label}</span>
                        {count !== undefined && count > 0 && (
                            <span className={cn(
                                'text-[9px] font-bold px-1.5 py-0.5 rounded-full',
                                isActive ? 'bg-background/20 text-background' : 'bg-muted text-muted-foreground'
                            )}>
                                {count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
