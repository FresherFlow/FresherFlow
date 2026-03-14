import React from 'react';
import { cn } from '@/lib/utils';
import { EDUCATION_LEVELS, DIPLOMA_DEGREES, UG_DEGREES, PG_DEGREES, getSpecializations } from '@/lib/profileConstants';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ArrowPathIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface EducationStepProps {
    fullName: string;
    setFullName: (v: string) => void;
    email?: string;
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
    isLoading: boolean;
    onSubmit: () => void;
}

export const EducationStep = ({
    fullName,
    setFullName,
    email,
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
    isLoading,
    onSubmit
}: EducationStepProps) => {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-3 duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Full Name">
                    <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Rahul Sharma" />
                </Field>
                <Field label="Email (verified)">
                    <Input value={email || ''} disabled className="opacity-50 cursor-not-allowed" />
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

            <Button onClick={onSubmit} disabled={isLoading} className="w-full h-11 font-bold flex items-center justify-center gap-2">
                {isLoading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <>Save & Continue <ArrowRightIcon className="w-4 h-4" /></>}
            </Button>
        </div>
    );
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5 w-full">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</label>
            {children}
        </div>
    );
}
