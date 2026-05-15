import { redirect } from 'next/navigation';

export default function FrozenUserRoute() {
  redirect('/download');
}

// /* WEB PIVOT: old user route implementation preserved below for later restoration.
// 'use client';
// 
// import { useState, useEffect, useRef } from 'react';
// import { AcademicCapIcon, SparklesIcon } from '@heroicons/react/24/outline';
// import { useAuth } from '@/contexts/AuthContext';
// import { useRouter } from 'next/navigation';
// import { AuthGate } from '@/components/gates/ProfileGate';
// import { useProfileForm } from '@/features/profile/hooks/useProfileForm';
// import { useClickOutside } from '@/lib/hooks/useClickOutside';
// 
// // Hooks
// import { useProfileCompleteHandlers } from './hooks/useProfileCompleteHandlers';
// 
// // Components
// import { CompletionSidebar } from './components/CompletionSidebar';
// import { CompletionMobileHeader } from './components/CompletionMobileHeader';
// import { EducationStep } from './components/EducationStep';
// import { PreferencesStep } from './components/PreferencesStep';
// 
// type StepId = 'education' | 'preferences';
// 
// const STEPS: { id: StepId; label: string; sub: string; icon: React.ElementType }[] = [
//     { id: 'education', label: 'Education', sub: 'Academic history', icon: AcademicCapIcon },
//     { id: 'preferences', label: 'Preferences & Skills', sub: 'Interests, cities & tools', icon: SparklesIcon },
// ];
// 
// /** Shared toggle helper */
// function toggleItem<T>(arr: T[], item: T): T[] {
//     return arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item];
// }
// 
// export default function ProfileCompletePage() {
//     const { profile, forceRefreshProfile, user } = useAuth();
//     const router = useRouter();
// 
//     // Force-fetch fresh profile on mount so skills + completion % are never stale
//     useEffect(() => {
//         forceRefreshProfile();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, []);
// 
//     // Determine the initial step from profile at mount time only
//     const initialStep = (): StepId => {
//         if (typeof window === 'undefined') return 'education';
//         const pct = (profile as { completionPercentage?: number } | null)?.completionPercentage ?? 0;
//         return pct >= 40 ? 'preferences' : 'education';
//     };
// 
//     const [currentStep, setCurrentStep] = useState<StepId>(initialStep);
//     const completion = profile?.completionPercentage ?? 0;
// 
//     const {
//         fullName, setFullName,
//         educationLevel, setEducationLevel,
//         tenthYear, setTenthYear,
//         twelfthYear, setTwelfthYear,
//         gradCourse, setGradCourse,
//         gradSpecialization, setGradSpecialization,
//         gradYear, setGradYear,
//         hasPG, setHasPG,
//         pgCourse, setPgCourse,
//         pgSpecialization, setPgSpecialization,
//         pgYear, setPgYear,
//         interestedIn, setInterestedIn,
//         preferredCities, setPreferredCities,
//         workModes, setWorkModes,
//         skills, setSkills,
//         cityInput, setCityInput,
//         skillInput, setSkillInput,
//         filteredSkillOptions,
//         filteredCityOptions,
//         hydrateFromProfile,
//         addSkillFromInput,
//     } = useProfileForm(99);
// 
//     const [cityOpen, setCityOpen] = useState(false);
//     const cityRef = useRef<HTMLDivElement>(null);
//     const [skillOpen, setSkillOpen] = useState(false);
//     const skillRef = useRef<HTMLDivElement>(null);
//     const [skillHighlight, setSkillHighlight] = useState(-1);
//     const [cityHighlight, setCityHighlight] = useState(-1);
// 
//     useClickOutside(skillRef, () => setSkillOpen(false));
//     useClickOutside(cityRef, () => setCityOpen(false));
// 
//     const hasHydrated = useRef(false);
// 
//     useEffect(() => {
//         if (!profile) return;
// 
//         // Hydrate form fields on first load only (don't overwrite user edits)
//         if (!hasHydrated.current) {
//             hasHydrated.current = true;
//             hydrateFromProfile(profile, user?.fullName || '');
//             // Advance step based on server data
//             if (profile.completionPercentage >= 40 && currentStep === 'education') {
//                 setCurrentStep('preferences');
//             }
//         }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [profile?.completionPercentage]);
// 
// 
//     const {
//         isLoading,
//         handleEducationSubmit,
//         handleReadinessSubmit
//     } = useProfileCompleteHandlers(
//         {
//             fullName, educationLevel, tenthYear, twelfthYear,
//             gradCourse, gradSpecialization, gradYear,
//             hasPG, pgCourse, pgSpecialization, pgYear,
//             interestedIn, preferredCities, workModes, skills
//         },
//         forceRefreshProfile,
//         setCurrentStep
//     );
// 
//     const addSkill = () => {
//         const added = addSkillFromInput();
//         if (added) setSkillOpen(false);
//     };
// 
//     const stepDone = (i: number) => completion >= (i === 0 ? 40 : 100);
//     const canNav = (i: number) => stepDone(i) || i === 0 || (i === 1 && completion >= 40);
//     const currentIdx = STEPS.findIndex(s => s.id === currentStep);
// 
//     return (
//         <AuthGate>
//         <div className="max-w-7xl mx-auto min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
// 
//                 <CompletionSidebar
//                     steps={STEPS}
//                     currentStep={currentStep}
//                     setCurrentStep={(step) => setCurrentStep(step as StepId)}
//                     completion={completion}
//                     stepDone={stepDone}
//                     canNav={canNav}
//                 />
// 
//                 <main className="flex flex-col items-start px-4 pt-2 pb-8 lg:py-8 lg:px-0 overflow-y-auto w-full">
// 
//                     <CompletionMobileHeader
//                         steps={STEPS}
//                         currentStep={currentStep}
//                         setCurrentStep={(step) => setCurrentStep(step as StepId)}
//                         stepDone={stepDone}
//                         canNav={canNav}
//                         currentIdx={currentIdx}
//                     />
// 
//                     <div className="w-full max-w-4xl bg-card border border-border shadow-sm rounded-3xl p-6 md:p-10 flex flex-col lg:min-h-[70vh] lg:justify-center">
// 
//                         {currentStep === 'education' && (
//                             <EducationStep
//                                 fullName={fullName}
//                                 setFullName={setFullName}
//                                 email={user?.email}
//                                 tenthYear={tenthYear}
//                                 setTenthYear={setTenthYear}
//                                 twelfthYear={twelfthYear}
//                                 setTwelfthYear={setTwelfthYear}
//                                 educationLevel={educationLevel}
//                                 setEducationLevel={setEducationLevel}
//                                 gradCourse={gradCourse}
//                                 setGradCourse={setGradCourse}
//                                 gradSpecialization={gradSpecialization}
//                                 setGradSpecialization={setGradSpecialization}
//                                 gradYear={gradYear}
//                                 setGradYear={setGradYear}
//                                 hasPG={hasPG}
//                                 setHasPG={setHasPG}
//                                 pgCourse={pgCourse}
//                                 setPgCourse={setPgCourse}
//                                 pgSpecialization={pgSpecialization}
//                                 setPgSpecialization={setPgSpecialization}
//                                 pgYear={pgYear}
//                                 setPgYear={setPgYear}
//                                 isLoading={isLoading}
//                                 onSubmit={handleEducationSubmit}
//                             />
//                         )}
// 
//                         {currentStep === 'preferences' && (
//                             <PreferencesStep
//                                 interestedIn={interestedIn}
//                                 setInterestedIn={setInterestedIn}
//                                 workModes={workModes}
//                                 setWorkModes={setWorkModes}
//                                 preferredCities={preferredCities}
//                                 setPreferredCities={setPreferredCities}
//                                 cityInput={cityInput}
//                                 setCityInput={setCityInput}
//                                 cityOpen={cityOpen}
//                                 setCityOpen={setCityOpen}
//                                 cityHighlight={cityHighlight}
//                                 setCityHighlight={setCityHighlight}
//                                 filteredCityOptions={filteredCityOptions}
//                                 toggleItem={toggleItem}
//                                 cityRef={cityRef}
//                                 skills={skills}
//                                 removeSkill={(s: string) => setSkills(skills.filter(x => x !== s))}
//                                 skillInput={skillInput}
//                                 setSkillInput={setSkillInput}
//                                 skillOpen={skillOpen}
//                                 setSkillOpen={setSkillOpen}
//                                 skillHighlight={skillHighlight}
//                                 setSkillHighlight={setSkillHighlight}
//                                 filteredSkillOptions={filteredSkillOptions}
//                                 addSkill={addSkill}
//                                 addSkillValue={(skill: string) => {
//                                     setSkills(prev => [...new Set([...prev, skill])]);
//                                     setSkillInput('');
//                                     setSkillHighlight(-1);
//                                     setSkillOpen(false);
//                                 }}
//                                 skillRef={skillRef}
//                                 isLoading={isLoading}
//                                 onSubmit={handleReadinessSubmit}
//                                 onSkip={() => router.push('/dashboard')}
//                             />
//                         )}
//                     </div>
//                 </main>
//             </div>
//         </AuthGate>
//     );
// }
// 
// */
// 
// 

