import React from 'react';
import { CompactSection, Field } from '@/features/profile/components/ProfileSection';
import { EDUCATION_LEVELS, DIPLOMA_DEGREES, UG_DEGREES, PG_DEGREES, getSpecializations } from '@fresherflow/domain';
import { cn } from '@repo/ui/utils/cn';
import { Profile } from '@fresherflow/types';

interface EducationSectionProps {
    profile?: Profile | null;
    tenthYear: string;
    setTenthYear: (v: string) => void;
    twelfthYear: string;
    setTwelfthYear: (v: string) => void;
    educationLevel: string;
    setEducationLevel: (v: string) => void;
    gradCourse: string;
    setGradCourse: (v: string) => void;
    gradSpecialization: string;
    setGradSpecialization: (v: string) => void;
    gradYear: string;
    setGradYear: (v: string) => void;
    hasPG: boolean;
    setHasPG: (v: boolean) => void;
    pgCourse: string;
    setPgCourse: (v: string) => void;
    pgSpecialization: string;
    setPgSpecialization: (v: string) => void;
    pgYear: string;
    setPgYear: (v: string) => void;
    isEditing: boolean;
    onToggleEdit: () => void;
    onSave: () => void;
    saving: boolean;
}

export const EducationSection = ({
    profile,
    tenthYear,
    setTenthYear,
    twelfthYear,
    setTwelfthYear,
    educationLevel,
    setEducationLevel,
    gradCourse,
    setGradCourse,
    gradSpecialization,
    setGradSpecialization,
    gradYear,
    setGradYear,
    hasPG,
    setHasPG,
    pgCourse,
    setPgCourse,
    pgSpecialization,
    setPgSpecialization,
    pgYear,
    setPgYear,
    isEditing,
    onToggleEdit,
    onSave,
    saving
}: EducationSectionProps) => {
    return (
        <CompactSection
            title="Academic Background"
            onSave={onSave}
            saving={saving}
            isEditing={isEditing}
            onToggleEdit={onToggleEdit}
            viewContent={
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <p className="text-[11px] font-semibold text-muted-foreground capitalize tracking-wider mb-1">Highest Qualification</p>
                            {profile?.gradCourse ? (
                                <div>
                                    <p className="text-sm md:text-base font-semibold">{profile.pgCourse ? profile.pgCourse : profile.gradCourse} <span className="text-[10px] font-bold bg-muted px-1.5 py-0.5 rounded ml-1 text-muted-foreground capitalize">{profile.educationLevel?.toLowerCase()}</span></p>
                                    <p className="text-[13px] text-muted-foreground mt-0.5">
                                        {profile.pgCourse ? profile.pgSpecialization : profile.gradSpecialization} · Class of {profile.pgCourse ? profile.pgYear : profile.gradYear}
                                    </p>
                                </div>
                            ) : <p className="text-sm text-muted-foreground italic">Not added</p>}
                        </div>
                        {profile?.pgCourse && (
                            <div>
                                <p className="text-[11px] font-semibold text-muted-foreground capitalize tracking-wider mb-1">Undergrad Degree</p>
                                <p className="text-sm md:text-base font-semibold">{profile.gradCourse}</p>
                                <p className="text-[13px] text-muted-foreground mt-0.5">{profile.gradSpecialization} · Class of {profile.gradYear}</p>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-8 pt-4 border-t border-border/40">
                        <div>
                            <p className="text-[11px] font-semibold text-muted-foreground capitalize tracking-wider mb-1">10th Class</p>
                            <p className="text-sm md:text-base font-medium">{profile?.tenthYear ? `${profile.tenthYear}` : <span className="text-sm italic opacity-50">Not set</span>}</p>
                        </div>
                        <div>
                            <p className="text-[11px] font-semibold text-muted-foreground capitalize tracking-wider mb-1">12th / Diploma</p>
                            <p className="text-sm md:text-base font-medium">{profile?.twelfthYear ? `${profile.twelfthYear}` : <span className="text-sm italic opacity-50">Not set</span>}</p>
                        </div>
                    </div>
                </div>
            }
        >
            <div className="grid grid-cols-2 gap-4">
                <Field label="10th Passout Year">
                    <input type="text" maxLength={4} value={tenthYear} onChange={e => setTenthYear(e.target.value.replace(/\D/g, ''))} className="premium-input text-sm h-11 md:h-10" placeholder="YYYY" />
                </Field>
                <Field label="12th Passout Year">
                    <input type="text" maxLength={4} value={twelfthYear} onChange={e => setTwelfthYear(e.target.value.replace(/\D/g, ''))} className="premium-input text-sm h-11 md:h-10" placeholder="YYYY" />
                </Field>
            </div>
            <Field label="Qualification Level">
                <div className="flex flex-wrap gap-2">
                    {EDUCATION_LEVELS.map(level => (
                        <button key={level} type="button" onClick={() => setEducationLevel(level)}
                            className={cn('px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all',
                                educationLevel === level ? 'bg-foreground text-background border-foreground shadow' : 'bg-card hover:bg-muted text-muted-foreground border-border')}>
                            {level === 'DEGREE' ? 'Undergrad' : level === 'DIPLOMA' ? 'Diploma' : 'Postgrad'}
                        </button>
                    ))}
                </div>
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Course">
                    <select value={gradCourse} onChange={e => { setGradCourse(e.target.value); setGradSpecialization(''); }} className="premium-input text-sm h-11 md:h-10">
                        <option value="">Select...</option>
                        {(educationLevel === 'DIPLOMA' ? DIPLOMA_DEGREES : educationLevel === 'PG' ? PG_DEGREES : UG_DEGREES).map(d => <option key={d}>{d}</option>)}
                    </select>
                </Field>
                <Field label="Specialization">
                    <select value={gradSpecialization} onChange={e => setGradSpecialization(e.target.value)} className="premium-input text-sm h-11 md:h-10" disabled={!gradCourse}>
                        <option value="">Select...</option>
                        {getSpecializations(gradCourse).map(s => <option key={s}>{s}</option>)}
                    </select>
                </Field>
                <Field label="Passout Year">
                    <input type="text" maxLength={4} value={gradYear} onChange={e => setGradYear(e.target.value.replace(/\D/g, ''))} className="premium-input text-sm h-11 md:h-10" placeholder="YYYY" />
                </Field>
            </div>
            <label className="flex items-center gap-2 mt-2">
                <input type="checkbox" checked={hasPG} onChange={e => setHasPG(e.target.checked)} className="rounded border-border w-4 h-4 text-primary bg-background focus:ring-1 focus:ring-primary shadow-sm" />
                <span className="text-[13px] font-medium text-foreground">Add Postgrad (PG) details</span>
            </label>
            {hasPG && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border/40 animate-in slide-in-from-top-1 duration-200">
                    <Field label="PG Course">
                        <select value={pgCourse} onChange={e => setPgCourse(e.target.value)} className="premium-input text-sm h-11 md:h-10">
                            <option value="">Select...</option>
                            {PG_DEGREES.map(d => <option key={d}>{d}</option>)}
                        </select>
                    </Field>
                    <Field label="Specialization">
                        <select value={pgSpecialization} onChange={e => setPgSpecialization(e.target.value)} className="premium-input text-sm h-11 md:h-10">
                            <option value="">Select...</option>
                            {getSpecializations(pgCourse).map(s => <option key={s}>{s}</option>)}
                        </select>
                    </Field>
                    <Field label="Passout Year">
                        <input type="text" maxLength={4} value={pgYear} onChange={e => setPgYear(e.target.value.replace(/\D/g, ''))} className="premium-input text-sm h-11 md:h-10" placeholder="YYYY" />
                    </Field>
                </div>
            )}
        </CompactSection>
    );
};
