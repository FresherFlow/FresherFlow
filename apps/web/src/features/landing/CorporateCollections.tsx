import Link from 'next/link';
import BriefcaseIcon from '@heroicons/react/24/outline/BriefcaseIcon';
import AcademicCapIcon from '@heroicons/react/24/outline/AcademicCapIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import CodeBracketIcon from '@heroicons/react/24/outline/CodeBracketIcon';
import CommandLineIcon from '@heroicons/react/24/outline/CommandLineIcon';
import CircleStackIcon from '@heroicons/react/24/outline/CircleStackIcon';
import ComputerDesktopIcon from '@heroicons/react/24/outline/ComputerDesktopIcon';
import ChevronRightIcon from '@heroicons/react/24/outline/ChevronRightIcon';
import { cn } from '@repo/ui/utils/cn';

const COLLECTIONS = [
    { 
        title: 'Verified Off-Campus Jobs', 
        desc: 'Full-time graduate engineer programs and entry roles with clear package visibility.', 
        href: '/jobs',
        icon: BriefcaseIcon,
        color: 'text-primary',
        bg: 'bg-primary/10',
        actionText: 'Explore Jobs'
    },
    { 
        title: 'Early Career Internships', 
        desc: 'Paid off-cycle, summer, and winter internships with direct team matching.', 
        href: '/internships',
        icon: AcademicCapIcon,
        color: 'text-sky-500',
        bg: 'bg-sky-500/10',
        actionText: 'Explore Internships'
    },
    { 
        title: 'Walk-In Recruitment Drives', 
        desc: 'Direct on-site interview schedules with verified physical venues and contact coordinates.', 
        href: '/walk-ins',
        icon: MapPinIcon,
        color: 'text-emerald-500',
        bg: 'bg-emerald-500/10',
        actionText: 'Explore Walk-Ins'
    },
];

const JOB_CATEGORIES = [
    { name: 'Java Development', query: 'Java', icon: CodeBracketIcon, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { name: 'Python', query: 'Python', icon: CommandLineIcon, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { name: 'SQL Development', query: 'SQL', icon: CircleStackIcon, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { name: 'Frontend Development', query: 'Frontend', icon: ComputerDesktopIcon, color: 'text-pink-500', bg: 'bg-pink-500/10' },
];

export function CorporateCollections() {
    return (
        <section className="py-12 md:py-16 px-6 border-t border-border/40 bg-muted/5 relative overflow-hidden">
            <div className="max-w-6xl mx-auto space-y-16">
                {/* Part 1: Corporate Collections */}
                <div className="space-y-10">
                    <div className="text-center space-y-3 max-w-2xl mx-auto">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold tracking-widest uppercase border border-primary/20">
                            Private Sector
                        </span>
                        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight leading-tight">
                            Corporate Jobs &amp; Internships
                        </h2>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            Verified opportunities grouped cleanly by career path to save you time.
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {COLLECTIONS.map((item) => (
                            <Link 
                                key={item.title} 
                                href={item.href} 
                                className="group bg-card/60 backdrop-blur border border-border/80 rounded-2xl p-6 md:p-8 hover:border-primary/45 hover:shadow-lg transition-all duration-300 flex flex-col justify-between h-full"
                            >
                                <div className="space-y-4 relative z-10">
                                    <div className="flex items-center gap-4">
                                        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-border/50 group-hover:scale-105 transition-transform duration-300', item.bg)}>
                                            <item.icon className={cn('w-6 h-6', item.color)} />
                                        </div>
                                        <h3 className="text-base md:text-lg font-bold text-foreground group-hover:text-primary transition-colors tracking-tight leading-snug">
                                            {item.title}
                                        </h3>
                                    </div>
                                    <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                                        {item.desc}
                                    </p>
                                </div>

                                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary mt-6 group-hover:translate-x-0.5 transition-transform relative z-10">
                                    {item.actionText}
                                    <ChevronRightIcon className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Divider Line */}
                <div className="border-t border-border/40 w-full" />

                {/* Part 2: Roles & Skills */}
                <div className="space-y-10">
                    <div className="text-center space-y-3 max-w-2xl mx-auto">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px] font-bold tracking-widest uppercase border border-orange-500/20">
                            Custom Tech Stack
                        </span>
                        <h2 className="text-3xl font-extrabold tracking-tight leading-tight">
                            Explore by Roles &amp; Skills
                        </h2>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                            Find verified jobs and internships matching your tech stack.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                        {JOB_CATEGORIES.map((cat) => (
                            <Link
                                key={cat.name}
                                href={`/opportunities?query=${encodeURIComponent(cat.query)}`}
                                className="group relative overflow-hidden bg-card/65 backdrop-blur border border-border/60 hover:border-primary/45 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 rounded-xl p-4 transition-all duration-200 flex items-center gap-4"
                            >
                                <div className="absolute -inset-px bg-gradient-to-br from-primary/5 via-transparent to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                                
                                <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center shrink-0 border border-border/50 group-hover:scale-105 transition-transform duration-200 relative z-10', cat.bg)}>
                                    <cat.icon className={cn('w-6 h-6', cat.color)} />
                                </div>
                                <div className="flex-1 relative z-10">
                                    <h3 className="font-bold text-foreground group-hover:text-primary transition-colors text-sm">
                                        {cat.name}
                                    </h3>
                                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mt-0.5">
                                        View Feed
                                    </p>
                                </div>
                                <ChevronRightIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-0.5 transition-transform shrink-0 relative z-10" />
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
