import type { Metadata } from 'next';
import Link from 'next/link';
import { Breadcrumb } from '@/ui/Breadcrumb';
import { Card, CardContent } from '@/ui/Card';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { SITE_URL } from '@/lib/utils/runtimeConfig';
import { AcademicCapIcon, CodeBracketIcon, ShieldCheckIcon, CpuChipIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

export const metadata: Metadata = {
    title: 'Career Preparation & Technical Interview Resources',
    description: 'Free interview preparation guides, technical skill tracks, coding practice resources, and aptitude preparation tailored for freshers.',
    alternates: { canonical: `${SITE_URL}/resources` },
};

const RESOURCES = [
    {
        category: 'Technical Interview Prep',
        icon: CodeBracketIcon,
        description: 'Core concepts, data structures, algorithms, and coding patterns commonly asked in fresher technical rounds.',
        items: [
            { title: 'Top 50 Data Structures & Algorithms Questions', tag: 'Coding', level: 'Beginner to Intermediate' },
            { title: 'System Design Basics for Entry-Level Engineers', tag: 'Architecture', level: 'Intermediate' },
            { title: 'Essential SQL & Database Querying Handbook', tag: 'Databases', level: 'Beginner' },
            { title: 'Modern Frontend & JavaScript Fundamentals', tag: 'Web Dev', level: 'Beginner' },
        ],
    },
    {
        category: 'Aptitude & Reasoning',
        icon: CpuChipIcon,
        description: 'Quantitative aptitude, logical reasoning, and verbal skills needed for online assessment (OA) clearing.',
        items: [
            { title: 'Quantitative Aptitude Cheat Sheet & Formulas', tag: 'Math', level: 'All Levels' },
            { title: 'Logical Reasoning & Pattern Solving Guide', tag: 'Logic', level: 'All Levels' },
            { title: 'Speed Calculation & Mental Math Shortcuts', tag: 'Practice', level: 'Beginner' },
        ],
    },
    {
        category: 'Company-Specific Guides',
        icon: AcademicCapIcon,
        description: 'Interview experiences, test patterns, and interview questions asked at top tech and product companies.',
        items: [
            { title: 'Tier 1 Product Companies Interview Strategy', tag: 'Guide', level: 'Advanced' },
            { title: 'Off-Campus Drive & Hiring Test Formats', tag: 'Assessment', level: 'All Levels' },
            { title: 'Behavioral & HR Round Common Questions', tag: 'HR Round', level: 'All Levels' },
        ],
    },
];

export default function ResourcesPage() {
    return (
        <div className="min-h-screen bg-background pb-20 font-sans">
            <main className="max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8 space-y-6">
                <Breadcrumb items={[{ label: 'Home', href: '/' }, { label: 'Resources' }]} />

                {/* Header */}
                <div className="pb-4 border-b border-border/40 space-y-1.5">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        Career Preparation & Technical Resources
                    </h1>
                    <p className="text-sm text-muted-foreground max-w-3xl">
                        Boost your confidence with curated interview questions, technical roadmaps, coding practice guides, and aptitude preparation tailored for freshers.
                    </p>
                </div>

                {/* Resource Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {RESOURCES.map((section) => (
                        <Card key={section.category} className="border-border/70 shadow-2xs flex flex-col justify-between">
                            <CardContent className="p-5 space-y-4 flex-1 flex flex-col justify-between">
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">
                                            <section.icon className="w-5 h-5" />
                                        </div>
                                        <h2 className="text-base font-semibold text-foreground tracking-tight">{section.category}</h2>
                                    </div>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {section.description}
                                    </p>
                                    <div className="space-y-2.5 pt-2">
                                        {section.items.map((item) => (
                                            <div
                                                key={item.title}
                                                className="p-3 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/60 transition-colors space-y-2"
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <h3 className="text-sm font-semibold text-foreground leading-snug">{item.title}</h3>
                                                    <Badge variant="outline" className="text-xs font-semibold shrink-0">
                                                        {item.tag}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center justify-between text-xs text-muted-foreground pt-0.5">
                                                    <span>{item.level}</span>
                                                    <span className="text-primary font-medium hover:underline flex items-center gap-1 cursor-pointer">
                                                        Read Guide <ArrowRightIcon className="w-3 h-3" />
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Practice Banner */}
                <Card className="border-border/70 shadow-2xs">
                    <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <ShieldCheckIcon className="w-5 h-5 text-primary" />
                                <h3 className="text-base font-semibold text-foreground">Verified Preparation Standard</h3>
                            </div>
                            <p className="text-sm text-muted-foreground max-w-2xl">
                                All resources on FresherFlow are updated regularly to align with recent off-campus hiring drives and technical interview patterns.
                            </p>
                        </div>
                        <Button asChild className="shrink-0 font-semibold text-xs h-10 px-5">
                            <Link href="/opportunities">
                                Browse Active Opportunities
                                <ArrowRightIcon className="w-4 h-4 ml-1.5" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
