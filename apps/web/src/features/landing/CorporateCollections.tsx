import Link from 'next/link';

const COLLECTIONS = [
    { title: 'Verified Off-Campus Jobs', desc: 'Full-time graduate engineer programs and entry roles with clear package visibility.', href: '/jobs' },
    { title: 'Early Career Internships', desc: 'Paid off-cycle, summer, and winter internships with direct team matching.', href: '/internships' },
    { title: 'Walk-In Recruitment Drives', desc: 'Direct on-site interview schedules with verified physical venues and contact coordinates.', href: '/walk-ins' },
];

export function CorporateCollections() {
    return (
        <section className="py-10 md:py-14 px-6 border-t border-border/40 bg-muted/10">
            <div className="max-w-6xl mx-auto space-y-10">
                <div className="text-center space-y-3 max-w-2xl mx-auto">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                        Private Sector
                    </span>
                    <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                        Corporate Jobs &amp; Internships
                    </h2>
                    <p className="text-muted-foreground text-sm md:text-base">
                        Verified opportunities grouped cleanly by career path to save you time.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {COLLECTIONS.map((item) => (
                        <Link key={item.title} href={item.href} className="group premium-card p-6 space-y-4 hover:border-primary/30 hover:-translate-y-1 shadow-sm transition-all duration-300 flex flex-col justify-between">
                            <div className="space-y-2">
                                <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">
                                    {item.title}
                                </h3>
                                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                                    {item.desc}
                                </p>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary mt-2">
                                Explore Feed
                                <svg className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
