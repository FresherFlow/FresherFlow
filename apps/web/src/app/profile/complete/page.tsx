'use client';

import { useState, useEffect, useRef } from 'react';
import {
    EDUCATION_LEVELS, OPPORTUNITY_TYPES, WORK_MODES,
    DIPLOMA_DEGREES, UG_DEGREES, PG_DEGREES, getSpecializations
} from '@/lib/profileConstants';
import { useAuth } from '@/contexts/AuthContext';
import { profileApi } from '@/lib/api/client';
import { useRouter } from 'next/navigation';
import { AuthGate } from '@/components/gates/ProfileGate';
import { cn } from '@/lib/utils';
import { useProfileForm } from '@/features/profile/hooks/useProfileForm';
import { validateEducationData } from '@/lib/profileFormValidation';
import toast from 'react-hot-toast';
import {
    AcademicCapIcon,
    ViewfinderCircleIcon,
    BoltIcon,
    XMarkIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    PlusIcon,
    ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

type Step = 'education' | 'preferences' | 'readiness';

const STEPS: { id: Step; label: string; sub: string; icon: React.ElementType }[] = [
    { id: 'education', label: 'Education', sub: 'Academic history', icon: AcademicCapIcon },
    { id: 'preferences', label: 'Preferences', sub: 'Interests & role types', icon: ViewfinderCircleIcon },
    { id: 'readiness', label: 'Skills', sub: 'Tools & availability', icon: BoltIcon },
];

/** Shared toggle helper – avoids duplicating in each handler */
function toggleItem<T>(arr: T[], item: T): T[] {
    return arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];
}

