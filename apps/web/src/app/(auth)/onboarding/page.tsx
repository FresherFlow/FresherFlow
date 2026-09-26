'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { AuthGate } from '@/features/auth/components/ProfileGate';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { useProfileForm } from '@/features/profile/hooks/useProfileForm';
import { useProfileCompleteHandlers } from '@/features/profile/hooks/useProfileCompleteHandlers';
import { IdentityCard } from '@/features/profile/components/complete/IdentityCard';
import { NativeSelect } from '@/ui/NativeSelect';
import { EducationSection } from '@/features/profile/components/sections/EducationSection';
import { SkillsSection } from '@/features/profile/components/sections/SkillsSection';
import { PreferencesSection } from '@/features/profile/components/sections/PreferencesSection';

type StepId = 'name' | 'school' | 'degree' | 'roles' | 'cities' | 'skills' | 'recruiter';

interface StepDef {
    id: StepId;
    label: string;
    sub: string;
}

const HIGHER_OPTIONS: { value: string; label: string; sub: string }[] = [
    { value: 'none', label: 'No further studies', sub: 'School is my highest qualification' },
    { value: 'DIPLOMA', label: 'Diploma', sub: 'Polytechnic or equivalent' },
    { value: 'DEGREE', label: "Bachelor's Degree", sub: 'B.Tech, B.Sc, B.Com…' },
    { value: 'PG', label: "Master's / PG", sub: 'M.Tech, MBA, M.Sc…' },
];

/** Levels that carry a degree/diploma course set. */
const GRAD_LEVELS = ['DIPLOMA', 'DEGREE', 'PG'];

/**
 * Onboarding.
 *
 * One question group per screen instead of whole sections at once. The fields
 * stay owned by the shared section components (same components the profile
 * editor renders — `visibleGroups` only narrows what each screen shows), and
 * the two API writes stay where they were: education saves at the end of the
 * school step, readiness saves on Finish. Nothing here duplicates a field.
 */
