'use client';
import Link from 'next/link';
import type { Opportunity } from '@fresherflow/types';
import ArrowRightIcon from '@heroicons/react/24/outline/ArrowRightIcon';
import JobCard from '@/features/opportunities/components/JobCard';
import { motion } from 'framer-motion';

interface RecentOpportunitiesProps {
    opportunities: Opportunity[];
}

export function RecentOpportunities({ opportunities }: RecentOpportunitiesProps) {
    const recent = opportunities
        .filter((opportunity) => !opportunity.governmentJobDetails && String(opportunity.type) !== 'GOVERNMENT')
        .slice(0, 4);

    if (recent.length === 0) return null;

    return (
        <section className="py-10 md:py-14 px-6 border-t border-border/40">
            <div className="max-w-6xl mx-auto space-y-7">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-2 max-w-2xl">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                            Recent Opportunities
                        </span>
                        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                            Latest verified openings
                        </h2>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            Fresh listings from the live feed, trimmed for quick scanning before you open the full board.
                        </p>
                    </div>
                    <Link
                        href="/jobs"
                        className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-primary hover:opacity-80 transition-opacity"
                    >
                        View All
                        <ArrowRightIcon className="w-4 h-4" />
                    </Link>
                </div>

                <motion.div 
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-50px" }}
                    variants={{
                        hidden: { opacity: 0 },
                        visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
                    }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-3.5"
                >
                    {recent.map((opportunity) => (
                        <motion.div 
                            key={opportunity.id} 
                            variants={{
                                hidden: { opacity: 0, y: 16 },
                                visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
                            }}
                        >
                            <JobCard
                                job={opportunity}
                                jobId={opportunity.id}
                                variant="compact"
                            />
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
