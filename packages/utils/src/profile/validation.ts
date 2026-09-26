// @fresherflow/utils — Profile Validation
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
    includeGrad: boolean;
    includePG: boolean;
    years?: {
        tenthYear: number;
        twelfthYear?: number;
        gradYear?: number;
        pgYear?: number;
    };
}

/** Levels that carry a degree/diploma course, specialization and passout year. */
const GRAD_LEVELS = ['DIPLOMA', 'DEGREE', 'PG'];

/**
 * Validates education history for chronological correctness.
 *
 * Required fields follow the highest level: 10th passouts only answer their
 * 10th year, INTER adds the 12th year, DIPLOMA/DEGREE/PG add the course set,
 * and PG adds the PG set. Asking a 10th passout for a graduation year would
 * force a fake entry, so anything inapplicable is neither required nor saved.
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
        return { valid: false, error: 'Please fill all required fields, including your name', includeGrad: false, includePG: false };
    }

    if (!educationLevel || !tenthYear) {
        return { valid: false, error: 'Please fill all mandatory education fields', includeGrad: false, includePG: false };
    }

    const needsTwelfth = educationLevel !== 'TENTH';
    if (needsTwelfth && !twelfthYear) {
        return { valid: false, error: 'Please fill all mandatory education fields', includeGrad: false, includePG: false };
    }

    const includeGrad = GRAD_LEVELS.includes(educationLevel ?? '');
    if (includeGrad && (!gradCourse || !gradSpecialization || !gradYear)) {
        return { valid: false, error: 'Please fill all mandatory education fields', includeGrad: false, includePG: false };
    }

    const includePG = !!hasPG;
    if (includePG && (!pgCourse || !pgSpecialization || !pgYear)) {
        return { valid: false, error: 'Complete all PG fields or uncheck PG', includeGrad, includePG: false };
    }

    const yearStrings = [tenthYear, ...(needsTwelfth && twelfthYear ? [twelfthYear] : []), ...(includeGrad && gradYear ? [gradYear] : [])];
    if (yearStrings.some((y) => y.length !== 4) || (includePG && pgYear!.length !== 4)) {
        return { valid: false, error: 'Years must be 4 digits', includeGrad, includePG };
    }

    const currentYear = new Date().getFullYear();
    const y10 = parseInt(tenthYear, 10);
    const y12 = needsTwelfth ? parseInt(twelfthYear!, 10) : undefined;
    const yGrad = includeGrad ? parseInt(gradYear!, 10) : undefined;
    const yPg = includePG ? parseInt(pgYear!, 10) : undefined;
    const yearList = [y10, ...(y12 === undefined ? [] : [y12]), ...(yGrad === undefined ? [] : [yGrad]), ...(yPg === undefined ? [] : [yPg])];

    const invalidYear = yearList.some((y) => Number.isNaN(y) || y < 1980 || y > currentYear + 2);
    const inOrder =
        (y12 === undefined || y10 <= y12) &&
        (yGrad === undefined || (y12 === undefined ? y10 <= yGrad : y12 <= yGrad)) &&
        (yPg === undefined || (yGrad !== undefined && yGrad <= yPg));
    if (invalidYear || !inOrder) {
        return { valid: false, error: 'Please enter valid chronological years', includeGrad, includePG };
    }

    return {
        valid: true,
        includeGrad,
        includePG,
        years: {
            tenthYear: y10,
            ...(y12 === undefined ? {} : { twelfthYear: y12 }),
            ...(yGrad === undefined ? {} : { gradYear: yGrad }),
            ...(yPg === undefined ? {} : { pgYear: yPg }),
        },
    };
}