function OnboardingContent() {
    const { profile, forceRefreshProfile, user } = useAuth();
    const router = useRouter();

    const [currentStep, setCurrentStep] = useState<StepId>('name');
    const [maxReached, setMaxReached] = useState(0);
    const [higher, setHigher] = useState('');
    const completion = profile?.completionPercentage ?? 0;

    const {
        fullName, setFullName,
        educationLevel, setEducationLevel,
        tenthYear, setTenthYear,
        twelfthYear, setTwelfthYear,
        gradCourse, setGradCourse,
        gradSpecialization, setGradSpecialization,
        gradYear, setGradYear,
        collegeId, setCollegeId,
        collegeName, setCollegeName,
        collegeState, setCollegeState,
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
        expectedCtc, setExpectedCtc,
        resumeUrl, setResumeUrl,
        willingToRelocate, setWillingToRelocate,
        filteredSkillOptions,
        filteredCityOptions,
        hydrateFromProfile,
        addSkillValue,
        addSkillFromInput,
        addCityFromInput,
        togglePreferredCity,
    } = useProfileForm(5);

    // School years first, then only the higher qualification (if any).
    // Minimum first: a 10th passout never sees degree fields; a diploma
    // holder gets diploma options (the section swaps its course list on
    // the level itself).
    const needsDegree = GRAD_LEVELS.includes(educationLevel);
    const STEPS: StepDef[] = useMemo(() => [
        { id: 'name', label: 'Your name', sub: 'How recruiters address you' },
        { id: 'school', label: 'School years', sub: '10th, Inter & higher studies' },
        ...(needsDegree
            ? [{ id: 'degree', label: 'Degree & college', sub: 'Course, field and college' } as StepDef]
            : []),
        { id: 'roles', label: 'Work you want', sub: 'Roles and setup' },
        { id: 'cities', label: 'Where', sub: 'Cities you want' },
        { id: 'skills', label: 'Skills', sub: "What you're good at" },
        { id: 'recruiter', label: 'Recruiter details', sub: 'CTC, resume, relocate' },
    ], [needsDegree]);

    const hasHydrated = useRef(false);
    useEffect(() => {
        if (!profile) return;
        if (!hasHydrated.current) {
            hasHydrated.current = true;
            hydrateFromProfile(profile, user?.fullName || '');
            if (profile.completionPercentage >= 40) {
                const idx = STEPS.findIndex((s) => s.id === 'roles');
                setMaxReached(idx);
                setCurrentStep('roles');
            }
        }
    }, [profile, user]);

    const currentIdx = STEPS.findIndex((s) => s.id === currentStep);

    const unlockAndGo = (id: StepId) => {
        const idx = STEPS.findIndex((s) => s.id === id);
        setMaxReached((prev) => Math.max(prev, idx));
        setCurrentStep(id);
    };

    const advance = () => {
        if (currentIdx < STEPS.length - 1) unlockAndGo(STEPS[currentIdx + 1].id);
    };

    const goBack = () => {
        if (currentIdx > 0) setCurrentStep(STEPS[currentIdx - 1].id);
    };

    // Defensive: the step list reshapes with the level — never render a
    // step that no longer exists.
    useEffect(() => {
        if (STEPS.findIndex((s) => s.id === currentStep) === -1) setCurrentStep('school');
    }, [STEPS, currentStep]);

    // Each screen is short — reset scroll on step change, in the panel on
    // desktop (fixed-height box) and on the window everywhere else.
    // Focus follows the step heading so keyboard and screen-reader users
    // land on the new question (a heading never pops the mobile keyboard).
    const headingRef = useRef<HTMLHeadingElement>(null);
    useEffect(() => {
        document.getElementById('auth-panel')?.scrollTo({ top: 0 });
        window.scrollTo({ top: 0 });
        headingRef.current?.focus({ preventScroll: true });
    }, [currentStep]);

    const { isLoading: isSaving, handleEducationSubmit, handleReadinessSubmit } = useProfileCompleteHandlers(
        {
            fullName,
            educationLevel,
            tenthYear,
            twelfthYear,
            gradCourse,
            gradSpecialization,
            gradYear,
            collegeId,
            collegeName,
            collegeState,
            hasPG,
            pgCourse,
            pgSpecialization,
            pgYear,
            interestedIn,
            preferredCities,
            workModes,
            skills,
            expectedCtc,
            resumeUrl,
            willingToRelocate,
        },
        forceRefreshProfile,
        () => unlockAndGo('roles'),
    );

    const skip = () => {
        try {
            localStorage.setItem('ff_onboarding_skipped', 'true');
        } catch {}
        router.push('/jobs?tab=for-you');
    };

    const saveEducationAndContinue = async () => {
        await handleEducationSubmit();
    };

    const handleContinue = async () => {
        if (currentStep === 'name' && !fullName.trim()) {
            toast.error('Tell us your name to continue.');
            return;
        }
        if (currentStep === 'school') {
            if (tenthYear.trim().length !== 4) {
                toast.error('Pick your 10th passout year.');
                return;
            }
            if (twelfthYear.trim() && twelfthYear.trim().length !== 4) {
                toast.error('Inter year must be 4 digits — or leave it empty.');
                return;
            }
            if (!higher) {
                toast.error('Pick one to continue.');
                return;
            }
            // Inter filled + no further studies = INTER; empty Inter = TENTH.
            const level = higher === 'none' ? (twelfthYear.trim() ? 'INTER' : 'TENTH') : higher;
            setEducationLevel(level);
            // PG implies the PG set; anything else drops it.
            setHasPG(level === 'PG');
            const schoolIdx = STEPS.findIndex((s) => s.id === 'school');
            // What follows depends on the answer — re-walk from here so no
            // stale step stays reachable.
            setMaxReached(schoolIdx);
            if (GRAD_LEVELS.includes(higher)) {
                setCurrentStep('degree');
                return;
            }
            await handleEducationSubmit();
            return;
        }
        if (currentStep === 'degree' && !gradCourse) {
            toast.error('Pick your degree course to continue.');
            return;
        }
        if (currentStep === 'roles' && (interestedIn.length === 0 || workModes.length === 0)) {
            toast.error('Pick at least one role and one setup to continue.');
            return;
        }
        if (currentStep === 'cities' && preferredCities.length === 0) {
            toast.error('Add at least one city to continue.');
            return;
        }
        if (currentStep === 'skills' && skills.length === 0) {
            toast.error('Add at least one skill to continue.');
            return;
        }
        advance();
    };

    // The education save lands on the last education screen: the degree
    // step when a degree follows, otherwise the school screen itself.
    const isSaveStep =
        (currentStep === 'school' && !!higher && !GRAD_LEVELS.includes(higher)) ||
        (needsDegree && currentStep === 'degree');

    // Continue is submit-type only inside the name form (it has no inner
    // form); everywhere else it is a plain button beside the section forms.
    const stepNav = (
        <div className="flex items-center gap-3 pt-2">
            {currentIdx > 0 && (
                <button
                    type="button"
                    onClick={goBack}
                    disabled={isSaving}
                    className="h-12 rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground transition-all hover:bg-muted active-press-soft disabled:opacity-50"
                >
                    Back
                </button>
            )}
            {currentStep === 'recruiter' ? (
                <button
                    type="button"
                    onClick={() => void handleReadinessSubmit()}
                    disabled={isSaving}
                    className="h-12 flex-1 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active-press-soft disabled:opacity-50"
                >
                    {isSaving ? 'Publishing…' : 'Finish → publish my page'}
                </button>
            ) : isSaveStep ? (
                <button
                    type="button"
                    onClick={() => void saveEducationAndContinue()}
                    disabled={isSaving}
                    className="h-12 flex-1 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active-press-soft disabled:opacity-50"
                >
                    {isSaving ? 'Saving…' : 'Save education & continue →'}
                </button>
            ) : (
                <button
                    type={currentStep === 'name' ? 'submit' : 'button'}
                    onClick={currentStep === 'name' ? undefined : handleContinue}
                    className="h-12 flex-1 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active-press-soft"
                >
                    Continue →
                </button>
            )}
        </div>
    );

    return (
        <AuthShell
            left={
                <div className="flex h-full flex-col gap-6">
                    <div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Onboarding · {currentIdx + 1} / {STEPS.length}</p>
                            <h2 className="text-2xl font-bold tracking-tight leading-tight mt-2">Complete your profile</h2>
                            <p className="text-sm text-muted-foreground leading-relaxed mt-2">A few quick questions to go live.</p>
                            <div className="mt-4 flex items-center gap-3">
                                <div className="h-1.5 flex-1 rounded-full bg-border overflow-hidden">
                                    <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${completion}%` }} />
                                </div>
                                <p className="shrink-0 text-xs font-bold tabular-nums text-muted-foreground">{completion}%</p>
                            </div>
                        </div>
                        <div className="mt-5 space-y-1 border-t border-border/60 pt-4">
                            {STEPS.map((s, i) => {
                                const active = currentStep === s.id;
                                const done = i < currentIdx;
                                const reachable = i <= maxReached;
                                return (
                                    <button key={s.id} onClick={() => reachable && setCurrentStep(s.id)} disabled={!reachable} className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-meta transition-colors ${active ? 'font-semibold text-foreground' : 'text-muted-foreground hover:bg-card/60'} ${!reachable ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                                        <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden="true">
                                            {done ? (
                                                <svg className="h-3.5 w-3.5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                            ) : active ? (
                                                <span className="h-2 w-2 rounded-full bg-primary" />
                                            ) : (
                                                <span className="h-2 w-2 rounded-full border border-border" />
                                            )}
                                        </span>
                                        {s.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    <p className="mt-auto text-xs text-muted-foreground">Skip and complete later from <span className="font-mono font-bold text-foreground">Settings → Profile</span></p>
                </div>
            }
        >
            <div className="flex items-center gap-2 lg:hidden">
                    {STEPS.map((s, i) => (
                        <div key={s.id} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= currentIdx ? 'bg-primary' : 'bg-border'}`} />
                    ))}
                    <span className="text-xs font-bold text-muted-foreground ml-2">{currentIdx + 1}/{STEPS.length}</span>
                </div>
                <div className="space-y-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Step {currentIdx + 1} of {STEPS.length}</p>
                    <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-bold tracking-tight text-foreground focus:outline-none">{STEPS[currentIdx].label}</h1>
                    <p className="text-xs leading-relaxed text-muted-foreground">{STEPS[currentIdx].sub}</p>
                </div>
                    {currentStep === 'name' && (
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                void handleContinue();
                            }}
                        >
                            <IdentityCard fullName={fullName} setFullName={setFullName} email={user?.email} bare />
                            {stepNav}
                        </form>
                    )}
                    {currentStep === 'school' && (
                        <>
                            <EducationSection
                                profile={profile}
                                tenthYear={tenthYear} setTenthYear={setTenthYear}
                                twelfthYear={twelfthYear} setTwelfthYear={setTwelfthYear}
                                educationLevel={educationLevel} setEducationLevel={setEducationLevel}
                                gradCourse={gradCourse} setGradCourse={setGradCourse}
                                gradSpecialization={gradSpecialization} setGradSpecialization={setGradSpecialization}
                                gradYear={gradYear} setGradYear={setGradYear}
                                collegeId={collegeId} setCollegeId={setCollegeId}
                                collegeName={collegeName} setCollegeName={setCollegeName}
                                collegeState={collegeState} setCollegeState={setCollegeState}
                                hasPG={hasPG} setHasPG={setHasPG}
                                pgCourse={pgCourse} setPgCourse={setPgCourse}
                                pgSpecialization={pgSpecialization} setPgSpecialization={setPgSpecialization}
                                pgYear={pgYear} setPgYear={setPgYear}
                                onSave={handleEducationSubmit}
                                visibleGroups={['school']}
                                hideTimeline
                                hideFooter
                                bare
                            />
                            <div className="space-y-2">
                                <label htmlFor="higher-studies" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Higher studies
                                </label>
                                <NativeSelect
                                    id="higher-studies"
                                    variant="compact"
                                    value={higher}
                                    onChange={(e) => setHigher(e.target.value)}
                                >
                                    <option value="">Pick one…</option>
                                    {HIGHER_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </NativeSelect>
                                {higher && (
                                    <p className="text-xs text-muted-foreground">
                                        {HIGHER_OPTIONS.find((opt) => opt.value === higher)?.sub}
                                    </p>
                                )}
                            </div>
                            {stepNav}
                        </>
                    )}
                    {needsDegree && currentStep === 'degree' && (
                        <>
                            <EducationSection
                                profile={profile}
                                tenthYear={tenthYear} setTenthYear={setTenthYear}
                                twelfthYear={twelfthYear} setTwelfthYear={setTwelfthYear}
                                educationLevel={educationLevel} setEducationLevel={setEducationLevel}
                                gradCourse={gradCourse} setGradCourse={setGradCourse}
                                gradSpecialization={gradSpecialization} setGradSpecialization={setGradSpecialization}
                                gradYear={gradYear} setGradYear={setGradYear}
                                collegeId={collegeId} setCollegeId={setCollegeId}
                                collegeName={collegeName} setCollegeName={setCollegeName}
                                collegeState={collegeState} setCollegeState={setCollegeState}
                                hasPG={hasPG} setHasPG={setHasPG}
                                pgCourse={pgCourse} setPgCourse={setPgCourse}
                                pgSpecialization={pgSpecialization} setPgSpecialization={setPgSpecialization}
                                pgYear={pgYear} setPgYear={setPgYear}
                                onSave={handleEducationSubmit}
                                visibleGroups={educationLevel === 'PG' ? ['degree', 'pg'] : ['degree']}
                                hideTimeline
                                hideFooter
                                bare
                            />
                            {stepNav}
                        </>
                    )}
                    {currentStep === 'roles' && (
                        <>
                            <PreferencesSection
                                profile={profile}
                                interestedIn={interestedIn}
                                toggleInterestedIn={(item) => setInterestedIn(interestedIn.includes(item) ? interestedIn.filter((i) => i !== item) : [...interestedIn, item])}
                                workModes={workModes}
                                toggleWorkMode={(item) => setWorkModes(workModes.includes(item) ? workModes.filter((i) => i !== item) : [...workModes, item])}
                                preferredCities={preferredCities} setPreferredCities={setPreferredCities}
                                cityInput={cityInput} setCityInput={setCityInput}
                                filteredCityOptions={filteredCityOptions} addCity={addCityFromInput}
                                togglePreferredCity={togglePreferredCity}
                                expectedCtc={expectedCtc} setExpectedCtc={setExpectedCtc}
                                resumeUrl={resumeUrl} setResumeUrl={setResumeUrl}
                                willingToRelocate={willingToRelocate} setWillingToRelocate={setWillingToRelocate}
                                onSave={handleReadinessSubmit}
                                visibleGroups={['roles', 'setup']}
                                hideFooter
                                bare
                            />
                            {stepNav}
                        </>
                    )}
                    {currentStep === 'cities' && (
                        <>
                            <PreferencesSection
                                profile={profile}
                                interestedIn={interestedIn}
                                toggleInterestedIn={(item) => setInterestedIn(interestedIn.includes(item) ? interestedIn.filter((i) => i !== item) : [...interestedIn, item])}
                                workModes={workModes}
                                toggleWorkMode={(item) => setWorkModes(workModes.includes(item) ? workModes.filter((i) => i !== item) : [...workModes, item])}
                                preferredCities={preferredCities} setPreferredCities={setPreferredCities}
                                cityInput={cityInput} setCityInput={setCityInput}
                                filteredCityOptions={filteredCityOptions} addCity={addCityFromInput}
                                togglePreferredCity={togglePreferredCity}
                                expectedCtc={expectedCtc} setExpectedCtc={setExpectedCtc}
                                resumeUrl={resumeUrl} setResumeUrl={setResumeUrl}
                                willingToRelocate={willingToRelocate} setWillingToRelocate={setWillingToRelocate}
                                onSave={handleReadinessSubmit}
                                visibleGroups={['cities']}
                                hideFooter
                                bare
                            />
                            {stepNav}
                        </>
                    )}
                    {currentStep === 'skills' && (
                        <>
                            <SkillsSection
                                profile={profile}
                                skillInput={skillInput} setSkillInput={setSkillInput}
                                filteredSkillOptions={filteredSkillOptions}
                                skills={skills} setSkills={setSkills}
                                addSkill={addSkillFromInput}
                                addSkillValue={addSkillValue}
                                onSave={handleReadinessSubmit}
                                hideFooter
                                bare
                            />
                            {stepNav}
                        </>
                    )}
                    {currentStep === 'recruiter' && (
                        <>
                            <PreferencesSection
                                profile={profile}
                                interestedIn={interestedIn}
                                toggleInterestedIn={(item) => setInterestedIn(interestedIn.includes(item) ? interestedIn.filter((i) => i !== item) : [...interestedIn, item])}
                                workModes={workModes}
                                toggleWorkMode={(item) => setWorkModes(workModes.includes(item) ? workModes.filter((i) => i !== item) : [...workModes, item])}
                                preferredCities={preferredCities} setPreferredCities={setPreferredCities}
                                cityInput={cityInput} setCityInput={setCityInput}
                                filteredCityOptions={filteredCityOptions} addCity={addCityFromInput}
                                togglePreferredCity={togglePreferredCity}
                                expectedCtc={expectedCtc} setExpectedCtc={setExpectedCtc}
                                resumeUrl={resumeUrl} setResumeUrl={setResumeUrl}
                                willingToRelocate={willingToRelocate} setWillingToRelocate={setWillingToRelocate}
                                onSave={handleReadinessSubmit}
                                visibleGroups={['recruiter']}
                                hideFooter
                                bare
                            />
                            {stepNav}
                            <button
                                type="button"
                                onClick={skip}
                                className="self-center text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                            >
                                Skip for now — finish this later
                            </button>
                        </>
                    )}
        </AuthShell>
    );
}

export default function OnboardingPage() {
    return (
        <AuthGate>
            <OnboardingContent />
        </AuthGate>
    );
}
