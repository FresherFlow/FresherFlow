'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircleIcon,
    ArrowRightIcon,
    CodeBracketIcon,
    AcademicCapIcon,
    RocketLaunchIcon,
    ShieldCheckIcon,
    BriefcaseIcon,
    MapPinIcon,
    ClockIcon,
} from '@heroicons/react/24/outline';
import { SkillPill } from '@/ui/SkillPill';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

const textRevealVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.05, duration: 0.4 }
    })
};

const titleText = "One Link to Showcase Your Skills, Projects & Academic Journey.".split(" ");

export function UPageClient() {
    const router = useRouter();
    const [username, setUsername] = useState('');

    const handleClaim = (e: React.FormEvent) => {
        e.preventDefault();
        if (username.trim()) {
            router.push(`/join?username=${encodeURIComponent(username.trim())}`);
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20 selection:text-primary">
            {/* 1. HERO SECTION */}
            <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 border-b border-border/60">
                <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/10 blur-[120px] rounded-full pointer-events-none -z-10" />

                <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
                    <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="max-w-3xl mx-auto text-center space-y-6"
                    >
                        <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider shadow-2xs">
                            <RocketLaunchIcon className="w-3.5 h-3.5 shrink-0" />
                            <span>The New Candidate Portfolio Standard</span>
                        </motion.div>

                        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
                            {titleText.map((word, i) => (
                                <motion.span
                                    key={i}
                                    custom={i}
                                    variants={textRevealVariants}
                                    className={`inline-block mr-[0.25em] ${['Skills,', 'Projects'].includes(word) ? 'text-primary underline decoration-primary/30 decoration-wavy underline-offset-8' : ''}`}
                                >
                                    {word}
                                </motion.span>
                            ))}
                        </h1>

                        <motion.p variants={itemVariants} className="text-base sm:text-lg text-muted-foreground leading-relaxed font-normal max-w-2xl mx-auto">
                            Stop sending fragmented links and cluttered PDF resumes. FresherFlow gives you a verified, recruiter-ready public profile with interactive project demos, git documentation, and structured career availability—all at{' '}
                            <code className="px-2 py-0.5 rounded-md bg-muted text-foreground font-mono font-bold text-sm border border-border/60">
                                fresherflow.in/u/yourname
                            </code>.
                        </motion.p>

                        {/* Inline Username Claim Input */}
                        <motion.form variants={itemVariants} onSubmit={handleClaim} className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2 max-w-lg mx-auto">
                            <div className="relative flex-1 w-full">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <span className="text-muted-foreground font-medium text-sm md:text-base">fresherflow.in/u/</span>
                                </div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                    placeholder="yourname"
                                    className="block w-full pl-[135px] md:pl-[145px] pr-4 py-3.5 bg-card/60 backdrop-blur border border-border/80 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 rounded-2xl shadow-sm text-foreground font-bold text-sm md:text-base transition-all duration-200 outline-none placeholder:text-muted-foreground/40 placeholder:font-normal"
                                    maxLength={30}
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full sm:w-auto px-6 py-3.5 bg-primary text-primary-foreground font-bold text-sm md:text-base rounded-2xl shadow-lg hover:opacity-95 active:scale-[0.97] transition-all duration-150 ease-out flex items-center justify-center gap-2 shrink-0 disabled:opacity-70"
                                disabled={!username.trim()}
                            >
                                <span>Claim</span>
                                <ArrowRightIcon className="w-4 h-4 stroke-[2.5]" />
                            </button>
                        </motion.form>

                        <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-center gap-6 pt-3 text-xs font-semibold text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                                <CheckCircleIcon className="w-4 h-4 text-primary shrink-0" />
                                <span>100% Free for Students &amp; Freshers</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <CheckCircleIcon className="w-4 h-4 text-primary shrink-0" />
                                <span>Recruiter-Verified Data Schema</span>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Interactive Glassmorphic Profile Preview Mockup */}
                    <motion.div 
                        initial={{ opacity: 0, y: 40, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: 0.5, duration: 0.6, ease: "easeOut" } }}
                        id="preview" 
                        className="pt-4"
                    >
                        <div className="max-w-5xl mx-auto rounded-3xl border border-border/80 bg-card/60 backdrop-blur-xl shadow-2xl overflow-hidden p-4 sm:p-6 md:p-8 space-y-6">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-extrabold text-xl sm:text-2xl shadow-sm shrink-0">
                                        KS
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-lg sm:text-xl font-extrabold text-foreground tracking-tight">
                                                Krish Sharma
                                            </h3>
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold">
                                                <ShieldCheckIcon className="w-3.5 h-3.5 shrink-0" />
                                                Verified Market Ready
                                            </span>
                                        </div>
                                        <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                                            Full-Stack TypeScript Engineer &amp; AI Product Builder
                                        </p>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-0.5">
                                            <span className="flex items-center gap-1 font-medium">
                                                <MapPinIcon className="w-3.5 h-3.5 text-primary" /> Bengaluru, India
                                            </span>
                                            <span className="flex items-center gap-1 text-primary font-bold">
                                                <ClockIcon className="w-3.5 h-3.5" /> Available Immediately
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <span className="px-3.5 py-2 bg-primary/10 text-primary font-bold text-xs rounded-xl border border-primary/20 inline-flex items-center gap-1.5 shadow-2xs">
                                        <span>fresherflow.in/u/krish-sharma</span>
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                                <div className="md:col-span-8 space-y-4">
                                    <div className="bg-muted/20 border border-border/40 rounded-2xl p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                                <CodeBracketIcon className="w-4 h-4 text-primary" />
                                                Featured Projects (2)
                                            </h4>
                                            <span className="text-xs font-semibold text-primary">Live Demos Wired →</span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="group bg-card border border-border/60 rounded-xl p-4 space-y-2.5 hover:border-border hover:shadow-md transition-all duration-150 ease-out cursor-default">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h5 className="font-bold text-sm text-foreground truncate">
                                                        AI Opportunity Scanner
                                                    </h5>
                                                    <span className="px-2 py-0.5 rounded-md bg-primary text-primary-foreground font-bold text-[10px] shadow-2xs">Live ↗</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                    Real-time fresher job and walk-in opportunity discovery pipeline.
                                                </p>
                                                <div className="flex flex-wrap gap-1 pt-1">
                                                    <SkillPill skill="TypeScript" />
                                                    <SkillPill skill="Next.js" />
                                                    <SkillPill skill="Redis" />
                                                </div>
                                            </div>

                                            <div className="group bg-card border border-border/60 rounded-xl p-4 space-y-2.5 hover:border-border hover:shadow-md transition-all duration-150 ease-out cursor-default">
                                                <div className="flex items-start justify-between gap-2">
                                                    <h5 className="font-bold text-sm text-foreground truncate">
                                                        FresherFlow Mobile App
                                                    </h5>
                                                    <span className="px-2 py-0.5 rounded-md bg-muted text-foreground font-bold text-[10px] border border-border/60">Git Docs ↗</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                    Universal React Native Expo mobile application with MMKV caching.
                                                </p>
                                                <div className="flex flex-wrap gap-1 pt-1">
                                                    <SkillPill skill="Expo" />
                                                    <SkillPill skill="React" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-muted/20 border border-border/40 rounded-2xl p-4 space-y-2.5">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            Verified Technical Skills
                                        </h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {['TypeScript', 'JavaScript', 'Next.js', 'React', 'Node.js', 'PostgreSQL', 'Prisma', 'Redis', 'Tailwind CSS'].map((skill) => (
                                                <SkillPill key={skill} skill={skill} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="md:col-span-4 space-y-4">
                                    <div className="bg-muted/20 border border-border/40 rounded-2xl p-4 space-y-3">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                            <BriefcaseIcon className="w-4 h-4 text-primary" />
                                            Career Preferences
                                        </h4>
                                        <div className="space-y-2 text-xs">
                                            <div className="p-3 rounded-xl bg-card border border-border/60 shadow-2xs">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Target Opportunity Types</p>
                                                <p className="font-bold text-foreground pt-1">Full-Time Job, Walk-In Interview</p>
                                            </div>
                                            <div className="p-3 rounded-xl bg-card border border-border/60 shadow-2xs">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Preferred Work Mode</p>
                                                <p className="font-bold text-foreground pt-1">Onsite, Hybrid, Remote</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-muted/20 border border-border/40 rounded-2xl p-4 space-y-2.5">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                            <AcademicCapIcon className="w-4 h-4 text-primary" />
                                            Academic Journey
                                        </h4>
                                        <div className="space-y-2 text-xs">
                                            <div className="flex items-center justify-between font-semibold">
                                                <span className="text-foreground font-bold">B.Tech in Computer Science</span>
                                                <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold text-[11px] tabular-nums">2026</span>
                                            </div>
                                            <p className="text-muted-foreground text-[11px] font-medium">Visvesvaraya Technological University</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* 2. WHY RECRUITERS PREFER /u/ PROFILES */}
            <section id="features" className="py-16 md:py-24 border-b border-border/60 bg-muted/20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
                    <div className="text-center max-w-2xl mx-auto space-y-3">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-primary">Why Stand Out With FresherFlow</h2>
                        <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">Built For How Modern Engineering Teams Hire.</p>
                        <p className="text-sm sm:text-base text-muted-foreground font-normal">We removed the fluff from traditional resumes and created an interactive workspace profile that highlights your real-world coding ability.</p>
                    </div>
                    <motion.div 
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-50px" }}
                        variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-6"
                    >
                        {[
                            { icon: CodeBracketIcon, title: "Interactive Project Demos", desc: "Don't just list project names. Provide recruiters with 1-click access to your live web apps and direct GitHub repository documentation." },
                            { icon: BriefcaseIcon, title: "Structured Career Preferences", desc: "Let hiring managers instantly see whether you're seeking a Full-Time Job, Internship, or Walk-In Interview." },
                            { icon: AcademicCapIcon, title: "Verified Academic Stepper", desc: "Present your 10th, 12th, Undergraduate, and Postgraduate milestones in a clean, chronological timeline." }
                        ].map((feature, idx) => (
                            <motion.div key={idx} variants={itemVariants} className="group relative overflow-hidden bg-card border border-border/60 rounded-2xl p-6 md:p-8 space-y-4 shadow-xs hover:border-border hover:shadow-lg transition-all duration-200 ease-out">
                                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200 ease-out">
                                    <feature.icon className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-bold text-foreground tracking-tight">{feature.title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* 3. HOW IT WORKS STEPPER */}
            <section id="how-it-works" className="py-16 md:py-24 border-b border-border/60">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-12">
                    <div className="text-center max-w-2xl mx-auto space-y-3">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-primary">Quick Setup</h2>
                        <p className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-foreground tracking-tight">Your Public Profile Live in 3 Simple Steps.</p>
                    </div>
                    <motion.div 
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, margin: "-50px" }}
                        variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-6 relative"
                    >
                        {[
                            { step: "01", title: "Claim Your /u/ Link", desc: "Sign up for free and choose your custom username URL." },
                            { step: "02", title: "Add Your Skills & Projects", desc: "Add your technical skills, pin your top GitHub repositories, and attach live demo URLs." },
                            { step: "03", title: "Share Everywhere", desc: "Paste your verified FresherFlow profile link on your resume, LinkedIn bio, and direct job application forms." }
                        ].map((item, idx) => (
                            <motion.div key={idx} variants={itemVariants} className="group p-6 md:p-8 rounded-2xl bg-muted/20 border border-border/60 hover:border-border hover:bg-muted/40 transition-all duration-150 ease-out space-y-4">
                                <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground font-extrabold text-base flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-150 ease-out tabular-nums">{item.step}</div>
                                <h3 className="text-lg font-bold text-foreground tracking-tight">{item.title}</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>
            </section>
        </div>
    );
}
