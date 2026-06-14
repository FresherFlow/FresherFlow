import Link from 'next/link';
import TrophyIcon from '@heroicons/react/24/outline/TrophyIcon';
import AcademicCapIcon from '@heroicons/react/24/outline/AcademicCapIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import CpuChipIcon from '@heroicons/react/24/outline/CpuChipIcon';
import BuildingLibraryIcon from '@heroicons/react/24/outline/BuildingLibraryIcon';
import ChevronRightIcon from '@heroicons/react/24/outline/ChevronRightIcon';
import { cn } from '@repo/ui/utils/cn';

const EXAM_CATEGORIES = [
    { title: 'Banking & Insurance', icon: BuildingLibraryIcon, href: '/government-jobs?category=Banking', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'SSC & Railway Exams', icon: TrophyIcon, href: '/government-jobs?category=SSC', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: 'Teaching & UGC', icon: AcademicCapIcon, href: '/government-jobs?category=Teaching', color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { title: 'State Level Exams', icon: MapPinIcon, href: '/government-jobs?category=State', color: 'text-violet-500', bg: 'bg-violet-500/10' },
    { title: 'Engineering & ITI', icon: CpuChipIcon, href: '/government-jobs?category=Engineering', color: 'text-rose-500', bg: 'bg-rose-500/10' },
];

export function ExamCategories() {
    return (
        <section className="py-10 md:py-14 px-6 border-t border-border/40 bg-muted/5">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="text-center space-y-2 max-w-2xl mx-auto">
                    <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                        Explore by Exams
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Find verified notifications and updates for top Government exams in India.
                    </p>
                </div>
                <div className="flex flex-wrap justify-center gap-4">
                    {EXAM_CATEGORIES.map((cat) => (
                        <Link key={cat.title} href={cat.href} className="flex items-center gap-3 bg-card border border-border/80 hover:border-primary/40 hover:-translate-y-0.5 shadow-sm rounded-xl p-4 w-full sm:w-[280px] transition-all group">
                            <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center shrink-0', cat.bg)}>
                                <cat.icon className={cn('w-6 h-6', cat.color)} />
                            </div>
                            <div className="flex-1 font-bold text-foreground group-hover:text-primary transition-colors text-sm">
                                {cat.title}
                            </div>
                            <ChevronRightIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
