'use client';

import { useState, useEffect, useRef } from 'react';
import {
    EDUCATION_LEVELS, OPPORTUNITY_TYPES, WORK_MODES, INDIAN_CITIES,
    COMMON_SKILLS, DIPLOMA_DEGREES, UG_DEGREES, PG_DEGREES, getSpecializations, normalizeSkillName
} from '@/lib/profileConstants';
import { useAuth } from '@/contexts/AuthContext';
import { profileApi } from '@/lib/api/client';
import { useRouter } from 'next/navigation';
import { AuthGate } from '@/components/gates/ProfileGate';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
    AcademicCapIcon,
    ViewfinderCircleIcon,
    BoltIcon,
    XMarkIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    SparklesIcon,
    PlusIcon
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

type Step = 'education' | 'preferences' | 'readiness';


export default function ProfileCompletePage() {
    const { profile, refreshUser } = useAuth();
    const router = useRouter();

    const [currentStep, setCurrentStep] = useState<Step>('education');
    const [isLoading, setIsLoading] = useState(false);

    // Basic Info
    const [fullName, setFullName] = useState('');

    // Education state
    const [tenthYear, setTenthYear] = useState('');
    const [twelfthYear, setTwelfthYear] = useState('');
    const [educationLevel, setEducationLevel] = useState('');
    const [gradCourse, setGradCourse] = useState('');
    const [gradSpecialization, setGradSpecialization] = useState('');
    const [gradYear, setGradYear] = useState('');

    // Optional PG
    const [hasPG, setHasPG] = useState(false);
    const [pgCourse, setPgCourse] = useState('');
    const [pgSpecialization, setPgSpecialization] = useState('');
    const [pgYear, setPgYear] = useState('');

    // Preferences state
    const [interestedIn, setInterestedIn] = useState<string[]>([]);
    const [preferredCities, setPreferredCities] = useState<string[]>([]);
    const [workModes, setWorkModes] = useState<string[]>([]);
    const [cityInput, setCityInput] = useState('');
    const [cityOpen, setCityOpen] = useState(false);
    const cityRef = useRef<HTMLDivElement>(null);

    // Readiness state
    const [skills, setSkills] = useState<string[]>([]);
    const [skillInput, setSkillInput] = useState('');
    const [skillOpen, setSkillOpen] = useState(false);
    const skillRef = useRef<HTMLDivElement>(null);
    const [skillHighlight, setSkillHighlight] = useState(-1);
    const [cityHighlight, setCityHighlight] = useState(-1);

    const [completion, setCompletion] = useState(0);

    const filteredSkillOptions = COMMON_SKILLS.filter(
        skill => skill.toLowerCase().includes(skillInput.toLowerCase()) && !skills.includes(skill)
    ).slice(0, 10);

    const filteredCityOptions = INDIAN_CITIES.filter(
        city => city.toLowerCase().includes(cityInput.toLowerCase()) && !preferredCities.includes(city)
    ).slice(0, 10);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (skillRef.current && !skillRef.current.contains(e.target as Node)) setSkillOpen(false);
            if (cityRef.current && !cityRef.current.contains(e.target as Node)) setCityOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const { user } = useAuth();

    useEffect(() => {
        if (profile) {
            setCompletion(profile.completionPercentage);
            const normalizedSkills = (profile.skills || [])
                .map((skill) => normalizeSkillName(skill))
                .filter(Boolean);
            setSkills(Array.from(new Set(normalizedSkills)));
            if (profile.completionPercentage >= 40) {
                router.push('/opportunities');
            }
        }
        if (user && user.fullName && !fullName) {
            setFullName(user.fullName);
        }
    }, [profile, router, user, fullName]);

    const handleEducationSubmit = async () => {
        if (!fullName || !tenthYear || !twelfthYear || !educationLevel || !gradCourse || !gradSpecialization || !gradYear) {
            toast.error('Error: Please fill all required fields, including your name');
            return;
        }

        if (tenthYear.length !== 4 || twelfthYear.length !== 4 || gradYear.length !== 4 || (hasPG && pgYear && pgYear.length !== 4)) {
            toast.error('Error: Years must be exactly 4 digits');
            return;
        }

        setIsLoading(true);
        const loadingToast = toast.loading('Saving education details...');
        try {
            await profileApi.updateEducation({
                fullName,
                educationLevel,
                tenthYear: parseInt(tenthYear),
                twelfthYear: parseInt(twelfthYear),
                gradCourse,
                gradSpecialization,
                gradYear: parseInt(gradYear),
                ...(hasPG && {
                    pgCourse,
                    pgSpecialization,
                    pgYear: pgYear ? parseInt(pgYear) : undefined
                })
            });
            await refreshUser();
            toast.success('Education saved.', { id: loadingToast });
            setCurrentStep('preferences');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err: unknown) {
            toast.error((err as Error).message || 'Update failed', { id: loadingToast });
        } finally {
            setIsLoading(false);
        }
    };

    const handlePreferencesSubmit = async () => {
        if (interestedIn.length === 0 || preferredCities.length === 0 || workModes.length === 0) {
            toast.error('Error: Preferences incomplete');
            return;
        }

        setIsLoading(true);
        const loadingToast = toast.loading('Saving preferences...');
        try {
            await profileApi.updatePreferences({ interestedIn, preferredCities, workModes });
            await refreshUser();
            toast.success('Preferences saved.', { id: loadingToast });
            setCurrentStep('readiness');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err: unknown) {
            toast.error((err as Error).message || 'Update failed', { id: loadingToast });
        } finally {
            setIsLoading(false);
        }
    };

    const handleReadinessSubmit = async () => {
        if (skills.length === 0) {
            toast.error('Please add at least one skill');
            return;
        }

        setIsLoading(true);
        const loadingToast = toast.loading('Finalizing your profile...');
        try {
            await profileApi.updateReadiness({ availability: '', skills });
            await refreshUser();
            toast.success('Profile complete.', { id: loadingToast });
            router.push('/dashboard');
        } catch (err: unknown) {
            toast.error((err as Error).message || 'Update failed', { id: loadingToast });
        } finally {
            setIsLoading(false);
        }
    };

    const addSkill = () => {
        const normalized = normalizeSkillName(skillInput);
        if (normalized && !skills.includes(normalized)) {
            setSkills([...skills, normalized]);
            setSkillInput('');
        }
    };

    const removeSkill = (skill: string) => setSkills(skills.filter(s => s !== skill));

    const toggleArrayItem = (array: string[], setArray: (arr: string[]) => void, item: string) => {
        setArray(array.includes(item) ? array.filter(i => i !== item) : [...array, item]);
    };


    return (
        <AuthGate>
            <div className="max-w-7xl mx-auto px-3 md:px-6 py-5 md:py-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8 items-start">

                    {/* Sticky Sidebar */}
                    <aside className="lg:col-span-4 space-y-3 lg:sticky lg:top-24">
                        <div className="premium-card !p-5 md:!p-6 space-y-5 shadow-xl border-primary/5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h1 className="text-2xl font-bold tracking-tight mb-1">Complete profile</h1>
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-[0.05em]">Set up your account for better matches.</p>
                                </div>
                                <a href="/logout" className="text-xs text-muted-foreground hover:text-error underline-offset-2 hover:underline shrink-0" title="Logout">
                                    Logout
                                </a>
                            </div>

                            {/* Circular Progress */}
                            <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-2xl border border-border/50">
                                <div className="relative w-16 h-16 shrink-0">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="5" fill="none" className="text-muted" />
                                        <circle
                                            cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="5" fill="none"
                                            strokeDasharray={175.9}
                                            strokeDashoffset={175.9 * (1 - completion / 100)}
                                            className="text-primary transition-all duration-1000 ease-out"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center text-base font-bold">
                                        {completion}%
                                    </div>
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Completion</p>
                                    <p className="text-base font-bold text-foreground">{completion}% complete</p>
                                </div>
                            </div>

                            {/* Nav Steps */}
                            <div className="space-y-2">
                                {[
                                    { id: 'education', label: 'Academic Foundation', desc: 'Detailed History', icon: AcademicCapIcon },
                                    { id: 'preferences', label: 'Match Parameters', desc: 'Interests & Role types', icon: ViewfinderCircleIcon },
                                    { id: 'readiness', label: 'Talent Showcase', desc: 'Skills & Availability', icon: BoltIcon }
                                ].map((s, i) => {
                                    const isActive = currentStep === s.id;
                                    const isDone = completion >= (i === 0 ? 40 : i === 1 ? 80 : 100);
                                    const canNavigate = isDone || (i === 0) || (i === 1 && completion >= 40);
                                    return (
                                        <button
                                            key={s.id}
                                            onClick={() => canNavigate && setCurrentStep(s.id as Step)}
                                            disabled={!canNavigate}
                                            className={cn(
                                                "p-3 rounded-2xl flex items-center gap-3 transition-all border",
                                                isActive ? "bg-primary/15 text-foreground border-primary/35 shadow-lg shadow-primary/10 scale-[1.02]" :
                                                    isDone ? "bg-primary/5 border-primary/20 text-primary hover:bg-primary/10 cursor-pointer" :
                                                        canNavigate ? "bg-card border-border text-muted-foreground hover:bg-muted/50 cursor-pointer" :
                                                            "bg-card border-border text-muted-foreground opacity-50 cursor-not-allowed"
                                            )}
                                        >
                                            <div className={cn("p-2 rounded-xl", isActive ? "bg-primary/15" : "bg-muted/50")}>
                                                <s.icon className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-bold uppercase tracking-widest leading-none mb-1">{s.label}</p>
                                                <p className={cn("text-[10px] font-medium opacity-70 truncate", isActive ? "text-foreground/80" : "text-muted-foreground")}>{s.desc}</p>
                                            </div>
                                            {isDone && !isActive && <CheckCircleIcon className="w-5 h-5 ml-auto text-primary" />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </aside>

                    {/* Main Form Content */}
                    <main className="lg:col-span-8">
                        <div className="premium-card !p-5 md:!p-7 shadow-2xl border-border/50 flex flex-col">

                            {/* Header Intro */}
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-1 h-8 bg-primary rounded-full" />
                                <div>
                                    <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
                                        {currentStep === 'education' && "Academic Foundation"}
                                        {currentStep === 'preferences' && "Match Parameters"}
                                        {currentStep === 'readiness' && "Talent Showcase"}
                                        <SparklesIcon className="w-4 h-4 text-primary animate-pulse" />
                                    </h2>
                                    <p className="text-[11px] text-muted-foreground font-medium">
                                        {currentStep === 'education' && "Add your education so we can match eligibility correctly."}
                                        {currentStep === 'preferences' && "Tell us what you want to see in your feed."}
                                        {currentStep === 'readiness' && "Add skills and availability to complete your profile."}
                                    </p>
                                </div>
                            </div>

                            {/* Forms Rendering */}
                            <div className="flex-1">
                                {currentStep === 'education' && (
                                    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">

                                        {/* Basic Identity */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">ID</div>
                                                <h3 className="text-sm font-bold uppercase tracking-wider">Personal Identity</h3>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Full Name</label>
                                                    <Input
                                                        type="text"
                                                        value={fullName}
                                                        onChange={(e) => setFullName(e.target.value)}
                                                        placeholder="e.g. Rahul Sharma"
                                                        className="premium-input"
                                                    />
                                                </div>
                                                <div className="space-y-2 opacity-60">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Verified Email</label>
                                                    <Input
                                                        type="email"
                                                        value={user?.email || ''}
                                                        disabled
                                                        className="bg-muted cursor-not-allowed"
                                                    />
                                                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight ml-1">Email cannot be changed for security.</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-5 border-t border-border/50">
                                            {/* 10th Standard */}
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-sm font-bold uppercase tracking-wider">Secondary</h3>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Year of Passing</label>
                                                    <Input type="text" inputMode="numeric" maxLength={4} value={tenthYear} onChange={(e) => setTenthYear(e.target.value.replace(/\D/g, ''))} placeholder="Enter your 10th year" />
                                                </div>
                                            </div>

                                            {/* 12th / Diploma */}
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-sm font-bold uppercase tracking-wider">Higher Secondary</h3>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Year of Passing</label>
                                                    <Input type="text" inputMode="numeric" maxLength={4} value={twelfthYear} onChange={(e) => setTwelfthYear(e.target.value.replace(/\D/g, ''))} placeholder="Enter your 12th year" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Higher Education */}
                                        <div className="space-y-4 pt-4 border-t border-border/50">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-bold uppercase tracking-wider">Graduation (Primary)</h3>
                                            </div>

                                            <div className="space-y-3">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Education Level</p>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                    {EDUCATION_LEVELS.map(level => (
                                                        <button
                                                            key={level}
                                                            onClick={() => setEducationLevel(level)}
                                                            className={cn(
                                                                "h-10 rounded-xl font-bold border-2 transition-all text-[10px] uppercase tracking-widest flex flex-col items-center justify-center gap-0.5",
                                                                educationLevel === level ? "bg-primary border-primary text-primary-foreground shadow-lg" : "bg-muted/50 border-border text-muted-foreground hover:border-primary/40"
                                                            )}
                                                        >
                                                            <span>{level === 'DEGREE' ? 'UG' : level}</span>
                                                            <span className="text-[7px] font-medium opacity-70 uppercase tracking-tighter">
                                                                {level === 'DIPLOMA' && 'Technical'}
                                                                {level === 'DEGREE' && 'Undergrad'}
                                                                {level === 'PG' && 'Postgrad'}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">UG Course</label>
                                                    <Select value={gradCourse} onChange={(e) => { setGradCourse(e.target.value); setGradSpecialization(''); }}>
                                                        <option value="">Select UG</option>
                                                        {(educationLevel === 'DIPLOMA' ? DIPLOMA_DEGREES : educationLevel === 'DEGREE' ? UG_DEGREES : educationLevel === 'PG' ? PG_DEGREES : []).map(d => <option key={d}>{d}</option>)}
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Specialization</label>
                                                    <Select value={gradSpecialization} onChange={(e) => setGradSpecialization(e.target.value)} disabled={!gradCourse}>
                                                        <option value="">Select Field</option>
                                                        {getSpecializations(gradCourse).map((s: string) => <option key={s}>{s}</option>)}
                                                    </Select>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">UG Passout Year</label>
                                                <Input type="text" inputMode="numeric" maxLength={4} value={gradYear} onChange={(e) => setGradYear(e.target.value.replace(/\D/g, ''))} placeholder="Enter your UG year" />
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-border mt-4">
                                            <label className="flex items-center gap-3 p-3 bg-muted/30 rounded-2xl cursor-pointer hover:bg-muted/50 transition-colors border border-border/50">
                                                <input type="checkbox" checked={hasPG} onChange={(e) => setHasPG(e.target.checked)} className="w-5 h-5 rounded-md border-border text-primary" />
                                                <div className="flex-1">
                                                    <span className="text-sm font-bold text-foreground">Add PG (Postgraduate) details</span>
                                                    <p className="text-[9px] text-muted-foreground uppercase tracking-wide mt-0.5">Skip if you only have UG degree</p>
                                                </div>
                                            </label>
                                        </div>

                                        {hasPG && (
                                            <div className="space-y-4 animate-in slide-in-from-top-4 duration-500 pt-2 pb-6">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">PG Course</label>
                                                        <Select value={pgCourse} onChange={(e) => setPgCourse(e.target.value)}>
                                                            <option value="">Select PG</option>
                                                            {PG_DEGREES.map(d => <option key={d}>{d}</option>)}
                                                        </Select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">PG Specialization</label>
                                                        <Select value={pgSpecialization} onChange={(e) => setPgSpecialization(e.target.value)}>
                                                            <option value="">Select Field</option>
                                                            {getSpecializations(pgCourse).map((s: string) => <option key={s}>{s}</option>)}
                                                        </Select>
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">PG Passout Year</label>
                                                    <Input type="text" inputMode="numeric" maxLength={4} value={pgYear} onChange={(e) => setPgYear(e.target.value.replace(/\D/g, ''))} placeholder="Enter your PG year" />
                                                </div>
                                            </div>
                                        )}

                                        <Button onClick={handleEducationSubmit} disabled={isLoading} className="w-full h-12 text-sm bg-primary/15 text-foreground border border-primary/30 hover:bg-primary/20 shadow-xl shadow-primary/10 font-bold uppercase tracking-widest">
                                            {isLoading ? <ArrowPathIcon className="w-6 h-6 animate-spin" /> : <span>Save Education</span>}
                                        </Button>
                                    </div>
                                )}

                                {currentStep === 'preferences' && (
                                    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                                        <div className="space-y-4">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Stream Selection</p>
                                            <div className="flex flex-wrap gap-3">
                                                {OPPORTUNITY_TYPES.map(type => (
                                                    <button
                                                        key={type}
                                                        onClick={() => toggleArrayItem(interestedIn, setInterestedIn, type)}
                                                        className={cn(
                                                            "px-6 h-12 rounded-xl font-bold border-2 transition-all text-xs uppercase tracking-widest",
                                                            interestedIn.includes(type) ? "bg-primary border-primary text-primary-foreground shadow-lg" : "bg-muted/50 border-border text-muted-foreground hover:border-primary/40"
                                                        )}
                                                    >
                                                        {type}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Work Mode</p>
                                            <div className="flex flex-wrap gap-3">
                                                {WORK_MODES.map(t => (
                                                    <button
                                                        key={t} onClick={() => toggleArrayItem(workModes, setWorkModes, t)}
                                                        className={cn("px-6 h-12 rounded-xl font-bold text-xs uppercase tracking-widest transition-all border-2", workModes.includes(t) ? "bg-primary text-primary-foreground border-primary shadow-lg" : "bg-muted/50 border-border text-muted-foreground hover:border-primary/50")}
                                                    >
                                                        {t}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Preferred Locations</p>
                                            <div className="relative" ref={cityRef}>
                                                <div className="flex gap-2">
                                                    <Input
                                                        value={cityInput}
                                                        onChange={(e) => { setCityInput(e.target.value); setCityHighlight(-1); setCityOpen(true); }}
                                                        onFocus={() => setCityOpen(true)}
                                                        placeholder="e.g. Hyderabad, Bangalore"
                                                        className="premium-input !h-12 text-sm"
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'ArrowDown') { e.preventDefault(); setCityHighlight(h => Math.min(h + 1, filteredCityOptions.length - 1)); }
                                                            else if (e.key === 'ArrowUp') { e.preventDefault(); setCityHighlight(h => Math.max(h - 1, 0)); }
                                                            else if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                const city = cityHighlight >= 0 ? filteredCityOptions[cityHighlight] : cityInput.trim();
                                                                if (city) { toggleArrayItem(preferredCities, setPreferredCities, city); setCityInput(''); setCityHighlight(-1); setCityOpen(false); }
                                                            } else if (e.key === 'Escape') { setCityOpen(false); }
                                                        }}
                                                    />
                                                    <Button
                                                        variant="outline"
                                                        className="h-12 px-6 font-bold uppercase tracking-widest text-[10px]"
                                                        onClick={() => {
                                                            if (cityInput.trim()) {
                                                                toggleArrayItem(preferredCities, setPreferredCities, cityInput.trim());
                                                                setCityInput('');
                                                                setCityOpen(false);
                                                            }
                                                        }}
                                                    >
                                                        Add City
                                                    </Button>
                                                </div>
                                                {/* City Autocomplete Dropdown */}
                                                {cityOpen && cityInput && filteredCityOptions.length > 0 && (
                                                    <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                                                        {filteredCityOptions.map((city, idx) => (
                                                            <button
                                                                key={city}
                                                                onMouseDown={() => { toggleArrayItem(preferredCities, setPreferredCities, city); setCityInput(''); setCityHighlight(-1); setCityOpen(false); }}
                                                                className={cn("w-full text-left px-4 py-2.5 transition-colors text-sm font-medium first:rounded-t-xl last:rounded-b-xl", cityHighlight === idx ? "bg-primary/20 text-foreground" : "hover:bg-primary/10")}
                                                            >
                                                                {city}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-[9px] font-bold text-muted-foreground uppercase ml-1">Start typing to see suggestions, or enter custom city.</p>
                                            <div className="flex flex-wrap gap-2 min-h-6">
                                                {preferredCities.map(c => (
                                                    <span key={c} className="bg-primary text-primary-foreground px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 shadow-lg shadow-primary/20">
                                                        {c}
                                                        <XMarkIcon onClick={() => toggleArrayItem(preferredCities, setPreferredCities, c)} className="w-3 h-3 cursor-pointer opacity-70 hover:opacity-100" />
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <Button onClick={handlePreferencesSubmit} disabled={isLoading} className="flex-1 h-12 text-sm bg-primary/15 text-foreground border border-primary/30 hover:bg-primary/20 shadow-xl shadow-primary/10 font-bold uppercase tracking-widest">
                                                {isLoading ? <ArrowPathIcon className="w-6 h-6 animate-spin" /> : <span>Save Preferences</span>}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => setCurrentStep('readiness')}
                                                className="h-12 px-6 font-bold uppercase tracking-widest text-[10px] text-muted-foreground"
                                            >
                                                Skip
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {currentStep === 'readiness' && (
                                    <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                                        {/* Availability — hidden temporarily
                                        <div className="space-y-4">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Availability</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                                {AVAILABILITY_OPTIONS.map(val => (
                                                    <button
                                                        key={val} onClick={() => setAvailability(val)}
                                                        className={cn("h-11 rounded-xl flex flex-col items-center justify-center border-2 transition-all gap-0.5", availability === val ? "border-primary bg-primary text-primary-foreground shadow-xl shadow-primary/20" : "bg-muted/50 border-border text-muted-foreground hover:border-primary/40")}
                                                    >
                                                        <span className="font-bold text-[10px] uppercase tracking-widest">{val.replace('_', ' ')}</span>
                                                        <span className="text-[7px] opacity-60 font-medium uppercase tracking-[0.2em]">Horizon</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        */}

                                        <div className="space-y-4">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Skills</p>
                                            <div className="relative" ref={skillRef}>
                                                <div className="flex gap-2">
                                                    <input
                                                        value={skillInput}
                                                        onChange={(e) => { setSkillInput(e.target.value); setSkillHighlight(-1); setSkillOpen(true); }}
                                                        onFocus={() => setSkillOpen(true)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'ArrowDown') { e.preventDefault(); setSkillHighlight(h => Math.min(h + 1, filteredSkillOptions.length - 1)); }
                                                            else if (e.key === 'ArrowUp') { e.preventDefault(); setSkillHighlight(h => Math.max(h - 1, 0)); }
                                                            else if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                const skill = skillHighlight >= 0 ? filteredSkillOptions[skillHighlight] : normalizeSkillName(skillInput);
                                                                if (skill && !skills.includes(skill)) { setSkills([...skills, skill]); setSkillInput(''); setSkillHighlight(-1); setSkillOpen(false); }
                                                            } else if (e.key === 'Escape') { setSkillOpen(false); }
                                                        }}
                                                        className="premium-input !h-12 text-sm flex-1"
                                                        placeholder="e.g. React, Node.js"
                                                    />
                                                    <button onClick={addSkill} className="premium-button shrink-0 px-4 !h-12"><PlusIcon className="w-4 h-4" /></button>
                                                </div>
                                                {/* Skills Autocomplete Dropdown */}
                                                {skillOpen && skillInput && filteredSkillOptions.length > 0 && (
                                                    <div className="absolute z-50 w-full mt-2 bg-card border border-border rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                                                        {filteredSkillOptions.map((skill, idx) => (
                                                            <button
                                                                key={skill}
                                                                onMouseDown={() => { setSkills(prev => [...new Set([...prev, skill])]); setSkillInput(''); setSkillHighlight(-1); setSkillOpen(false); }}
                                                                className={cn("w-full text-left px-4 py-2.5 transition-colors text-sm font-medium first:rounded-t-xl last:rounded-b-xl", skillHighlight === idx ? "bg-primary/20 text-foreground" : "hover:bg-primary/10")}
                                                            >
                                                                {skill}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-[9px] font-bold text-muted-foreground uppercase ml-1">Start typing to see suggestions, or enter custom skill.</p>
                                            <div className="flex flex-wrap gap-2 min-h-6">
                                                {skills.map(s => (
                                                    <span key={s} className="bg-success/5 text-success border border-success/20 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                                                        {s}
                                                        <XMarkIcon onClick={() => removeSkill(s)} className="w-3 h-3 cursor-pointer opacity-50 hover:opacity-100" />
                                                    </span>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <Button onClick={handleReadinessSubmit} disabled={isLoading} className="flex-1 h-12 text-sm bg-primary/15 text-foreground border border-primary/30 hover:bg-primary/20 shadow-xl shadow-primary/10 font-bold uppercase tracking-widest">
                                                {isLoading ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <div className="flex items-center gap-2"><span>Finish Setup</span><CheckCircleIcon className="w-5 h-5" /></div>}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => router.push('/opportunities')}
                                                className="h-12 px-6 font-bold uppercase tracking-widest text-[10px] text-muted-foreground"
                                            >
                                                Skip
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </AuthGate>
    );
}


