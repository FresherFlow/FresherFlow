'use client';

import { useState, useEffect, useRef } from 'react';
import { AcademicCapIcon, ViewfinderCircleIcon, BoltIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { AuthGate } from '@/components/gates/ProfileGate';
import { useProfileForm } from '@/features/profile/hooks/useProfileForm';
import { useClickOutside } from '@/lib/hooks/useClickOutside';

// Hooks
import { useProfileCompleteHandlers } from './hooks/useProfileCompleteHandlers';

// Components
import { CompletionSidebar } from './components/CompletionSidebar';
import { CompletionMobileHeader } from './components/CompletionMobileHeader';
import { EducationStep } from './components/EducationStep';
import { PreferencesStep } from './components/PreferencesStep';
import { SkillsStep } from './components/SkillsStep';

type StepId = 'education' | 'preferences' | 'readiness';

const STEPS: { id: StepId; label: string; sub: string; icon: React.ElementType }[] = [
    { id: 'education', label: 'Education', sub: 'Academic history', icon: AcademicCapIcon },
    { id: 'preferences', label: 'Preferences', sub: 'Interests & role types', icon: ViewfinderCircleIcon },
    { id: 'readiness', label: 'Skills', sub: 'Tools & availability', icon: BoltIcon },
];

/** Shared toggle helper – avoids duplicating in each handler */
function toggleItem<T>(arr: T[], item: T): T[] {
    return arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];
}

export default function ProfileCompletePage() {
    const { profile, refreshUser, user } = useAuth();
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

    useEffect(() => {
        if (profile) {
            hydrateFromProfile(profile, user?.fullName || '');
            if (profile.completionPercentage >= 40) {
                router.push('/opportunities');
            }
        }
    }, [profile, router, user?.fullName, hydrateFromProfile]);

    const {
        isLoading,
        handleEducationSubmit,
        handlePreferencesSubmit,
        handleReadinessSubmit
    } = useProfileCompleteHandlers(
        {
            fullName, educationLevel, tenthYear, twelfthYear,
            gradCourse, gradSpecialization, gradYear,
            hasPG, pgCourse, pgSpecialization, pgYear,
            interestedIn, preferredCities, workModes, skills
        },
        refreshUser as unknown as () => Promise<void>,
        setCurrentStep
    );

    const addSkill = () => {
        const added = addSkillFromInput();
        if (added) setSkillOpen(false);
    };

    const stepDone = (i: number) => completion >= (i === 0 ? 40 : i === 1 ? 80 : 100);
    const canNav = (i: number) => stepDone(i) || i === 0 || (i === 1 && completion >= 40);
    const currentIdx = STEPS.findIndex(s => s.id === currentStep);

    return (
        <AuthGate>
            <div className="min-h-screen lg:grid lg:grid-cols-[300px_1fr]">
                
                <CompletionSidebar 
                    steps={STEPS}
                    currentStep={currentStep}
                    setCurrentStep={setCurrentStep}
                    completion={completion}
                    stepDone={stepDone}
                    canNav={canNav}
                />

                <main className="flex flex-col items-center px-4 py-8 lg:py-12 lg:px-10 overflow-y-auto">
                    
                    <CompletionMobileHeader 
                        steps={STEPS}
                        currentStep={currentStep}
                        setCurrentStep={setCurrentStep}
                        stepDone={stepDone}
                        canNav={canNav}
                        currentIdx={currentIdx}
                    />

                    <div className="w-full max-w-2xl premium-card p-6! md:p-8! shadow-xl border-border/50">
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

                        {currentStep === 'education' && (
                            <EducationStep 
                                fullName={fullName}
                                setFullName={setFullName}
                                email={user?.email}
                                tenthYear={tenthYear}
                                setTenthYear={setTenthYear}
                                twelfthYear={twelfthYear}
                                setTwelfthYear={setTwelfthYear}
                                educationLevel={educationLevel}
                                setEducationLevel={setEducationLevel}
                                gradCourse={gradCourse}
                                setGradCourse={setGradCourse}
                                gradSpecialization={gradSpecialization}
                                setGradSpecialization={setGradSpecialization}
                                gradYear={gradYear}
                                setGradYear={setGradYear}
                                hasPG={hasPG}
                                setHasPG={setHasPG}
                                pgCourse={pgCourse}
                                setPgCourse={setPgCourse}
                                pgSpecialization={pgSpecialization}
                                setPgSpecialization={setPgSpecialization}
                                pgYear={pgYear}
                                setPgYear={setPgYear}
                                isLoading={isLoading}
                                onSubmit={handleEducationSubmit}
                            />
                        )}

                        {currentStep === 'preferences' && (
                            <PreferencesStep 
                                interestedIn={interestedIn}
                                setInterestedIn={setInterestedIn}
                                workModes={workModes}
                                setWorkModes={setWorkModes}
                                preferredCities={preferredCities}
                                setPreferredCities={setPreferredCities}
                                cityInput={cityInput}
                                setCityInput={setCityInput}
                                cityOpen={cityOpen}
                                setCityOpen={setCityOpen}
                                cityHighlight={cityHighlight}
                                setCityHighlight={setCityHighlight}
                                filteredCityOptions={filteredCityOptions}
                                toggleItem={toggleItem}
                                cityRef={cityRef}
                                isLoading={isLoading}
                                onSubmit={handlePreferencesSubmit}
                                onSkip={() => setCurrentStep('readiness')}
                            />
                        )}

                        {currentStep === 'readiness' && (
                            <SkillsStep 
                                skills={skills}
                                removeSkill={(s: string) => setSkills(skills.filter(x => x !== s))}
                                skillInput={skillInput}
                                setSkillInput={setSkillInput}
                                skillOpen={skillOpen}
                                setSkillOpen={setSkillOpen}
                                skillHighlight={skillHighlight}
                                setSkillHighlight={setSkillHighlight}
                                filteredSkillOptions={filteredSkillOptions}
                                addSkill={addSkill}
                                addSkillValue={(skill: string) => {
                                    setSkills(prev => [...new Set([...prev, skill])]);
                                    setSkillInput('');
                                    setSkillHighlight(-1);
                                    setSkillOpen(false);
                                }}
                                skillRef={skillRef}
                                isLoading={isLoading}
                                onSubmit={handleReadinessSubmit}
                                onSkip={() => router.push('/opportunities')}
                            />
                        )}
                    </div>
                </main>
            </div>
        </AuthGate>
    );
}
