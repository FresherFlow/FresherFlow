

export const formatSalary = (salary: { min?: number; max?: number; currency?: string } | null | undefined) => {
    if (!salary) return 'Not disclosed';
    const { min, max } = salary;
    if (min && max) {
        return `₹${(min / 100000).toFixed(1)}L - ${(max / 100000).toFixed(1)}L`;
    }
    return 'Not disclosed';
};

export const formatExperience = (range: { min: number; max: number }) => {
    const { min, max } = range;
    if (min === 0 && max === 0) return 'Fresher';
    if (min === max) return `${min} year${min !== 1 ? 's' : ''}`;
    return `${min}-${max} years`;
};

export const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
};

