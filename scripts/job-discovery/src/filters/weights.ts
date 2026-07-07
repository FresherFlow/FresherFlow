export const WEIGHTS = {
    // Title Signals
    TITLE_STRICT_FRESHER: 25, // "Associate Software Engineer", "Graduate Trainee", "Junior"
    TITLE_KEYWORD_FRESHER: 15, // Contains "fresher", "intern"

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
    DESC_TRAINEE: 8,
    DESC_EARLY_CAREER: 8,

    // Negative Experience Signals (that are not blockers)
    EXP_3_5_YEARS: -30,
    EXP_3_PLUS_YEARS: -30,
    EXP_4_PLUS_YEARS: -30,
};
