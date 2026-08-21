'use client';

import { useState } from 'react';
import Link from 'next/link';
import ArrowLeftIcon from '@heroicons/react/24/outline/ArrowLeftIcon';

export default function DeadlinesPage() {
    const [selectedMonth, setSelectedMonth] = useState('August 2026');
    const [selectedType, setSelectedType] = useState('All');
    const [selectedBatch, setSelectedBatch] = useState('All');

    return (
        <div className="w-full max-w-4xl mx-auto px-4 py-8 space-y-8">
            <div className="flex flex-col gap-2">
                <Link
                    href="/"
                    className="flex items-center gap-2 text-xs font-bold capitalize tracking-widest text-muted-foreground hover:text-primary w-fit"
                >
                    <ArrowLeftIcon className="w-3.5 h-3.5" />
                    Back to Home
                </Link>
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                        Hiring Calendar — When Companies Recruit
                    </h1>
                    <p className="text-sm text-muted-foreground mt-2">
                        Track upcoming application windows and deadlines for major campus and off-campus drives.
                    </p>
                </div>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-4 border-b border-border pb-6">
                <select 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="border border-border rounded-lg px-3 py-1.5 text-sm bg-card text-foreground"
                >
                    <option value="August 2026">August 2026</option>
                    <option value="September 2026">September 2026</option>
                    <option value="October 2026">October 2026</option>
                </select>
                
                <select 
                    value={selectedType} 
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="border border-border rounded-lg px-3 py-1.5 text-sm bg-card text-foreground"
                >
                    <option value="All">All Company Types</option>
                    <option value="Product">Product</option>
                    <option value="Service">Service</option>
                    <option value="Startup">Startup</option>
                    <option value="MNC">MNC</option>
                </select>
                
                <select 
                    value={selectedBatch} 
                    onChange={(e) => setSelectedBatch(e.target.value)}
                    className="border border-border rounded-lg px-3 py-1.5 text-sm bg-card text-foreground"
                >
                    <option value="All">All Batches</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                    <option value="2027">2027</option>
                </select>
            </div>

            {/* Timeline View */}
            <div className="space-y-10">
                {/* August 2026 */}
                <section className="space-y-4">
                    <h2 className="text-xl font-bold border-l-4 border-primary pl-3">August 2026</h2>
                    <div className="space-y-3 pl-4 border-l border-border ml-1">
                        <div className="border border-border bg-card rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <p className="font-semibold text-foreground">TCS NQT — Campus Drive</p>
                                <p className="text-sm text-muted-foreground mt-1">Service · Eligible: 2025, 2026</p>
                            </div>
                            <div className="text-left md:text-right">
                                <p className="text-sm font-medium text-amber-600">Closes Aug 31</p>
                                <a href="#" className="text-xs text-primary font-medium hover:underline mt-1 inline-block">Apply →</a>
                            </div>
                        </div>

                        <div className="border border-border bg-card rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <p className="font-semibold text-foreground">Infosys Instep Internship</p>
                                <p className="text-sm text-muted-foreground mt-1">MNC · Eligible: 2026, 2027</p>
                            </div>
                            <div className="text-left md:text-right">
                                <p className="text-sm font-medium text-amber-600">Closes Sep 5</p>
                                <a href="#" className="text-xs text-primary font-medium hover:underline mt-1 inline-block">Apply →</a>
                            </div>
                        </div>

                        <div className="border border-border bg-card rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <p className="font-semibold text-foreground">Wipro WILP</p>
                                <p className="text-sm text-muted-foreground mt-1">Service · Eligible: 2025</p>
                            </div>
                            <div className="text-left md:text-right">
                                <p className="text-sm font-medium text-muted-foreground">Rolling applications</p>
                                <a href="#" className="text-xs text-primary font-medium hover:underline mt-1 inline-block">Apply →</a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* September 2026 */}
                <section className="space-y-4">
                    <h2 className="text-xl font-bold border-l-4 border-primary pl-3">September 2026</h2>
                    <div className="space-y-3 pl-4 border-l border-border ml-1">
                        <div className="border border-border bg-card rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <p className="font-semibold text-foreground">Amazon SDE New Grad</p>
                                <p className="text-sm text-muted-foreground mt-1">Product · Eligible: 2026</p>
                            </div>
                            <div className="text-left md:text-right">
                                <p className="text-sm font-medium text-emerald-600">Campus season starts</p>
                                <a href="#" className="text-xs text-primary font-medium hover:underline mt-1 inline-block">View Details →</a>
                            </div>
                        </div>

                        <div className="border border-border bg-card rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <p className="font-semibold text-foreground">Google STEP Intern</p>
                                <p className="text-sm text-muted-foreground mt-1">Product · Eligible: 2027</p>
                            </div>
                            <div className="text-left md:text-right">
                                <p className="text-sm font-medium text-emerald-600">Applications open</p>
                                <a href="#" className="text-xs text-primary font-medium hover:underline mt-1 inline-block">View Details →</a>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
