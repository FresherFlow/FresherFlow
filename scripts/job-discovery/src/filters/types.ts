export type SectionType = 
    | "INTRO" 
    | "REQUIREMENTS" 
    | "PREFERRED" 
    | "RESPONSIBILITIES" 
    | "ABOUT_COMPANY" 
    | "BENEFITS"
    | "BODY"; // Parsed content that isn't a recognized section (replaces UNKNOWN)

export type RuleId = 
    | "TITLE_STRICT_FRESHER"
    | "TITLE_KEYWORD_FRESHER"
    | "TITLE_BLOCKER_SENIOR"
    | "EXP_0_2"
    | "EXP_3_5"
    | "BLOCKER_EXP_3_5"
    | "EXP_3_PLUS"
    | "BLOCKER_EXP_5_PLUS"
    | "EXP_PLUS"
    | "BLOCKER_EXP_PLUS"
    | "BLOCKER_REQUIRED_SENIORITY"
    | "REQUIRED_SENIORITY"
    | "DESC_ENTRY_LEVEL"
    | "DESC_NEW_GRAD"
    | "DESC_CAMPUS_HIRING"
    | "DESC_GRADUATE"
    | "DESC_FRESHER"
    | "DESC_EARLY_CAREER"
    | "DESC_ASSOCIATE"
    | "DESC_TRAINEE";

export type ParseWarning = 
    | "NO_HEADERS_FOUND"
    | "UNMATCHED_ALIAS";

export interface Section {
    type: SectionType;
    heading: string;
    startOffset: number;
    endOffset: number;
    text: string;
}

export interface ScoreContribution {
    rule: RuleId;
    delta: number;
    section: SectionType | "TITLE";
}

export interface Signal {
    type: "title" | "experience" | "qualification" | "description";
    section: SectionType | "TITLE";
    rule: RuleId;
    weight: number;
    matched: string;
    context: string;
}

export interface DecisionTraceEvent {
    step: string;
    result?: string;
    rule?: RuleId;
    delta?: number;
    details?: string;
}

export interface ScoreResult {
    score: number;
    confidence: number;
    verdict: "HIGH" | "MEDIUM" | "UNKNOWN" | "REJECT";
    version: {
        engine: "1.2.0";
        weights: "1.0.0";
    };
    decisionTrace: DecisionTraceEvent[];
    contributions: ScoreContribution[];
    evidence: {
        positive: Signal[];
        negative: Signal[];
        blockers: Signal[];
    };
    metadata: {
        sectionCount: number;
        requirementSignals: number;
        negativeSignals: number;
        blockingRule?: RuleId;
        parseWarnings: ParseWarning[];
    };
}
