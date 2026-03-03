'use client';

import { Select } from '@/components/ui/Select';

type EducationLevelSelectProps = {
    value: string;
    options: readonly string[];
    onChange: (value: string) => void;
};

const toEducationLabel = (value: string) =>
    value === 'DEGREE' ? 'Undergrad' : value === 'DIPLOMA' ? 'Diploma' : value === 'PG' ? 'Postgrad' : value;

export function EducationLevelSelect({ value, options, onChange }: EducationLevelSelectProps) {
    return (
        <div className="space-y-2">
            <p className="text-sm font-medium text-foreground/90 ml-1">Education Level</p>
            <Select value={value} onChange={(e) => onChange(e.target.value)}>
                <option value="">Select education level</option>
                {options.map((level) => (
                    <option key={level} value={level}>
                        {toEducationLabel(level)}
                    </option>
                ))}
            </Select>
        </div>
    );
}

