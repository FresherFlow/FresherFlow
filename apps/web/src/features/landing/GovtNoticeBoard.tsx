import Link from 'next/link';
import type { ComponentType, SVGProps } from 'react';
import IdentificationIcon from '@heroicons/react/24/outline/IdentificationIcon';
import CheckCircleIcon from '@heroicons/react/24/solid/CheckCircleIcon';
import KeyIcon from '@heroicons/react/24/outline/KeyIcon';
import TrophyIcon from '@heroicons/react/24/outline/TrophyIcon';
import ChevronRightIcon from '@heroicons/react/24/outline/ChevronRightIcon';
import { cn } from '@repo/ui/utils/cn';
import type { Opportunity } from '@fresherflow/types';

interface PhaseGroup {
    key: string;
    label: string;
    Icon: ComponentType<SVGProps<SVGSVGElement>>;
    urgency: 'high' | 'medium' | 'normal';
    statuses: string[];
}

const PHASE_GROUPS: PhaseGroup[] = [
    { key: 'APPLY_NOW',  label: 'Latest Govt Jobs',    Icon: CheckCircleIcon,    urgency: 'high',   statuses: ['OPEN'] },
    { key: 'ADMIT_CARD', label: 'Admit Card Out',      Icon: IdentificationIcon, urgency: 'high',   statuses: ['ADMIT_CARD_RELEASED'] },
    { key: 'RESULT',     label: 'Result Declared',     Icon: TrophyIcon,         urgency: 'medium', statuses: ['RESULT_DECLARED'] },
    { key: 'ANSWER_KEY', label: 'Answer Keys',         Icon: KeyIcon,            urgency: 'normal', statuses: ['ANSWER_KEY_RELEASED'] },
];

interface GovtNoticeBoardProps {
    opportunities: Opportunity[];
}

export function GovtNoticeBoard({ opportunities }: GovtNoticeBoardProps) {
    if (opportunities.length === 0) return null;

    return (
        <section className="py-10 md:py-14 px-6 border-t border-border/40">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="space-y-2">
                    <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                        Latest Govt Updates
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Real-time tracking of Admit Cards, Results, and New Job Notifications.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 items-start">
                    {PHASE_GROUPS.map(group => {
                        const groupOpps = opportunities.filter(o => {
                            const s = (o.governmentJobDetails as any)?.applicationStatus;
                            return s && group.statuses.includes(s);
                        });
                        if (groupOpps.length === 0) return null;
                        return (
                            <div key={group.key} className="flex flex-col bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm">
                                <div className={cn(
                                    'px-4 py-3 border-b flex items-center gap-2',
                                    group.urgency === 'high'   ? 'bg-destructive/10 border-destructive/20' :
                                    group.urgency === 'medium' ? 'bg-amber-500/10 border-amber-500/20' :
                                                                 'bg-muted/50 border-border'
                                )}>
                                    <group.Icon className={cn(
                                        'w-5 h-5',
                                        group.urgency === 'high'   ? 'text-destructive' :
                                        group.urgency === 'medium' ? 'text-amber-600' :
                                                                     'text-foreground'
                                    )} />
                                    <h3 className="text-sm font-extrabold uppercase tracking-widest flex-1">
                                        {group.label}
                                    </h3>
                                </div>
                                <div className="flex-1 p-2">
                                    <ul className="space-y-1">
                                        {groupOpps.slice(0, 10).map((opp: any) => {
                                            const isNew = opp.createdAt && (Date.now() - new Date(opp.createdAt).getTime() < 3 * 24 * 60 * 60 * 1000);
                                            return (
                                                <li key={opp.id}>
                                                    <Link
                                                        href={`/${opp.slug}`}
                                                        className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors text-xs font-semibold leading-tight group/link"
                                                    >
                                                        <ChevronRightIcon className="w-3 h-3 mt-0.5 shrink-0 text-muted-foreground group-hover/link:text-primary" />
                                                        <span className="group-hover/link:text-primary transition-colors line-clamp-2">
                                                            {opp.title}
                                                            {isNew && (
                                                                <span className="inline-block ml-2 text-[9px] font-extrabold text-destructive animate-pulse uppercase">
                                                                    New
                                                                </span>
                                                            )}
                                                        </span>
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                                {groupOpps.length > 10 && (
                                    <Link
                                        href="/government"
                                        className="block p-3 text-xs font-bold text-center text-primary bg-primary/5 hover:bg-primary/10 transition-colors border-t border-border/50"
                                    >
                                        View All Updates
                                    </Link>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
