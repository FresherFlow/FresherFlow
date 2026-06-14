import { AcademicCapIcon } from '@heroicons/react/24/outline';
import { SmartInput } from '@/features/admin/ui/SmartInput';
import { SmartTextarea } from '@/features/admin/ui/SmartTextarea';
import { SmartSelect } from '@/features/admin/ui/SmartSelect';

interface EligibilitySectionProps {
    allowedDegrees: string[];
    handleDegreeToggle: (deg: string) => void;
    allowedCourses: string[];
    handleCourseToggle: (course: string) => void;
    allowedSpecializations: string[];
    handleSpecializationToggle: (spec: string) => void;
    experienceMin: string;
    setExperienceMin: (val: string) => void;
    experienceMax: string;
    setExperienceMax: (val: string) => void;
    passoutYears: number[];
    handlePassoutYearsChange: (val: string) => void;
    requiredSkills: string;
    setRequiredSkills: (val: string) => void;
    passoutYearMin: string;
    setPassoutYearMin: (val: string) => void;
    passoutYearMax: string;
    setPassoutYearMax: (val: string) => void;
    allowedAvailability: string;
    setAllowedAvailability: (val: string) => void;
    commonDegrees: string[];
    visibleCourseOptions: string[];
    visibleSpecializationOptions: string[];
    customDegrees: string[];
}

export function EligibilitySection({
    allowedDegrees, handleDegreeToggle,
    allowedCourses, handleCourseToggle,
    allowedSpecializations, handleSpecializationToggle,
    experienceMin, setExperienceMin,
    experienceMax, setExperienceMax,
    passoutYears, handlePassoutYearsChange,
    requiredSkills, setRequiredSkills,
    passoutYearMin, setPassoutYearMin,
    passoutYearMax, setPassoutYearMax,
    allowedAvailability, setAllowedAvailability,
    commonDegrees,
    visibleCourseOptions,
    visibleSpecializationOptions,
    customDegrees
}: EligibilitySectionProps) {
    return (
        <div className="space-y-5 border border-border rounded-lg p-4 md:p-5 bg-card shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                <h3 className="text-sm md:text-base font-semibold text-foreground flex items-center gap-2">
                    <AcademicCapIcon className="w-4 h-4 text-muted-foreground" />
                    Requirements
                </h3>
                <div className="flex flex-col gap-2 md:w-64">
                    <SmartSelect
                        placeholder="Select Education Level"
                        value=""
                        onChange={(val) => {
                            if (val) {
                                handleDegreeToggle(val);
                            }
                        }}
                        options={commonDegrees.map(deg => ({
                            label: `${allowedDegrees.includes(deg) ? '✓ ' : ''}${deg === 'DEGREE' ? 'UG (Graduate)' : deg === 'PG' ? 'PG (Postgrad)' : 'Diploma (Specialized)'}`,
                            value: deg
                        }))}
                    />
                    {allowedDegrees.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 justify-end">
                            {allowedDegrees.map(deg => (
                                <span key={deg} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-primary text-primary-foreground">
                                    {deg === 'DEGREE' ? 'UG' : deg}
                                    <button type="button" onClick={() => handleDegreeToggle(deg)} className="hover:text-red-200 ml-0.5">×</button>
                                </span>
                            ))}
                        </div>
                    )}
                    {customDegrees.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 justify-end pt-1">
                            {customDegrees.map((degree) => (
                                <span key={degree} className="px-2 py-0.5 rounded-md text-xs font-semibold border bg-primary/5 text-primary border-primary/20">
                                    {degree}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-5 pb-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-muted-foreground/80 flex items-center gap-1.5">
                            Courses
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {visibleCourseOptions.map((course) => (
                                <button
                                    key={course}
                                    type="button"
                                    onClick={() => handleCourseToggle(course)}
                                    className={`px-2 py-1 rounded-sm text-sm font-medium transition-none border ${allowedCourses.includes(course)
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-background border-input text-foreground hover:bg-muted'
                                        }`}
                                >
                                    {course}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-medium text-muted-foreground/80 flex items-center gap-1.5">
                            Specializations
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {visibleSpecializationOptions.map((specialization) => (
                                <button
                                    key={specialization}
                                    type="button"
                                    onClick={() => handleSpecializationToggle(specialization)}
                                    className={`px-2 py-1 rounded-sm text-sm font-medium transition-none border ${allowedSpecializations.includes(specialization)
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-background border-input text-foreground hover:bg-muted'
                                        }`}
                                >
                                    {specialization}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="grid grid-cols-2 gap-3 md:col-span-2">
                    <SmartInput
                        label="Min Exp (Yrs)"
                        value={experienceMin}
                        type="number"
                        step="0.1"
                        min="0"
                        onChange={(e) => setExperienceMin(e.target.value)}
                        placeholder="0"
                    />
                    <SmartInput
                        label="Max Exp (Yrs)"
                        value={experienceMax}
                        type="number"
                        step="0.1"
                        min="0"
                        onChange={(e) => setExperienceMax(e.target.value)}
                        placeholder="3"
                    />
                </div>
                <SmartInput
                    label="Passout years"
                    value={passoutYears.join(', ')}
                    onChange={(e) => handlePassoutYearsChange(e.target.value)}
                    placeholder="e.g. 2024, 2025"
                />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pb-1">
                <SmartInput
                    label="Min Passout Year"
                    value={passoutYearMin}
                    type="number"
                    onChange={(e) => setPassoutYearMin(e.target.value)}
                    placeholder="e.g. 2020"
                />
                <SmartInput
                    label="Max Passout Year"
                    value={passoutYearMax}
                    type="number"
                    onChange={(e) => setPassoutYearMax(e.target.value)}
                    placeholder="e.g. 2025"
                />
                <SmartInput
                    label="Allowed Availability"
                    value={allowedAvailability}
                    type="text"
                    onChange={(e) => setAllowedAvailability(e.target.value)}
                    placeholder="e.g. FULL_TIME, INTERN"
                />
            </div>

            <SmartTextarea
                label="Skills & Requirements"
                value={requiredSkills}
                onChange={(e) => setRequiredSkills(e.target.value)}
                rows={4}
                className="pt-2"
                placeholder="E.g. React, Node.js, strong communication skills..."
            />
        </div>
    );
}