export default function ProfileCompletePage() {
    const { profile, refreshUser } = useAuth();
    const { user } = useAuth();
    const router = useRouter();

    const [currentStep, setCurrentStep] = useState<Step>('education');
    const [isLoading, setIsLoading] = useState(false);
    const [completion, setCompletion] = useState(0);

    const {
        fullName, setFullName,
        educationLevel, setEducationLevel,
        tenthYear, setTenthYear,
        twelfthYear, setTwelfthYear,
        gradCourse, setGradCourse,
        gradSpecialization, setGradSpecialization,
        gradYear, setGradYear,
        hasPG, setHasPG,
        pgCourse, setPgCourse,
        pgSpecialization, setPgSpecialization,
        pgYear, setPgYear,
        interestedIn, setInterestedIn,
        preferredCities, setPreferredCities,
        workModes, setWorkModes,
        skills, setSkills,
        cityInput, setCityInput,
        skillInput, setSkillInput,
        filteredSkillOptions,
        filteredCityOptions,
        hydrateFromProfile,
        addSkillFromInput,
    } = useProfileForm(99);

    const [cityOpen, setCityOpen] = useState(false);
    const cityRef = useRef<HTMLDivElement>(null);
    const [skillOpen, setSkillOpen] = useState(false);
    const skillRef = useRef<HTMLDivElement>(null);
    const [skillHighlight, setSkillHighlight] = useState(-1);
    const [cityHighlight, setCityHighlight] = useState(-1);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (skillRef.current && !skillRef.current.contains(e.target as Node)) setSkillOpen(false);
            if (cityRef.current && !cityRef.current.contains(e.target as Node)) setCityOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        if (profile) {
            setCompletion(profile.completionPercentage);
            hydrateFromProfile(profile, user?.fullName || '');
            if (profile.completionPercentage >= 40) {
                router.push('/opportunities');
            }
        }
    }, [profile, router, user?.fullName, hydrateFromProfile]);

    // ── Submit handlers ──────────────────────────────────────────────

    const handleEducationSubmit = async () => {
        const validation = validateEducationData({
            fullName,
            requireFullName: true,
            educationLevel,
            tenthYear, twelfthYear,
            gradCourse, gradSpecialization, gradYear,
            hasPG, pgCourse, pgSpecialization, pgYear,
        });

        if (!validation.valid || !validation.years) {
            toast.error(`Error: ${validation.error || 'Invalid education data'}`);
            return;
        }

        setIsLoading(true);
        const tid = toast.loading('Saving education details…');
        try {
            await profileApi.updateEducation({
                fullName, educationLevel,
                tenthYear: validation.years.tenthYear,
                twelfthYear: validation.years.twelfthYear,
                gradCourse, gradSpecialization,
                gradYear: validation.years.gradYear,
                ...(validation.includePG && { pgCourse, pgSpecialization, pgYear: validation.years.pgYear }),
            });
            await refreshUser();
            toast.success('Education saved.', { id: tid });
            setCurrentStep('preferences');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err: unknown) {
            toast.error((err as Error).message || 'Update failed', { id: tid });
        } finally {
            setIsLoading(false);
        }
    };

    const handlePreferencesSubmit = async () => {
        if (interestedIn.length === 0 || preferredCities.length === 0 || workModes.length === 0) {
            toast.error('Preferences incomplete');
            return;
        }
        setIsLoading(true);
        const tid = toast.loading('Saving preferences…');
        try {
            await profileApi.updatePreferences({ interestedIn, preferredCities, workModes });
            await refreshUser();
            toast.success('Preferences saved.', { id: tid });
            setCurrentStep('readiness');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err: unknown) {
            toast.error((err as Error).message || 'Update failed', { id: tid });
        } finally {
            setIsLoading(false);
        }
    };

    const handleReadinessSubmit = async () => {
        if (skills.length === 0) {
            toast.error('Add at least one skill');
            return;
        }
        setIsLoading(true);
        const tid = toast.loading('Finalizing your profile…');
        try {
            await profileApi.updateReadiness({ availability: 'IMMEDIATE', skills });
            await refreshUser();
            toast.success('Profile complete!', { id: tid });
            router.push('/dashboard');
        } catch (err: unknown) {
            toast.error((err as Error).message || 'Update failed', { id: tid });
        } finally {
            setIsLoading(false);
        }
    };

    // ── Helpers ──────────────────────────────────────────────────────

    const addSkill = () => {
        const added = addSkillFromInput();
        if (added) setSkillOpen(false);
    };
    const removeSkill = (s: string) => setSkills(skills.filter(x => x !== s));

    const currentIdx = STEPS.findIndex(s => s.id === currentStep);
    const stepDone = (i: number) => completion >= (i === 0 ? 40 : i === 1 ? 80 : 100);
    const canNav = (i: number) => stepDone(i) || i === 0 || (i === 1 && completion >= 40);

    return (
        <AuthGate>
            <div className="min-h-screen lg:grid lg:grid-cols-[300px_1fr]">

                {/* ════════════════════════════════════════
                    LEFT SIDEBAR — desktop only, sticky
                ════════════════════════════════════════ */}
                <aside className="hidden lg:flex flex-col gap-6 px-8 py-10 border-r border-border/50 sticky top-0 h-screen overflow-y-auto">

                    {/* Brand + logout */}
                    <div className="flex items-center justify-between">
                        <h1 className="text-lg font-bold tracking-tight">Profile Setup</h1>
                        <a href="/logout" className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
                            Logout
                        </a>
                    </div>

                    <p className="text-xs text-muted-foreground -mt-4">
                        Takes about 2 minutes. Helps us match you better.
                    </p>

                    {/* Progress ring */}
                    <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-2xl border border-border/50">
                        <div className="relative w-16 h-16 shrink-0">
                            <svg className="w-full h-full -rotate-90">
                                <circle cx="32" cy="32" r="28" strokeWidth="5" fill="none" className="text-muted stroke-current" />
                                <circle
                                    cx="32" cy="32" r="28" strokeWidth="5" fill="none"
                                    strokeDasharray={175.9}
                                    strokeDashoffset={175.9 * (1 - completion / 100)}
                                    className="text-primary stroke-current transition-all duration-700 ease-out"
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                                {completion}%
                            </div>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Completion</p>
                            <p className="text-sm font-bold">{completion}% done</p>
                        </div>
                    </div>

                    {/* Step list */}
                    <div className="space-y-2">
                        {STEPS.map((s, i) => {
                            const active = currentStep === s.id;
                            const done = stepDone(i);
                            const navigate = canNav(i);
                            return (
                                <button
                                    key={s.id}
                                    onClick={() => navigate && setCurrentStep(s.id)}
                                    disabled={!navigate}
                                    className={cn(
                                        'w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all',
                                        active ? 'bg-primary/10 border-primary/30 text-foreground shadow-sm'
                                            : done ? 'bg-muted/30 border-border/50 text-muted-foreground hover:bg-muted/50 cursor-pointer'
                                                : 'bg-card border-border/40 text-muted-foreground opacity-40 cursor-not-allowed',
                                    )}
                                >
                                    {/* Icon circle */}
                                    <div className={cn(
                                        'w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all',
                                        active ? 'bg-primary border-primary text-primary-foreground'
                                            : done ? 'bg-primary/10 border-primary text-primary'
                                                : 'bg-muted border-border text-muted-foreground',
                                    )}>
                                        {done && !active
                                            ? <CheckCircleIcon className="w-4 h-4" />
                                            : <s.icon className="w-4 h-4" />
                                        }
                                    </div>

                                    {/* Text */}
                                    <div className="min-w-0">
                                        <p className={cn('text-xs font-bold uppercase tracking-wider', active ? 'text-foreground' : '')}>
                                            {s.label}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground truncate">{s.sub}</p>
                                    </div>

                                    {/* Done tick */}
                                    {done && !active && (
                                        <CheckCircleIcon className="w-4 h-4 ml-auto text-primary shrink-0" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Connector line decoration */}
                    <div className="mt-auto pt-4 border-t border-border/40">
                        <p className="text-[10px] text-muted-foreground">
                            Step {currentIdx + 1} of {STEPS.length}
                        </p>
                    </div>
                </aside>

                {/* ════════════════════════════════════════
                    RIGHT — form area (all screen sizes)
                ════════════════════════════════════════ */}
                <main className="flex flex-col items-center px-4 py-8 lg:py-12 lg:px-10 overflow-y-auto">

                    {/* Mobile header + step pills */}
                    <div className="w-full max-w-2xl lg:hidden mb-6">
                        <div className="flex items-center justify-between mb-5">
                            <div>
                                <h1 className="text-xl font-bold tracking-tight">Profile Setup</h1>
                                <p className="text-xs text-muted-foreground mt-0.5">Takes about 2 minutes.</p>
                            </div>
                            <a href="/logout" className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
                                Logout
                            </a>
                        </div>
                        {/* Mobile horizontal step strip */}
                        <div className="flex items-center">
                            {STEPS.map((s, i) => {
                                const active = currentStep === s.id;
                                const done = stepDone(i);
                                const navigate = canNav(i);
                                return (
                                    <div key={s.id} className="flex items-center flex-1 last:flex-none">
                                        <button
                                            onClick={() => navigate && setCurrentStep(s.id)}
                                            disabled={!navigate}
                                            className={cn('flex flex-col items-center gap-1 flex-1', !navigate && 'opacity-40 cursor-not-allowed')}
                                        >
                                            <div className={cn(
                                                'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all',
                                                active ? 'bg-primary border-primary text-primary-foreground shadow-md shadow-primary/30'
                                                    : done ? 'bg-primary/10 border-primary text-primary'
                                                        : 'bg-muted border-border text-muted-foreground',
                                            )}>
                                                {done && !active ? <CheckCircleIcon className="w-4 h-4" /> : <s.icon className="w-3.5 h-3.5" />}
                                            </div>
                                            <span className={cn('text-[9px] font-bold uppercase tracking-widest', active ? 'text-foreground' : 'text-muted-foreground')}>
                                                {s.label}
                                            </span>
                                        </button>
                                        {i < STEPS.length - 1 && (
                                            <div className={cn('h-px flex-1 mx-1.5 mb-4 transition-colors duration-500', currentIdx > i ? 'bg-primary' : 'bg-border')} />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── Form card ── */}
                    <div className="w-full max-w-2xl premium-card p-6! md:p-8! shadow-xl border-border/50">

                        {/* Step header */}
                        <div className="mb-6">
                            <h2 className="text-lg font-bold">
                                {currentStep === 'education' && 'Your Academic History'}
                                {currentStep === 'preferences' && 'What are you looking for?'}
                                {currentStep === 'readiness' && 'What skills do you bring?'}
                            </h2>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {currentStep === 'education' && 'Fill in your education so we can match opportunities by eligibility.'}
                                {currentStep === 'preferences' && 'Tell us what you want to see in your daily feed.'}
                                {currentStep === 'readiness' && 'Add skills to appear in relevant job matches.'}
                            </p>
                        </div>

                        {/* ── Education Step ── */}
                        {currentStep === 'education' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-3 duration-300">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field label="Full Name">
                                        <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Rahul Sharma" />
                                    </Field>
                                    <Field label="Email (verified)">
                                        <Input value={user?.email || ''} disabled className="opacity-50 cursor-not-allowed" />
                                    </Field>
                                </div>

                                <hr className="border-border/50" />

                                <div className="grid grid-cols-2 gap-4">
                                    <Field label="10th Passout Year">
                                        <Input inputMode="numeric" maxLength={4} value={tenthYear} onChange={e => setTenthYear(e.target.value.replace(/\D/g, ''))} placeholder="YYYY" />
                                    </Field>
                                    <Field label="12th Passout Year">
                                        <Input inputMode="numeric" maxLength={4} value={twelfthYear} onChange={e => setTwelfthYear(e.target.value.replace(/\D/g, ''))} placeholder="YYYY" />
                                    </Field>
                                </div>

                                <hr className="border-border/50" />

                                <div className="space-y-4">
                                    <Field label="Qualification Level">
                                        <div className="flex flex-wrap gap-2">
                                            {EDUCATION_LEVELS.map(level => (
                                                <button key={level} onClick={() => setEducationLevel(level)}
                                                    className={cn('px-4 h-9 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all',
                                                        educationLevel === level ? 'bg-primary border-primary text-primary-foreground shadow-md' : 'bg-muted/50 border-border text-muted-foreground hover:border-primary/40')}
                                                >
                                                    {level === 'DEGREE' ? 'UG' : level}
                                                </button>
                                            ))}
                                        </div>
                                    </Field>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <Field label="Course">
                                            <Select value={gradCourse} onChange={e => { setGradCourse(e.target.value); setGradSpecialization(''); }}>
                                                <option value="">Select…</option>
                                                {(educationLevel === 'DIPLOMA' ? DIPLOMA_DEGREES : educationLevel === 'DEGREE' ? UG_DEGREES : PG_DEGREES).map(d => <option key={d}>{d}</option>)}
                                            </Select>
                                        </Field>
                                        <Field label="Specialization">
                                            <Select value={gradSpecialization} onChange={e => setGradSpecialization(e.target.value)} disabled={!gradCourse}>
                                                <option value="">Select…</option>
                                                {getSpecializations(gradCourse).map((s: string) => <option key={s}>{s}</option>)}
                                            </Select>
                                        </Field>
                                        <Field label="Passout Year">
                                            <Input inputMode="numeric" maxLength={4} value={gradYear} onChange={e => setGradYear(e.target.value.replace(/\D/g, ''))} placeholder="YYYY" />
                                        </Field>
                                    </div>
                                </div>

                                <label className="flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-border/50 cursor-pointer hover:bg-muted/50 transition-colors">
                                    <input type="checkbox" checked={hasPG} onChange={e => setHasPG(e.target.checked)} className="w-4 h-4 rounded border-border" />
                                    <span className="text-sm font-medium">I also have a Postgraduate (PG) degree</span>
                                </label>

                                {hasPG && (
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in slide-in-from-top-2 duration-300">
                                        <Field label="PG Course">
                                            <Select value={pgCourse} onChange={e => setPgCourse(e.target.value)}>
                                                <option value="">Select…</option>
                                                {PG_DEGREES.map(d => <option key={d}>{d}</option>)}
                                            </Select>
                                        </Field>
                                        <Field label="PG Specialization">
                                            <Select value={pgSpecialization} onChange={e => setPgSpecialization(e.target.value)}>
                                                <option value="">Select…</option>
                                                {getSpecializations(pgCourse).map((s: string) => <option key={s}>{s}</option>)}
                                            </Select>
                                        </Field>
                                        <Field label="PG Passout Year">
                                            <Input inputMode="numeric" maxLength={4} value={pgYear} onChange={e => setPgYear(e.target.value.replace(/\D/g, ''))} placeholder="YYYY" />
                                        </Field>
                                    </div>
                                )}

                                <Button onClick={handleEducationSubmit} disabled={isLoading} className="w-full h-11 font-bold flex items-center justify-center gap-2">
                                    {isLoading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <>Save & Continue <ArrowRightIcon className="w-4 h-4" /></>}
                                </Button>
                            </div>
                        )}

                        {/* ── Preferences Step ── */}
                        {currentStep === 'preferences' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-3 duration-300">
                                <Field label="Looking for">
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {OPPORTUNITY_TYPES.map(t => (
                                            <button key={t} onClick={() => setInterestedIn(toggleItem(interestedIn, t))}
                                                className={cn('px-4 h-9 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all',
                                                    interestedIn.includes(t) ? 'bg-primary border-primary text-primary-foreground shadow-md' : 'bg-muted/50 border-border text-muted-foreground hover:border-primary/40')}
                                            >{t}</button>
                                        ))}
                                    </div>
                                </Field>

                                <Field label="Work Mode">
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {WORK_MODES.map(t => (
                                            <button key={t} onClick={() => setWorkModes(toggleItem(workModes, t))}
                                                className={cn('px-4 h-9 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all',
                                                    workModes.includes(t) ? 'bg-primary border-primary text-primary-foreground shadow-md' : 'bg-muted/50 border-border text-muted-foreground hover:border-primary/40')}
                                            >{t}</button>
                                        ))}
                                    </div>
                                </Field>

                                <Field label="Preferred Cities">
                                    <div className="relative mt-1" ref={cityRef}>
                                        <div className="flex gap-2">
                                            <Input
                                                value={cityInput}
                                                onChange={e => { setCityInput(e.target.value); setCityHighlight(-1); setCityOpen(true); }}
                                                onFocus={() => setCityOpen(true)}
                                                placeholder="e.g. Hyderabad, Bangalore"
                                                onKeyDown={e => {
                                                    if (e.key === 'ArrowDown') { e.preventDefault(); setCityHighlight(h => Math.min(h + 1, filteredCityOptions.length - 1)); }
                                                    else if (e.key === 'ArrowUp') { e.preventDefault(); setCityHighlight(h => Math.max(h - 1, 0)); }
                                                    else if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        const city = cityHighlight >= 0 ? filteredCityOptions[cityHighlight] : cityInput.trim();
                                                        if (city) { setPreferredCities(toggleItem(preferredCities, city)); setCityInput(''); setCityHighlight(-1); setCityOpen(false); }
                                                    } else if (e.key === 'Escape') setCityOpen(false);
                                                }}
                                            />
                                            <Button variant="outline" className="h-10 px-4 text-xs font-bold uppercase tracking-wider shrink-0"
                                                onClick={() => { if (cityInput.trim()) { setPreferredCities(toggleItem(preferredCities, cityInput.trim())); setCityInput(''); setCityOpen(false); } }}>
                                                Add
                                            </Button>
                                        </div>
                                        {cityOpen && cityInput && filteredCityOptions.length > 0 && (
                                            <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-2xl max-h-52 overflow-y-auto">
                                                {filteredCityOptions.map((city, idx) => (
                                                    <button key={city}
                                                        onMouseDown={() => { setPreferredCities(toggleItem(preferredCities, city)); setCityInput(''); setCityHighlight(-1); setCityOpen(false); }}
                                                        className={cn('w-full text-left px-4 py-2.5 text-sm font-medium transition-colors first:rounded-t-xl last:rounded-b-xl', cityHighlight === idx ? 'bg-primary/15 text-foreground' : 'hover:bg-muted')}
                                                    >{city}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    {preferredCities.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {preferredCities.map(c => (
                                                <span key={c} className="bg-primary text-primary-foreground px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                                    {c}
                                                    <XMarkIcon onClick={() => setPreferredCities(preferredCities.filter(x => x !== c))} className="w-3 h-3 cursor-pointer opacity-70 hover:opacity-100" />
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </Field>

                                <div className="flex gap-3">
                                    <Button onClick={handlePreferencesSubmit} disabled={isLoading} className="flex-1 h-11 font-bold flex items-center justify-center gap-2">
                                        {isLoading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <>Save & Continue <ArrowRightIcon className="w-4 h-4" /></>}
                                    </Button>
                                    <Button variant="outline" onClick={() => setCurrentStep('readiness')} className="h-11 px-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Skip
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* ── Readiness Step ── */}
                        {currentStep === 'readiness' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-3 duration-300">
                                <Field label="Skills">
                                    <div className="relative mt-1" ref={skillRef}>
                                        <div className="flex gap-2">
                                            <input
                                                value={skillInput}
                                                onChange={e => { setSkillInput(e.target.value); setSkillHighlight(-1); setSkillOpen(true); }}
                                                onFocus={() => setSkillOpen(true)}
                                                onKeyDown={e => {
                                                    if (e.key === 'ArrowDown') { e.preventDefault(); setSkillHighlight(h => Math.min(h + 1, filteredSkillOptions.length - 1)); }
                                                    else if (e.key === 'ArrowUp') { e.preventDefault(); setSkillHighlight(h => Math.max(h - 1, 0)); }
                                                    else if (e.key === 'Enter') { e.preventDefault(); addSkill(); }
                                                    else if (e.key === 'Escape') setSkillOpen(false);
                                                }}
                                                className="premium-input h-10! text-sm flex-1"
                                                placeholder="e.g. React, Node.js, Python"
                                            />
                                            <button onClick={addSkill} className="w-10 h-10 flex items-center justify-center rounded-lg border border-border bg-card hover:bg-muted transition-colors shrink-0">
                                                <PlusIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                        {skillOpen && skillInput && filteredSkillOptions.length > 0 && (
                                            <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-xl shadow-2xl max-h-52 overflow-y-auto">
                                                {filteredSkillOptions.map((skill, idx) => (
                                                    <button key={skill}
                                                        onMouseDown={() => { setSkills(prev => [...new Set([...prev, skill])]); setSkillInput(''); setSkillHighlight(-1); setSkillOpen(false); }}
                                                        className={cn('w-full text-left px-4 py-2.5 text-sm font-medium transition-colors first:rounded-t-xl last:rounded-b-xl', skillHighlight === idx ? 'bg-primary/15 text-foreground' : 'hover:bg-muted')}
                                                    >{skill}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground mt-1.5">Type to search or enter a custom skill and press Enter.</p>
                                    {skills.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            {skills.map(s => (
                                                <span key={s} className="bg-success/5 text-success border border-success/20 px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                                                    {s}
                                                    <XMarkIcon onClick={() => removeSkill(s)} className="w-3 h-3 cursor-pointer opacity-50 hover:opacity-100" />
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </Field>

                                <div className="flex gap-3">
                                    <Button onClick={handleReadinessSubmit} disabled={isLoading} className="flex-1 h-11 font-bold flex items-center justify-center gap-2">
                                        {isLoading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <><CheckCircleIcon className="w-4 h-4" /> Finish Setup</>}
                                    </Button>
                                    <Button variant="outline" onClick={() => router.push('/opportunities')} className="h-11 px-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Skip
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </AuthGate>
    );
}

// ── Shared Field wrapper (same as profile/page.tsx) ──────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5 w-full">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</label>
            {children}
        </div>
    );
}
