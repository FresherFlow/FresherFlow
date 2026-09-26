import { AcademicCapIcon } from '@heroicons/react/24/outline';
import { XMarkIcon } from '@heroicons/react/20/solid';
import { SmartInput } from '@/features/admin/ui/SmartInput';
import { SmartTextarea } from '@/features/admin/ui/SmartTextarea';
import { SmartSelect } from '@/features/admin/ui/SmartSelect';
import { Card, CardDescription, CardContent } from '@/ui/Card';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import type { OpportunityFormApi } from '@/features/admin/opportunities/useOpportunityForm';

const getDegreeLabel = (deg: string) => {
    switch (deg) {
        case 'TENTH': return '10th / SSC';
        case 'INTER': return '12th / Intermediate';
        case 'DIPLOMA': return 'Diploma (Specialized)';
        case 'DEGREE': return 'UG (Graduate)';
        case 'PG': return 'PG (Postgrad)';
        default: return deg;
    }
};

const getDegreeBadgeLabel = (deg: string) => {
    switch (deg) {
        case 'TENTH': return '10th';
        case 'INTER': return '12th';
        case 'DIPLOMA': return 'Diploma';
        case 'DEGREE': return 'UG';
        case 'PG': return 'PG';
        default: return deg;
    }
};

export function EligibilitySection({
    form,
    handleDegreeToggle,
    handleCourseToggle,
    handleSpecializationToggle,
    handlePassoutYearsChange,
    commonDegrees,
    visibleCourseOptions,
    visibleSpecializationOptions,
    customDegrees,
}: {
    form: OpportunityFormApi;
    handleDegreeToggle: (deg: string) => void;
    handleCourseToggle: (course: string) => void;
    handleSpecializationToggle: (spec: string) => void;
    handlePassoutYearsChange: (val: string) => void;
    commonDegrees: string[];
    visibleCourseOptions: string[];
    visibleSpecializationOptions: string[];
    customDegrees: string[];
}) {
    const {
        allowedDegrees,
        allowedCourses,
        allowedSpecializations,
        experienceMin, setExperienceMin,
        experienceMax, setExperienceMax,
        passoutYears,
        requiredSkills, setRequiredSkills,
        passoutYearMin, setPassoutYearMin,
        passoutYearMax, setPassoutYearMax,
        allowedAvailability, setAllowedAvailability,
    } = form;
    return (
        <Card>
            <div className="p-4 md:p-5 pb-3 space-y-1">
                <h3 className="flex items-center gap-2 text-sm md:text-base font-semibold text-foreground">
                    <AcademicCapIcon className="w-4 h-4 text-muted-foreground" />
                    Requirements
                </h3>
                <CardDescription>
                    Who can apply: education, experience and skills.
                </CardDescription>
            </div>
            <CardContent className="space-y-5 px-4 md:px-5 pb-4 md:pb-5">
            <div className="flex flex-col gap-2 md:max-w-64">
                <SmartSelect
                    placeholder="Select Education Level"
                    value=""
                    onChange={(val) => {
                        if (val) {
                            handleDegreeToggle(val);
                        }
                    }}
                    options={commonDegrees.map(deg => ({
                        label: getDegreeLabel(deg),
                        value: deg
                    }))}
                />
                {allowedDegrees.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {allowedDegrees.map(deg => (
                            <Badge key={deg} variant="default">
                                <span className="flex items-center gap-1 normal-case">
                                    {getDegreeBadgeLabel(deg)}
                                    <button
                                        type="button"
                                        onClick={() => handleDegreeToggle(deg)}
                                        aria-label={`Remove ${getDegreeBadgeLabel(deg)}`}
                                        className="flex items-center rounded-full p-0.5 transition-colors hover:bg-primary-foreground/20"
                                    >
                                        <XMarkIcon className="w-3 h-3" />
                                    </button>
                                </span>
                            </Badge>
                        ))}
                    </div>
                )}
                {customDegrees.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {customDegrees.map((degree) => (
                            <Badge key={degree} variant="outline">
                                <span className="normal-case">{degree}</span>
                            </Badge>
                        ))}
                    </div>
                )}
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
                                    aria-pressed={allowedCourses.includes(course)}
                                    className={`h-7 rounded-md px-2.5 text-xs font-medium transition-colors border ${allowedCourses.includes(course)
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
                                    aria-pressed={allowedSpecializations.includes(specialization)}
                                    className={`h-7 rounded-md px-2.5 text-xs font-medium transition-colors border ${allowedSpecializations.includes(specialization)
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

                placeholder="E.g. React, Node.js, strong communication skills..."
            />
            </CardContent>
        </Card>
    );
}
