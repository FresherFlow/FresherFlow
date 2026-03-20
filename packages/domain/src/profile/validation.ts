// @fresherflow/domain — Profile Validation
// Reusable validation logic for both clients and servers.

export interface EducationValidationInput {
    fullName?: string;
    requireFullName?: boolean;
    educationLevel: string;
    tenthYear: string;
    twelfthYear: string;
    gradCourse: string;
    gradSpecialization: string;
    gradYear: string;
    hasPG: boolean;
    pgCourse: string;
    pgSpecialization: string;
    pgYear: string;
}

export interface EducationValidationResult {
    valid: boolean;
    error?: string;
    includePG: boolean;
    years?: {
        tenthYear: number;
        twelfthYear: number;
        gradYear: number;
        pgYear?: number;
    };
}

/**
 * Validates education history for chronological correctness.
 */
export function validateEducationData(input: Partial<EducationValidationInput>): EducationValidationResult {
    const {
        fullName,
        requireFullName,
        educationLevel,
        tenthYear,
        twelfthYear,
        gradCourse,
        gradSpecialization,
        gradYear,
        hasPG,
        pgCourse,
        pgSpecialization,
        pgYear,
    } = input;

    if (requireFullName && !fullName?.trim()) {
        return { valid: false, error: 'Please fill all required fields, including your name', includePG: false };
    }

    if (!tenthYear || !twelfthYear || !educationLevel || !gradCourse || !gradSpecialization || !gradYear) {
        return { valid: false, error: 'Please fill all mandatory education fields', includePG: false };
    }

    const includePG = !!hasPG;
    if (includePG && (!pgCourse || !pgSpecialization || !pgYear)) {
        return { valid: false, error: 'Complete all PG fields or uncheck PG', includePG: false };
    }

    if ([tenthYear, twelfthYear, gradYear].some((y) => y.length !== 4) || (includePG && pgYear!.length !== 4)) {
        return { valid: false, error: 'Years must be 4 digits', includePG };
    }

    const currentYear = new Date().getFullYear();
    const y10 = parseInt(tenthYear, 10);
    const y12 = parseInt(twelfthYear, 10);
    const yGrad = parseInt(gradYear, 10);
    const yPg = includePG ? parseInt(pgYear!, 10) : undefined;
    const yearList = [y10, y12, yGrad, ...(yPg ? [yPg] : [])];
    
    const invalidYear = yearList.some((y) => Number.isNaN(y) || y < 1980 || y > currentYear + 2);
    if (invalidYear || y10 > y12 || y12 > yGrad || (typeof yPg === 'number' && yGrad > yPg)) {
        return { valid: false, error: 'Please enter valid chronological years', includePG };
    }

    return {
        valid: true,
        includePG,
        years: {
            tenthYear: y10,
            twelfthYear: y12,
            gradYear: yGrad,
            ...(typeof yPg === 'number' ? { pgYear: yPg } : {}),
        },
    };
}
