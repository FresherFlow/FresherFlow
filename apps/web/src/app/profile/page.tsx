'use client';

import { useAuth } from '@/contexts/AuthContext';
import { AuthGate, ProfileGate } from '@/components/gates/ProfileGate';
import { useState, useEffect, useRef } from 'react';
import { useProfileForm } from '@/features/profile/hooks/useProfileForm';
import Link from 'next/link';
import toast from 'react-hot-toast';
import ArrowLeftIcon from '@heroicons/react/24/outline/ArrowLeftIcon';
import { useClickOutside } from '@/lib/hooks/useClickOutside';

// Components
import { ProfileStatusCard } from './components/ProfileStatusCard';
import { IdentitySection } from './components/IdentitySection';
import { EducationSection } from './components/EducationSection';
import { SkillsSection } from './components/SkillsSection';
import { PreferencesSection } from './components/PreferencesSection';

// Hooks
import { useProfileUpdateHandlers } from './hooks/useProfileUpdateHandlers';

export default function ProfilePage() {
    const { profile, user, refreshUser } = useAuth();
    const cityRef = useRef<HTMLDivElement>(null);
    const skillRef = useRef<HTMLDivElement>(null);
    const [cityOpen, setCityOpen] = useState(false);
    const [skillOpen, setSkillOpen] = useState(false);
    
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
        availability,
        skills, setSkills,
        cityInput, setCityInput,
        skillInput, setSkillInput,
        filteredSkillOptions,
        filteredCityOptions,
        hydrateFromProfile,
        addSkillValue,
        addSkillFromInput,
        addCityFromInput,
        togglePreferredCity,
    } = useProfileForm(5);

    const formState = {
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
        availability
    };

    const {
        saving,
        editingSection,
        setEditingSection,
        handleIdentityUpdate,
        handleEducationUpdate,
        handlePreferencesUpdate,
        handleReadinessUpdate
    } = useProfileUpdateHandlers(formState, refreshUser as unknown as () => Promise<void>);

    useClickOutside(skillRef, () => setSkillOpen(false));
    useClickOutside(cityRef, () => setCityOpen(false));

    useEffect(() => {
        if (!profile || editingSection) return;
        hydrateFromProfile(profile, user?.fullName || '');
    }, [profile, user?.fullName, editingSection, hydrateFromProfile]);

    const addCity = () => {
        const result = addCityFromInput();
        if (!result.ok && result.reason === 'limit') toast.error('Max 5 cities');
        if (result.ok) setCityOpen(false);
    };

    const pct = profile?.completionPercentage ?? 0;

    return (
        <AuthGate>
            <ProfileGate>
                <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
                    <div className="max-w-6xl mx-auto px-4 md:px-6 py-5 md:py-8 pb-20 font-sans">

                        <div className="hidden md:block mb-4 md:mb-5">
                            <Link href="/dashboard" className="inline-flex p-2 rounded-xl hover:bg-muted transition-colors active:scale-95" aria-label="Back to dashboard">
                                <ArrowLeftIcon className="w-5 h-5 text-muted-foreground" />
                            </Link>
                        </div>

                        {/* Mobile Status Card */}
                        <div className="lg:hidden mb-4">
                            <ProfileStatusCard pct={pct} />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 md:gap-6 items-start">

                            {/* Main Content (Left Col) */}
                            <div className="lg:col-span-8 space-y-5">
                                <IdentitySection
                                    fullName={fullName}
                                    setFullName={setFullName}
                                    email={user?.email}
                                    isEditing={editingSection === 'identity'}
                                    onToggleEdit={() => setEditingSection(editingSection === 'identity' ? null : 'identity')}
                                    onSave={handleIdentityUpdate}
                                    saving={saving === 'identity'}
                                />

                                <EducationSection
                                    profile={profile}
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
                                    isEditing={editingSection === 'education'}
                                    onToggleEdit={() => setEditingSection(editingSection === 'education' ? null : 'education')}
                                    onSave={handleEducationUpdate}
                                    saving={saving === 'education'}
                                />

                                <SkillsSection
                                    profile={profile}
                                    skillInput={skillInput}
                                    setSkillInput={setSkillInput}
                                    skillOpen={skillOpen}
                                    setSkillOpen={setSkillOpen}
                                    filteredSkillOptions={filteredSkillOptions}
                                    skills={skills}
                                    setSkills={setSkills}
                                    addSkill={() => {
                                        const added = addSkillFromInput();
                                        if (added) setSkillOpen(false);
                                    }}
                                    addSkillValue={addSkillValue}
                                    skillRef={skillRef}
                                    isEditing={editingSection === 'skills'}
                                    onToggleEdit={() => setEditingSection(editingSection === 'skills' ? null : 'skills')}
                                    onSave={handleReadinessUpdate}
                                    saving={saving === 'skills'}
                                />
                            </div>

                            {/* Sidebar (Right Col) */}
                            <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-8">
                                <ProfileStatusCard pct={pct} className="hidden lg:flex" />

                                <PreferencesSection
                                    profile={profile}
                                    interestedIn={interestedIn}
                                    toggleInterestedIn={(item) => setInterestedIn(interestedIn.includes(item) ? interestedIn.filter((i: string) => i !== item) : [...interestedIn, item])}
                                    workModes={workModes}
                                    toggleWorkMode={(item) => setWorkModes(workModes.includes(item) ? workModes.filter((i: string) => i !== item) : [...workModes, item])}
                                    preferredCities={preferredCities}
                                    setPreferredCities={setPreferredCities}
                                    cityInput={cityInput}
                                    setCityInput={setCityInput}
                                    cityOpen={cityOpen}
                                    setCityOpen={setCityOpen}
                                    filteredCityOptions={filteredCityOptions}
                                    addCity={addCity}
                                    togglePreferredCity={togglePreferredCity}
                                    cityRef={cityRef}
                                    isEditing={editingSection === 'preferences'}
                                    onToggleEdit={() => setEditingSection(editingSection === 'preferences' ? null : 'preferences')}
                                    onSave={handlePreferencesUpdate}
                                    saving={saving === 'preferences'}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </ProfileGate>
        </AuthGate>
    );
}
