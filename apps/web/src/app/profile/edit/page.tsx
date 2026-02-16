'use client';

import { useAuth } from '@/contexts/AuthContext';
import { AuthGate, ProfileGate } from '@/components/gates/ProfileGate';
import { profileApi } from '@/lib/api/client';
import { useState, useEffect } from 'react';

import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import ArrowLeftIcon from '@heroicons/react/24/outline/ArrowLeftIcon';
import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import AcademicCapIcon from '@heroicons/react/24/outline/AcademicCapIcon';
import BoltIcon from '@heroicons/react/24/outline/BoltIcon';
import ArrowPathIcon from '@heroicons/react/24/outline/ArrowPathIcon';
import IdentificationIcon from '@heroicons/react/24/outline/IdentificationIcon';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';

const EDUCATION_LEVELS = ['DIPLOMA', 'DEGREE', 'PG'];
const OPPORTUNITY_TYPES = ['JOB', 'INTERNSHIP', 'WALKIN'];
const WORK_MODES = ['ONSITE', 'HYBRID', 'REMOTE'];
const INDIAN_CITIES = [
    'Bangalore', 'Mumbai', 'Delhi', 'Pune', 'Hyderabad', 'Chennai',
    'Kolkata', 'Ahmedabad', 'Gurugram', 'Noida', 'Chandigarh',
    'Jaipur', 'Kochi', 'Coimbatore', 'Indore', 'Bhopal', 'Lucknow',
    'Visakhapatnam', 'Nagpur', 'Surat', 'Vadodara', 'Mysore',
    'Mangalore', 'Goa', 'Thiruvananthapuram', 'Bhubaneswar',
    'Guwahati', 'Patna', 'Raipur', 'Dehradun'
];
const COMMON_SKILLS = [
    'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL',
    'HTML', 'CSS', 'TypeScript', 'C++', 'C', 'Angular', 'Vue.js',
    'MongoDB', 'PostgreSQL', 'AWS', 'Azure', 'Docker', 'Git',
    'Machine Learning', 'Data Analysis', 'Excel', 'PowerPoint',
    'Communication', 'Teamwork', 'Problem Solving', 'Spring Boot',
    'Django', 'Flask', 'REST API', 'GraphQL', 'Express.js'
];
const AVAILABILITY_OPTIONS = [
    { value: 'IMMEDIATE', label: 'Within 7 Days' },
    { value: 'DAYS_15', label: '15 Days' },
    { value: 'MONTH_1', label: '30 Days' }
];

const DIPLOMA_DEGREES = [
    'Diploma in Computer Science',
    'Diploma in IT',
    'Diploma in Electronics',
    'Diploma in Mechanical',
    'Diploma in Civil',
    'Diploma in Electrical',
    'Diploma in Artificial Intelligence',
    'Other'
];

const UG_DEGREES = [
    'B.Tech / B.E.',
    'B.Sc.',
    'BCA',
    'BBA',
    'B.Com',
    'B.A.',
    'Other'
];

const PG_DEGREES = [
    'M.Tech / M.E.',
    'M.Sc.',
    'MCA',
    'MBA',
    'M.Com',
    'M.A.',
    'Other'
];

const DEGREE_SPECIALIZATIONS: Record<string, string[]> = {
    'B.Tech / B.E.': ['Computer Science', 'Information Technology', 'Electronics & Communication', 'Electrical', 'Mechanical', 'Civil', 'AI & ML', 'Data Science', 'Other'],
    'B.Sc.': ['Computer Science', 'Physics', 'Mathematics', 'Chemistry', 'Information Technology', 'Other'],
    'BCA': ['Software Development', 'Web Applications', 'Database Systems', 'Other'],
    'M.Tech / M.E.': ['Computer Science', 'VLSI Design', 'Structural Engineering', 'Thermo Fluids', 'Cloud Computing', 'Other'],
    'MCA': ['Computer Applications', 'Application Development', 'System Architecture', 'Cloud Tech', 'Other'],
    'MBA': ['Finance', 'Marketing', 'Human Resources', 'Operations', 'Business Analytics', 'Other'],
    'default': ['General', 'Computer Science', 'Business', 'Arts', 'Other']
};

