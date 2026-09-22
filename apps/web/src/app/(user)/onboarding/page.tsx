'use client';

import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { AcademicCapIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { AuthGate } from '@/features/auth/components/ProfileGate';
import { useProfileForm } from '@/features/profile/hooks/useProfileForm';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useProfileCompleteHandlers } from '@/features/profile/hooks/useProfileCompleteHandlers';
import { EducationStep } from '@/features/profile/components/complete/EducationStep';
import { PreferencesStep } from '@/features/profile/components/complete/PreferencesStep';

type StepId = 'education' | 'preferences';

const STEPS: { id: StepId; label: string; sub: string; icon: React.ElementType }[] = [
    { id: 'education', label: 'Education', sub: 'Academic history', icon: AcademicCapIcon },
    { id: 'preferences', label: 'Preferences & Skills', sub: 'Interests, cities & tools', icon: SparklesIcon },
];

function toggleItem<T>(arr: T[], item: T): T[] {
    return arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];
}

function OnboardingContent() {
    const { profile, forceRefreshProfile, user } = useAuth();
    const router = useRouter();

    const [currentStep, setCurrentStep] = useState<StepId>('education');
    const completion = profile?.completionPercentage ?? 0;

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

    useClickOutside(skillRef, () => setSkillOpen(false));
    useClickOutside(cityRef, () => setCityOpen(false));

    const hasHydrated = useRef(false);
    useEffect(() => {
        if (!profile) return;
        if (!hasHydrated.current) {
            hasHydrated.current = true;
            hydrateFromProfile(profile, user?.fullName || '');
            if (profile.completionPercentage >= 40 && currentStep === 'education') setCurrentStep('preferences');
        }
    }, [profile, user]);

    const { isLoading, handleEducationSubmit, handleReadinessSubmit } = useProfileCompleteHandlers(
        { fullName, educationLevel, tenthYear, twelfthYear, gradCourse, gradSpecialization, gradYear, hasPG, pgCourse, pgSpecialization, pgYear, interestedIn, preferredCities, workModes, skills },
        forceRefreshProfile,
        setCurrentStep as any
    );

    const addSkill = () => {
        if (skills.length >= 10) { toast.error('Maximum 10 skills allowed'); return; }
        const added = addSkillFromInput();
        if (added) setSkillOpen(false);
    };

    const stepDone = (i: number) => completion >= (i === 0 ? 40 : 100);
    const canNav = (i: number) => stepDone(i) || i === 0 || (i === 1 && completion >= 40);
    const currentIdx = STEPS.findIndex(s => s.id === currentStep);

    return (
        <div className="w-full max-w-6xl mx-auto px-4 py-6 md:py-8">
            <div className="w-full md:grid md:grid-cols-[360px_1fr] md:border md:border-border/80 md:rounded-2xl md:shadow-lg md:overflow-hidden bg-card animate-in fade-in duration-200">
                <aside className="hidden md:flex flex-col justify-between bg-muted/40 p-7 relative overflow-hidden border-r border-border/60">
                    <div className="space-y-6">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Onboarding · {currentIdx + 1} / {STEPS.length}</p>
                            <h2 className="text-2xl font-bold tracking-tight leading-tight mt-2">Complete your profile</h2>
                            <p className="text-sm text-muted-foreground leading-relaxed mt-2">Big enough to cover everything — education, skills and preferences.</p>
                            <div className="mt-4 h-2 rounded-full bg-border overflow-hidden">
                                <div className="h-full bg-primary transition-all" style={{width: `${completion}%`}} />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1.5">{completion}% complete</p>
                        </div>
                        <div className="space-y-2">
                            {STEPS.map((s, i) => {
                                const active = currentStep === s.id;
                                const done = stepDone(i);
                                const nav = canNav(i);
                                return (
                                    <button key={s.id} onClick={() => nav && setCurrentStep(s.id)} disabled={!nav} className={`w-full flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${active ? 'bg-card border-primary/30 shadow-sm' : done ? 'bg-card border-border hover:border-primary/20' : 'bg-transparent border-transparent opacity-60'} ${!nav ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${active ? 'bg-primary text-primary-foreground' : done ? 'bg-success text-white' : 'bg-muted text-muted-foreground'}`}>
                                            {done ? '✓' : <s.icon className="w-4 h-4" />}
                                        </span>
                                        <span className="min-w-0">
                                            <p className={`text-sm font-semibold leading-none ${active ? 'text-foreground' : 'text-muted-foreground'}`}>{s.label}</p>
                                            <p className="text-xs text-muted-foreground truncate">{s.sub}</p>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">Skip and complete later from <span className="font-mono font-bold text-foreground">Settings → Profile</span></p>
                </aside>

                <div className="md:hidden flex items-center gap-2 px-1 pb-4">
                    {STEPS.map((s, i) => (
                        <div key={s.id} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= currentIdx ? 'bg-primary' : 'bg-border'}`} />
                    ))}
                    <span className="text-xs font-bold text-muted-foreground ml-2">{currentIdx + 1}/{STEPS.length}</span>
                </div>

                <div className="w-full flex flex-col bg-card p-6 md:p-8 space-y-6">
                    {currentStep === 'education' && (
                        <EducationStep fullName={fullName} setFullName={setFullName} email={user?.email} tenthYear={tenthYear} setTenthYear={setTenthYear} twelfthYear={twelfthYear} setTwelfthYear={setTwelfthYear} educationLevel={educationLevel} setEducationLevel={setEducationLevel} gradCourse={gradCourse} setGradCourse={setGradCourse} gradSpecialization={gradSpecialization} setGradSpecialization={setGradSpecialization} gradYear={gradYear} setGradYear={setGradYear} hasPG={hasPG} setHasPG={setHasPG} pgCourse={pgCourse} setPgCourse={setPgCourse} pgSpecialization={pgSpecialization} setPgSpecialization={setPgSpecialization} pgYear={pgYear} setPgYear={setPgYear} isLoading={isLoading} onSubmit={handleEducationSubmit} />
                    )}
                    {currentStep === 'preferences' && (
                        <PreferencesStep interestedIn={interestedIn} setInterestedIn={setInterestedIn} workModes={workModes} setWorkModes={setWorkModes} preferredCities={preferredCities} setPreferredCities={setPreferredCities} cityInput={cityInput} setCityInput={setCityInput} cityOpen={cityOpen} setCityOpen={setCityOpen} cityHighlight={cityHighlight} setCityHighlight={setCityHighlight} filteredCityOptions={filteredCityOptions} toggleItem={toggleItem} cityRef={cityRef} skills={skills} removeSkill={(s: string) => setSkills(skills.filter(x => x !== s))} skillInput={skillInput} setSkillInput={setSkillInput} skillOpen={skillOpen} setSkillOpen={setSkillOpen} skillHighlight={skillHighlight} setSkillHighlight={setSkillHighlight} filteredSkillOptions={filteredSkillOptions} addSkill={addSkill} addSkillValue={(skill: string) => { if (skills.length >= 10) { toast.error('Maximum 10 skills allowed'); return; } setSkills(prev => [...new Set([...prev, skill])]); setSkillInput(''); setSkillHighlight(-1); setSkillOpen(false); }} skillRef={skillRef} isLoading={isLoading} onSubmit={handleReadinessSubmit} onSkip={() => { try { localStorage.setItem('ff_onboarding_skipped','true'); } catch {} router.push('/jobs?tab=for-you'); }} />
                    )}
                </div>
            </div>
        </div>
    );
}

export default function OnboardingPage() {
    return (
        <AuthGate>
            <OnboardingContent />
        </AuthGate>
    );
}