export const WEIGHTS = {
    // Title Signals
    TITLE_FIRST_PREFERENCE: 50, // intern / internship / apprentice / trainee — always target roles
    TITLE_STRICT_FRESHER: 25,   // associate software engineer, graduate, junior, entry level
    TITLE_KEYWORD_FRESHER: 15,  // campus

    // Experience Signals
    EXP_0_1_YEARS: 20,
    EXP_0_2_YEARS: 20,
    
    // Description / Qualification Signals
    DESC_ENTRY_LEVEL: 15,
    DESC_NEW_GRAD: 15,
    DESC_CAMPUS_HIRING: 15,
    DESC_GRADUATE: 10,
    DESC_FRESHER: 10,
    DESC_ASSOCIATE: 8,
    DESC_TRAINEE: 15,      // trainee in description is a strong positive
    DESC_INTERN: 15,       // intern in description is a strong positive
    DESC_APPRENTICE: 15,   // apprentice in description is a strong positive
    DESC_EARLY_CAREER: 8,

    // Negative Experience Signals (that are not blockers)
    EXP_3_5_YEARS: -30,
    EXP_3_PLUS_YEARS: -30,
    EXP_4_PLUS_YEARS: -30,
};
