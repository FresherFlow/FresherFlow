import Link from 'next/link';

export function GovtLandingPage({ liveCount }: { liveCount: number }) {
    const countLabel = liveCount > 0 ? `${liveCount}+` : 'Daily';
    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#080b12] flex flex-col selection:bg-blue-600/20">
            <div className="absolute top-0 left-0 right-0 h-20 z-10" />

            <main className="flex-1 flex flex-col">
                {/* Hero */}
                <section className="relative pt-12 pb-16 md:pt-20 md:pb-20 px-6 overflow-hidden">
                    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center relative z-10">
                        <div className="space-y-6">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/20 backdrop-blur">
                                <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                                <span className="text-[11px] font-semibold capitalize tracking-widest text-blue-700 dark:text-blue-300">Official Notices Only</span>
                            </div>
                            <h1 className="text-4xl md:text-6xl font-serif font-bold tracking-tight leading-tight text-slate-900 dark:text-slate-50">
                                The trusted portal for government jobs.
                            </h1>
                            <p className="text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-2xl">
                                Stay updated with official notices for SSC, UPSC, Banking, Defence, and State PSC notifications. Direct links, clean information.
                            </p>
                            <div className="flex flex-wrap items-center gap-3">
                                <Link href="/jobs" className="bg-blue-700 hover:bg-blue-800 text-white px-6 py-3 rounded-xl text-[13px] font-semibold transition-all">
                                    View Latest Notifications
                                </Link>
                                <Link href="/jobs?sector=central" className="bg-transparent border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-6 py-3 rounded-xl text-[13px] font-semibold transition-all">
                                    Central Govt
                                </Link>
                            </div>
                            <div className="grid grid-cols-3 gap-4 pt-4">
                                {[
                                    { label: 'Official Links', value: '100%' },
                                    { label: 'Active Jobs', value: countLabel },
                                    { label: 'Ad-free', value: 'Zero spam' },
                                ].map((stat) => (
                                    <div key={stat.label} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-4">
                                        <div className="text-lg font-bold text-slate-900 dark:text-slate-50">{stat.value}</div>
                                        <div className="text-[10px] capitalize tracking-widest text-slate-500">{stat.label}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
                            <div className="bg-slate-100 dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                <span className="text-[11px] font-semibold capitalize tracking-widest text-slate-500">Closing Soon</span>
                                <span className="text-[10px] font-semibold capitalize tracking-widest text-red-600">Urgent</span>
                            </div>
                            <div className="p-4 space-y-3">
                                {[
                                    { org: 'Staff Selection Commission (SSC)', role: 'CGL Examination 2026', vacancies: '7,500+', deadline: 'Official notice' },
                                    { org: 'Railway Recruitment Board', role: 'Assistant Loco Pilot', vacancies: '18,799', deadline: 'Apply window' },
                                    { org: 'State Bank of India', role: 'Probationary Officer (PO)', vacancies: '2,000', deadline: 'Latest update' }
                                ].map((item, i) => (
                                    <div key={i} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4">
                                        <div className="flex justify-between items-start gap-2">
                                            <div>
                                                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{item.role}</h3>
                                                <p className="text-[12px] text-slate-600 dark:text-slate-400 mt-0.5">{item.org}</p>
                                            </div>
                                            <span className="text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded border border-red-100 dark:border-red-900 whitespace-nowrap">
                                                {item.deadline}
                                            </span>
                                        </div>
                                        <div className="mt-3 text-[11px] font-medium text-slate-500 capitalize tracking-widest">
                                            {item.vacancies} Vacancies
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="py-12 md:py-20 px-6 bg-white dark:bg-[#0c0f18] border-t border-slate-200 dark:border-slate-800">
                    <div className="max-w-6xl mx-auto">
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 mb-8">Browse by Category</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { name: 'Central Govt', count: '142 Active' },
                                { name: 'State Govt', count: '89 Active' },
                                { name: 'Banking', count: '24 Active' },
                                { name: 'Railways', count: '18 Active' },
                                { name: 'Defence', count: '7 Active' },
                                { name: 'UPSC / PSC', count: '31 Active' },
                                { name: 'PSU', count: '45 Active' },
                                { name: 'Teaching', count: '56 Active' },
                            ].map((cat) => (
                                <Link href={`/jobs?category=${cat.name.toLowerCase()}`} key={cat.name} className="group p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:border-blue-500 transition-all text-center">
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{cat.name}</h3>
                                    <p className="text-[11px] text-slate-500 mt-1">{cat.count}</p>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}