export default function EditProfilePage() {
    const { profile, refreshUser } = useAuth();
    const [saving, setSaving] = useState(false);

    // Form state
    const [educationLevel, setEducationLevel] = useState('');

    // 10th
    const [tenthYear, setTenthYear] = useState('');

    // 12th
    const [twelfthYear, setTwelfthYear] = useState('');

    // Graduation
    const [gradCourse, setGradCourse] = useState('');
    const [gradSpecialization, setGradSpecialization] = useState('');
    const [gradYear, setGradYear] = useState('');

    // PG
    const [hasPG, setHasPG] = useState(false);
    const [pgCourse, setPgCourse] = useState('');
    const [pgSpecialization, setPgSpecialization] = useState('');
    const [pgYear, setPgYear] = useState('');

    const [interestedIn, setInterestedIn] = useState<string[]>([]);
    const [preferredCities, setPreferredCities] = useState<string[]>([]);
    const [workModes, setWorkModes] = useState<string[]>([]);
    const [availability, setAvailability] = useState('');
    const [skills, setSkills] = useState<string[]>([]);
    const [skillInput, setSkillInput] = useState('');
    const [skillFocused, setSkillFocused] = useState(false);
    const [cityInput, setCityInput] = useState('');
    const [cityFocused, setCityFocused] = useState(false);

    // Personal Info
    const [fullName, setFullName] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        if (profile) {
            setEducationLevel(profile.educationLevel || '');
            setTenthYear(profile.tenthYear?.toString() || '');
            setTwelfthYear(profile.twelfthYear?.toString() || '');
            setGradCourse(profile.gradCourse || '');
            setGradSpecialization(profile.gradSpecialization || '');
            setGradYear(profile.gradYear?.toString() || '');

            if (profile.pgCourse) {
                setHasPG(true);
                setPgCourse(profile.pgCourse);
                setPgSpecialization(profile.pgSpecialization || '');
                setPgYear(profile.pgYear?.toString() || '');
            }

            setInterestedIn(profile.interestedIn || []);
            setPreferredCities(profile.preferredCities || []);
            setWorkModes(profile.workModes || []);
            setAvailability(profile.availability || '');
            setSkills(profile.skills || []);
        }
        if (user && user.fullName && !fullName) {
            setFullName(user.fullName);
        }
    }, [profile, user, fullName]);

    const handleIdentityUpdate = async () => {
        if (!fullName) {
            toast.error('Error: Full name is required');
            return;
        }

        setSaving(true);
        const loadingToast = toast.loading('Saving your name...');
        try {
            await profileApi.updateProfile({ fullName });
            await refreshUser();
            toast.success('Name updated.', { id: loadingToast });
            setEditingSection(null);
        } catch (err: unknown) {
            toast.error((err as Error).message || 'Update failed', { id: loadingToast });
        } finally {
            setSaving(false);
        }
    };

    const handleEducationUpdate = async () => {
        if (!tenthYear || !twelfthYear || !educationLevel || !gradCourse || !gradSpecialization || !gradYear) {
            toast.error('Error: Education fields incomplete');
            return;
        }

        if (tenthYear.length !== 4 || twelfthYear.length !== 4 || gradYear.length !== 4 || (hasPG && pgYear && pgYear.length !== 4)) {
            toast.error('Error: Years must be exactly 4 digits');
            return;
        }

        setSaving(true);
        const loadingToast = toast.loading('Saving education details...');
        try {
            await profileApi.updateEducation({
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
            toast.success('Education updated.', { id: loadingToast });
        } catch (err: unknown) {
            toast.error((err as Error).message || 'Update failed', { id: loadingToast });
        } finally {
            setSaving(false);
        }
    };

    const handlePreferencesUpdate = async () => {
        if (interestedIn.length === 0 || preferredCities.length === 0 || workModes.length === 0) {
            toast.error('Error: Preferences incomplete');
            return;
        }

        setSaving(true);
        const loadingToast = toast.loading('Saving preferences...');
        try {
            await profileApi.updatePreferences({ interestedIn, preferredCities, workModes });
            await refreshUser();
            toast.success('Preferences saved.', { id: loadingToast });
        } catch (err: unknown) {
            toast.error((err as Error).message || 'Update failed', { id: loadingToast });
        } finally {
            setSaving(false);
        }
    };

    const handleReadinessUpdate = async () => {
        if (!availability || skills.length === 0) {
            toast.error('Error: Skills & availability required');
            return;
        }

        setSaving(true);
        const loadingToast = toast.loading('Saving readiness...');
        try {
            await profileApi.updateReadiness({ availability, skills });
            await refreshUser();
            toast.success('Readiness updated.', { id: loadingToast });
        } catch (err: unknown) {
            toast.error((err as Error).message || 'Update failed', { id: loadingToast });
        } finally {
            setSaving(false);
        }
    };

    const addSkill = () => {
        if (skillInput.trim() && !skills.includes(skillInput.trim())) {
            setSkills([...skills, skillInput.trim()]);
            setSkillInput('');
        }
    };

    const removeSkill = (skill: string) => setSkills(skills.filter(s => s !== skill));

    const toggleArrayItem = (array: string[], setArray: (arr: string[]) => void, item: string) => {
        setArray(array.includes(item) ? array.filter(i => i !== item) : [...array, item]);
    };

    const addCity = () => {
        if (cityInput.trim() && !preferredCities.includes(cityInput.trim())) {
            if (preferredCities.length >= 5) {
                toast.error('Maximum 5 cities allowed');
                return;
            }
            setPreferredCities([...preferredCities, cityInput.trim()]);
            setCityInput('');
        }
    };

    const removeCity = (city: string) => {
        setPreferredCities(preferredCities.filter(c => c !== city));
    };

    const getSpecializations = (course: string) => {
        return DEGREE_SPECIALIZATIONS[course] || DEGREE_SPECIALIZATIONS['default'];
    };

    const [editingSection, setEditingSection] = useState<string | null>(null);

    return (
        <AuthGate>
            <ProfileGate>
                <div className="max-w-7xl mx-auto px-3 md:px-6 py-4 md:py-6 pb-16 space-y-4 md:space-y-5">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-border">
                        <div className="flex items-center gap-3">
                            <Link href="/dashboard" className="p-2 hover:bg-muted rounded-lg transition-colors group">
                                <ArrowLeftIcon className="w-5 h-5 text-muted-foreground group-hover:text-foreground" />
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight text-foreground">Profile settings</h1>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-500"
                                            style={{ width: `${profile?.completionPercentage}%` }}
                                        />
                                    </div>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                        {profile?.completionPercentage}% Complete
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-1 rounded">
                                ID: {profile?.id?.slice(-8)}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 items-start">
                        {/* Main Content */}
                        <div className="lg:col-span-8 space-y-4 md:space-y-5">

                            {/* Personal Identity Section */}
                            <section className="bg-card rounded-xl border border-border overflow-hidden transition-all shadow-sm">
                                <div className="flex items-center justify-between p-3 md:p-4 border-b border-border bg-muted/30">
                                    <div className="flex items-center gap-3">
                                        <IdentificationIcon className="w-5 h-5 text-primary" />
                                        <h2 className="text-sm font-bold uppercase tracking-wider">Personal Identity</h2>
                                    </div>
                                    <button
                                        onClick={() => setEditingSection(editingSection === 'identity' ? null : 'identity')}
                                        className="text-xs font-bold text-primary hover:underline uppercase tracking-tighter"
                                    >
                                        {editingSection === 'identity' ? 'Cancel' : 'Edit'}
                                    </button>
                                </div>

                                <div className="p-3 md:p-4">
                                    {editingSection === 'identity' ? (
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Full Name</label>
                                                    <input
                                                        type="text"
                                                        value={fullName}
                                                        onChange={(e) => setFullName(e.target.value)}
                                                        className="premium-input h-9! text-sm"
                                                        placeholder="Rahul Sharma"
                                                    />
                                                </div>
                                                <div className="space-y-1.5 opacity-60">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Verified Email</label>
                                                    <input
                                                        type="email"
                                                        value={user?.email || ''}
                                                        disabled
                                                        className="premium-input h-9! text-sm bg-muted cursor-not-allowed"
                                                    />
                                                </div>
                                            </div>
                                            <Button onClick={handleIdentityUpdate} disabled={saving} className="w-full h-9 text-[10px] font-bold uppercase tracking-wider">
                                                {saving ? <ArrowPathIcon className="w-4 h-4 animate-spin mr-2" /> : null}
                                                Update Personal Identity
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 opacity-60">Professional Name</p>
                                                <h3 className="text-base font-bold tracking-tight">{user?.fullName || 'Not set'}</h3>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 opacity-60">Registered System Email</p>
                                                <h3 className="text-base font-bold tracking-tight opacity-50">{user?.email || 'Not set'}</h3>
                                                <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter mt-1">Email cannot be modified for security.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Academic Section */}
                            <section className="bg-card rounded-xl border border-border overflow-hidden transition-all">
                                <div className="flex items-center justify-between p-3 md:p-4 border-b border-border bg-muted/30">
                                    <div className="flex items-center gap-3">
                                        <AcademicCapIcon className="w-5 h-5 text-primary" />
                                        <h2 className="text-sm font-bold uppercase tracking-wider">Academic Foundation</h2>
                                    </div>
                                    <button
                                        onClick={() => setEditingSection(editingSection === 'academic' ? null : 'academic')}
                                        className="text-xs font-bold text-primary hover:underline uppercase tracking-tighter"
                                    >
                                        {editingSection === 'academic' ? 'Cancel' : 'Edit'}
                                    </button>
                                </div>

                                <div className="p-3 md:p-4">
                                    {editingSection === 'academic' ? (
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">10th Year</label>
                                                    <input type="text" maxLength={4} value={tenthYear} onChange={(e) => setTenthYear(e.target.value.replace(/\D/g, ''))} className="premium-input h-9! text-sm" placeholder="Year" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">12th Year</label>
                                                    <input type="text" maxLength={4} value={twelfthYear} onChange={(e) => setTwelfthYear(e.target.value.replace(/\D/g, ''))} className="premium-input h-9! text-sm" placeholder="Year" />
                                                </div>
                                            </div>

                                            <div className="space-y-3 pt-3 border-t border-border">
                                                <div className="space-y-2">
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Highest Level</p>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {EDUCATION_LEVELS.map(level => (
                                                            <button
                                                                key={level}
                                                                type="button"
                                                                onClick={() => setEducationLevel(level)}
                                                                className={cn(
                                                                    "flex-1 py-3 rounded-lg border-2 transition-all flex flex-col items-center gap-1",
                                                                    educationLevel === level ? "bg-primary/5 border-primary text-primary shadow-sm" : "bg-background border-border text-muted-foreground hover:bg-muted"
                                                                )}
                                                            >
                                                                <span className="text-[10px] font-bold uppercase tracking-widest">{level === 'DEGREE' ? 'UG' : level}</span>
                                                                <span className="text-[8px] font-medium opacity-60">
                                                                    {level === 'DIPLOMA' && 'Technical'}
                                                                    {level === 'DEGREE' && 'Undergrad'}
                                                                    {level === 'PG' && 'Postgrad'}
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">UG Course</label>
                                                        <select value={gradCourse} onChange={(e) => { setGradCourse(e.target.value); setGradSpecialization(''); }} className="premium-input h-9! text-sm">
                                                            <option value="">Select</option>
                                                            {(educationLevel === 'DIPLOMA' ? DIPLOMA_DEGREES : educationLevel === 'DEGREE' ? UG_DEGREES : educationLevel === 'PG' ? PG_DEGREES : []).map(d => <option key={d}>{d}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Field</label>
                                                        <select value={gradSpecialization} onChange={(e) => setGradSpecialization(e.target.value)} className="premium-input h-9! text-sm" disabled={!gradCourse}>
                                                            <option value="">Select</option>
                                                            {getSpecializations(gradCourse).map(s => <option key={s}>{s}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">UG Year</label>
                                                        <input type="text" maxLength={4} value={gradYear} onChange={(e) => setGradYear(e.target.value.replace(/\D/g, ''))} className="premium-input h-9! text-sm" placeholder="2024" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t border-border">
                                                <label className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg cursor-pointer hover:bg-muted/60 transition-colors border border-border/50">
                                                    <input type="checkbox" checked={hasPG} onChange={(e) => setHasPG(e.target.checked)} className="w-4 h-4 rounded border-border text-primary" />
                                                    <span className="text-xs font-bold text-foreground">Add Postgraduate (PG) Details</span>
                                                </label>
                                            </div>

                                            {hasPG && (
                                                <div className="space-y-4 pt-4 animate-in slide-in-from-top-2 duration-300">
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">PG Course</label>
                                                            <select value={pgCourse} onChange={(e) => setPgCourse(e.target.value)} className="premium-input h-9! text-sm">
                                                                <option value="">Select</option>
                                                                {PG_DEGREES.map(d => <option key={d}>{d}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Specialization</label>
                                                            <select value={pgSpecialization} onChange={(e) => setPgSpecialization(e.target.value)} className="premium-input h-9! text-sm">
                                                                <option value="">Select</option>
                                                                {getSpecializations(pgCourse).map(s => <option key={s}>{s}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">PG Year</label>
                                                            <input type="text" maxLength={4} value={pgYear} onChange={(e) => setPgYear(e.target.value.replace(/\D/g, ''))} className="premium-input h-9! text-sm" placeholder="2026" />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            <Button onClick={async () => { await handleEducationUpdate(); setEditingSection(null); }} disabled={saving} className="w-full h-10 text-xs font-bold uppercase tracking-wider">
                                                {saving ? <ArrowPathIcon className="w-4 h-4 animate-spin mr-2" /> : null}
                                                Save education
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                                            <div className="space-y-6">
                                                <div>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 opacity-60">Highest Academic Level</p>
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide", profile?.educationLevel ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted text-muted-foreground border border-border")}>
                                                            {profile?.educationLevel === 'DEGREE' ? 'UG' : (profile?.educationLevel || 'Not Specified')}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 opacity-60">Undergraduate Records</p>
                                                    {profile?.gradCourse || profile?.gradYear ? (
                                                        <div className="space-y-1">
                                                            <p className="text-sm font-semibold text-foreground leading-tight">
                                                                {profile.gradCourse}
                                                            </p>
                                                            <p className="text-[11px] text-muted-foreground font-medium">
                                                                {profile.gradSpecialization ? `${profile.gradSpecialization} - ` : ''}
                                                                {profile.gradYear ? `Class of ${profile.gradYear}` : <span className="italic opacity-60">Year missing</span>}
                                                            </p>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 text-muted-foreground/50">
                                                            <div className="w-1 h-1 rounded-full bg-current" />
                                                            <p className="text-xs italic">Awaiting undergraduate data...</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 opacity-60">10th Standard</p>
                                                        <p className={cn("text-sm font-semibold", !profile?.tenthYear && "text-muted-foreground font-normal italic text-xs opacity-50")}>
                                                            {profile?.tenthYear ? `Batch of ${profile.tenthYear}` : 'Not added'}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 opacity-60">12th Standard</p>
                                                        <p className={cn("text-sm font-semibold", !profile?.twelfthYear && "text-muted-foreground font-normal italic text-xs opacity-50")}>
                                                            {profile?.twelfthYear ? `Batch of ${profile.twelfthYear}` : 'Not added'}
                                                        </p>
                                                    </div>
                                                </div>
                                                {profile?.pgCourse || profile?.educationLevel === 'PG' ? (
                                                    <div className="pt-3 border-t border-border/40">
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 opacity-60">Postgraduate Records</p>
                                                        {profile.pgCourse ? (
                                                            <div className="space-y-1">
                                                                <p className="text-sm font-semibold text-foreground leading-tight">
                                                                    {profile.pgCourse}
                                                                </p>
                                                                <p className="text-[11px] text-muted-foreground font-medium">
                                                                    {profile.pgSpecialization ? `${profile.pgSpecialization} - ` : ''}
                                                                    {profile.pgYear ? `Class of ${profile.pgYear}` : <span className="italic opacity-60">Year missing</span>}
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <p className="text-xs text-muted-foreground/50 italic">PG details required for your selected level.</p>
                                                        )}
                                                    </div>
                                                ) : null}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Talent Matrix Section */}
                            <section className="bg-card rounded-xl border border-border overflow-hidden transition-all">
                                <div className="flex items-center justify-between p-3 md:p-4 border-b border-border bg-muted/30">
                                    <div className="flex items-center gap-3">
                                        <BoltIcon className="w-5 h-5 text-primary" />
                                        <h2 className="text-sm font-bold uppercase tracking-wider">Professional Matrix</h2>
                                    </div>
                                    <button
                                        onClick={() => setEditingSection(editingSection === 'talent' ? null : 'talent')}
                                        className="text-xs font-bold text-primary hover:underline uppercase tracking-tighter"
                                    >
                                        {editingSection === 'talent' ? 'Cancel' : 'Edit'}
                                    </button>
                                </div>

                                <div className="p-3 md:p-4">
                                    {editingSection === 'talent' ? (
                                        <div className="space-y-3">
                                            <div className="space-y-3">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Availability</p>
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                                    {AVAILABILITY_OPTIONS.map(opt => (
                                                        <button
                                                            key={opt.value} onClick={() => setAvailability(opt.value)}
                                                            className={cn("h-10 rounded-lg flex flex-col items-center justify-center border-2 transition-all", availability === opt.value ? "border-primary bg-primary/5 text-primary" : "bg-muted/30 border-border text-muted-foreground hover:border-primary/30")}
                                                        >
                                                            <span className="font-bold text-xs">{opt.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-3 pt-3 border-t border-border">
                                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Technical Skills</p>
                                                <div className="relative">
                                                    <div className="flex gap-2">
                                                        <input
                                                            value={skillInput}
                                                            onChange={(e) => setSkillInput(e.target.value)}
                                                            onFocus={() => setSkillFocused(true)}
                                                            onBlur={() => setTimeout(() => setSkillFocused(false), 200)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    e.preventDefault();
                                                                    addSkill();
                                                                }
                                                            }}
                                                            className="premium-input h-9! text-sm"
                                                            placeholder="e.g. React"
                                                        />
                                                        <Button onClick={addSkill} variant="outline" className="shrink-0 px-3 h-9"><PlusIcon className="w-4 h-4" /></Button>
                                                    </div>
                                                    {skillFocused && skillInput && (
                                                        <div className="absolute z-20 w-full mt-2 bg-card border border-border rounded-xl shadow-xl max-h-56 overflow-y-auto">
                                                            {COMMON_SKILLS.filter((skill) =>
                                                                skill.toLowerCase().includes(skillInput.toLowerCase()) &&
                                                                !skills.includes(skill)
                                                            ).slice(0, 10).map((skill) => (
                                                                <button
                                                                    key={skill}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSkills([...skills, skill]);
                                                                        setSkillInput('');
                                                                    }}
                                                                    className="w-full text-left px-4 py-2.5 hover:bg-primary/10 transition-colors text-sm font-medium first:rounded-t-xl last:rounded-b-xl"
                                                                >
                                                                    {skill}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 min-h-6">
                                                    {skills.map(s => (
                                                        <span key={s} className="bg-primary/5 text-primary border border-primary/10 px-2.5 py-1 rounded-md text-[10px] font-bold flex items-center gap-1.5 uppercase tracking-wide">
                                                            {s}
                                                            <XMarkIcon onClick={() => removeSkill(s)} className="w-3 h-3 cursor-pointer opacity-70 hover:opacity-100" />
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>

                                            <Button onClick={async () => { await handleReadinessUpdate(); setEditingSection(null); }} disabled={saving} className="w-full h-9 text-[10px] font-bold uppercase tracking-wider">
                                                {saving ? <ArrowPathIcon className="w-4 h-4 animate-spin mr-2" /> : null}
                                                Save skills
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div>
                                                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Availability Horizon</p>
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 uppercase">
                                                        {AVAILABILITY_OPTIONS.find(o => o.value === availability)?.label || 'Not specified'}
                                                    </span>
                                                </div>
                                                <div className="flex-1 md:max-w-[60%]">
                                                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Validated Skills</p>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {skills.length > 0 ? skills.map(s => (
                                                            <span key={s} className="px-2 py-0.5 bg-muted rounded text-[10px] font-bold text-foreground">
                                                                {s}
                                                            </span>
                                                        )) : <p className="text-xs text-muted-foreground">No skills added yet.</p>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>

                        {/* Sidebar Preferences */}
                        <aside className="lg:col-span-4 space-y-3 lg:sticky lg:top-24">
                            <section className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                                <div className="p-3 border-b border-border bg-muted/20">
                                    <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">Targeting Strategy</h2>
                                </div>
                                <div className="p-3 md:p-4 space-y-3">
                                    <div className="space-y-1.5">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Career Goal</p>
                                        <div className="flex flex-wrap gap-2">
                                            {OPPORTUNITY_TYPES.map(type => (
                                                <button
                                                    key={type}
                                                    onClick={() => toggleArrayItem(interestedIn, setInterestedIn, type)}
                                                    className={cn(
                                                        "px-3 h-8 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all",
                                                        interestedIn.includes(type) ? "bg-primary/10 border-primary text-primary shadow-sm" : "bg-muted/30 border-border text-muted-foreground hover:border-primary/40"
                                                    )}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Work Mode</p>
                                        <div className="flex flex-wrap gap-2">
                                            {WORK_MODES.map(mode => (
                                                <button
                                                    key={mode}
                                                    onClick={() => toggleArrayItem(workModes, setWorkModes, mode)}
                                                    className={cn(
                                                        "px-3 h-8 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all",
                                                        workModes.includes(mode) ? "bg-primary/10 border-primary text-primary shadow-sm" : "bg-muted/30 border-border text-muted-foreground hover:border-primary/40"
                                                    )}
                                                >
                                                    {mode}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider ml-1">Preferred Cities</p>
                                        <div className="space-y-2">
                                            <div className="relative">
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={cityInput}
                                                        onChange={(e) => setCityInput(e.target.value)}
                                                        onFocus={() => setCityFocused(true)}
                                                        onBlur={() => setTimeout(() => setCityFocused(false), 200)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                addCity();
                                                            }
                                                        }}
                                                        className="premium-input h-9! text-[11px] flex-1"
                                                        placeholder="Add city..."
                                                    />
                                                    <Button onClick={addCity} variant="outline" className="shrink-0 px-3 h-9"><PlusIcon className="w-4 h-4" /></Button>
                                                </div>
                                                {cityFocused && cityInput && (
                                                    <div className="absolute z-20 w-full mt-2 bg-card border border-border rounded-xl shadow-xl max-h-56 overflow-y-auto">
                                                        {INDIAN_CITIES.filter((city) =>
                                                            city.toLowerCase().includes(cityInput.toLowerCase()) &&
                                                            !preferredCities.includes(city)
                                                        ).slice(0, 10).map((city) => (
                                                            <button
                                                                key={city}
                                                                type="button"
                                                                onClick={() => {
                                                                    setPreferredCities([...preferredCities, city]);
                                                                    setCityInput('');
                                                                }}
                                                                className="w-full text-left px-4 py-2.5 hover:bg-primary/10 transition-colors text-sm font-medium first:rounded-t-xl last:rounded-b-xl"
                                                            >
                                                                {city}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {preferredCities.map(city => (
                                                    <span key={city} className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-md border border-border text-[10px] font-bold uppercase tracking-tight">
                                                        {city}
                                                        <button onClick={() => removeCity(city)} className="hover:text-destructive transition-colors">
                                                            <XMarkIcon className="w-3 h-3" />
                                                        </button>
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <Button onClick={handlePreferencesUpdate} disabled={saving} className="w-full h-9 text-[10px] font-bold uppercase tracking-wider mt-2">
                                        {saving ? <ArrowPathIcon className="w-3.5 h-3.5 animate-spin mr-2" /> : <CheckIcon className="w-3 h-3 mr-2" />}
                                        Save targets
                                    </Button>
                                </div>
                            </section>

                            <div className="bg-muted/30 p-3 rounded-xl flex items-start gap-3 border border-border/50">
                                <IdentificationIcon className="w-5 h-5 text-primary shrink-0" />
                                <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">
                                    Keeping your profile updated improves match quality. Review your targets regularly.
                                </p>
                            </div>
                        </aside>
                    </div>
                </div>
            </ProfileGate>
        </AuthGate>
    );
}


