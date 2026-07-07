import { WEIGHTS } from './weights.js';
import { 
    ScoreResult, 
    Signal, 
    ScoreContribution, 
    DecisionTraceEvent, 
    SectionType, 
    RuleId 
} from './types.js';
import { extractSections } from './parser.js';

const ENGINE_VERSION = "1.2.0";
const WEIGHTS_VERSION = "1.0.0";

export function evaluateTitle(title: string): { contributions: ScoreContribution[], signals: Signal[], trace: DecisionTraceEvent[] } {
    const contributions: ScoreContribution[] = [];
    const signals: Signal[] = [];
    const trace: DecisionTraceEvent[] = [];
    
    const lowerTitle = title.toLowerCase();

    // Strict fresher titles
    const strictTitles = ["associate software engineer", "graduate trainee", "junior", "entry level", "fresher", "graduate software engineer"];
    let matchedStrict = false;
    for (const t of strictTitles) {
        if (lowerTitle.includes(t)) {
            matchedStrict = true;
            signals.push({
                type: 'title',
                section: 'TITLE',
                rule: 'TITLE_STRICT_FRESHER',
                weight: WEIGHTS.TITLE_STRICT_FRESHER,
                matched: t,
                context: title
            });
            contributions.push({ rule: 'TITLE_STRICT_FRESHER', delta: WEIGHTS.TITLE_STRICT_FRESHER, section: 'TITLE' });
            trace.push({ step: 'evaluateTitle', result: 'matched strict', rule: 'TITLE_STRICT_FRESHER', delta: WEIGHTS.TITLE_STRICT_FRESHER });
            break; // Only match one
        }
    }

    // Keyword fresher (if it hasn't already matched strict)
    if (!matchedStrict) {
        if (lowerTitle.includes('intern') || lowerTitle.includes('campus')) {
            signals.push({
                type: 'title',
                section: 'TITLE',
                rule: 'TITLE_KEYWORD_FRESHER',
                weight: WEIGHTS.TITLE_KEYWORD_FRESHER,
                matched: 'intern/campus',
                context: title
            });
            contributions.push({ rule: 'TITLE_KEYWORD_FRESHER', delta: WEIGHTS.TITLE_KEYWORD_FRESHER, section: 'TITLE' });
            trace.push({ step: 'evaluateTitle', result: 'matched keyword', rule: 'TITLE_KEYWORD_FRESHER', delta: WEIGHTS.TITLE_KEYWORD_FRESHER });
        }
    }

    // Senior titles in blockers
    const seniorTitles = ['senior', 'sr.', 'lead', 'manager', 'director', 'principal', 'head', 'vp', 'president', 'chief', 'architect'];
    for (const st of seniorTitles) {
        const stRegex = new RegExp(`\\b${st}\\b`, 'i');
        if (stRegex.test(lowerTitle)) {
            signals.push({
                type: 'title',
                section: 'TITLE',
                rule: 'TITLE_BLOCKER_SENIOR',
                weight: -100, // Effectively a blocker
                matched: st,
                context: title
            });
            contributions.push({ rule: 'TITLE_BLOCKER_SENIOR', delta: -100, section: 'TITLE' });
            trace.push({ step: 'evaluateTitle', result: 'matched blocker', rule: 'TITLE_BLOCKER_SENIOR', delta: -100 });
        }
    }

    return { contributions, signals, trace };
}

function getContext(text: string, index: number, matchLength: number): string {
    const start = Math.max(0, index - 40);
    const end = Math.min(text.length, index + matchLength + 40);
    return text.substring(start, end).replace(/\n/g, ' ').trim();
}

export function evaluateExperience(sectionType: SectionType, text: string): { contributions: ScoreContribution[], signals: Signal[], trace: DecisionTraceEvent[] } {
    const contributions: ScoreContribution[] = [];
    const signals: Signal[] = [];
    const trace: DecisionTraceEvent[] = [];

    const lowerText = text.toLowerCase().replace(/[\u2018\u2019]/g, "'");

    // Positive: 0-1, 0-2 years
    const exp0to2 = /\b0\s*(?:-|–|\bto\b)\s*[12]\s*(?:years?|yrs?|y\b)/gi;
    let match;
    while ((match = exp0to2.exec(lowerText)) !== null) {
        signals.push({
            type: 'experience',
            section: sectionType,
            rule: 'EXP_0_2',
            weight: WEIGHTS.EXP_0_2_YEARS,
            matched: match[0],
            context: getContext(lowerText, match.index, match[0].length)
        });
        contributions.push({ rule: 'EXP_0_2', delta: WEIGHTS.EXP_0_2_YEARS, section: sectionType });
        trace.push({ step: 'evaluateExperience', result: '0-2 years', rule: 'EXP_0_2', delta: WEIGHTS.EXP_0_2_YEARS });
    }

    // Negative (Not blocker, just negative points): 3-5 years (excluding 0, 1, 2)
    const exp3to5 = /(?:[3-9]|\d{2,})\s*(?:-|–|\bto\b)\s*(?:\d+)\s*(?:years?|yrs?|y\b)\s*(?:of\s+)?(?:[a-z']+\s+){0,3}experience/gi;
    while ((match = exp3to5.exec(lowerText)) !== null) {
        if (sectionType === 'ABOUT_COMPANY' || sectionType === 'BENEFITS') continue;
        
        const weight = (sectionType === 'REQUIREMENTS' || sectionType === 'BODY' || sectionType === 'INTRO') ? WEIGHTS.EXP_3_5_YEARS : -10;
        
        signals.push({
            type: 'experience',
            section: sectionType,
            rule: 'EXP_3_5',
            weight,
            matched: match[0],
            context: getContext(lowerText, match.index, match[0].length)
        });
        contributions.push({ rule: 'EXP_3_5', delta: weight, section: sectionType });
        trace.push({ step: 'evaluateExperience', result: '3-5 years', rule: 'EXP_3_5', delta: weight });
    }

    // Negative (Not blocker): 3+ years, 4+ years
    const exp3plus = /(?<!\b[0-2]\s*(?:-|–|\bto\b)\s*)(?:\b[3-4]\b)\s*\+\s*(?:years?|yrs?|y\b)/gi;
    while ((match = exp3plus.exec(lowerText)) !== null) {
        if (sectionType === 'ABOUT_COMPANY' || sectionType === 'BENEFITS') continue;
        
        const weight = (sectionType === 'REQUIREMENTS' || sectionType === 'BODY' || sectionType === 'INTRO') ? WEIGHTS.EXP_3_PLUS_YEARS : -10;

        signals.push({
            type: 'experience',
            section: sectionType,
            rule: 'EXP_3_PLUS',
            weight,
            matched: match[0],
            context: getContext(lowerText, match.index, match[0].length)
        });
        contributions.push({ rule: 'EXP_3_PLUS', delta: weight, section: sectionType });
        trace.push({ step: 'evaluateExperience', result: '3+ years', rule: 'EXP_3_PLUS', delta: weight });
    }

    // Blocker / Strong Negative: 5+ years of experience
    const plusExpRegex = /(?<!\b[0-4]\s*(?:-|–|\bto\b)\s*)(?:\b[5-9]\b|\b\d{2,}\b)\s*\+\s*(?:years?|yrs?|y\b)\s*(?:of\s+)?(?:[a-z']+\s+){0,3}experience/gi;
    while ((match = plusExpRegex.exec(lowerText)) !== null) {
        if (sectionType === 'ABOUT_COMPANY' || sectionType === 'BENEFITS') continue;
        
        const isBlocker = sectionType === 'REQUIREMENTS' || sectionType === 'BODY' || sectionType === 'INTRO';
        const weight = isBlocker ? -100 : -15; // weaker penalty in PREFERRED/RESPONSIBILITIES
        const rule = isBlocker ? 'BLOCKER_EXP_5_PLUS' : 'EXP_3_PLUS';

        signals.push({
            type: 'experience',
            section: sectionType,
            rule,
            weight,
            matched: match[0],
            context: getContext(lowerText, match.index, match[0].length)
        });
        contributions.push({ rule, delta: weight, section: sectionType });
        trace.push({ step: 'evaluateExperience', result: '5+ years', rule, delta: weight });
    }

    // Blocker / Strong Negative: Required Seniority (e.g., minimum 5 years)
    const minExpRegex = /\b(?:minimum|min|at least|requires?|requiring)\s*(?:of\s+)?(?:\b[5-9]\b|\b\d{2,}\b)\s*(?:years?|yrs?|y\b)/gi;
    while ((match = minExpRegex.exec(lowerText)) !== null) {
        if (sectionType === 'ABOUT_COMPANY' || sectionType === 'BENEFITS') continue;
        
        const isBlocker = sectionType === 'REQUIREMENTS' || sectionType === 'BODY' || sectionType === 'INTRO';
        const weight = isBlocker ? -100 : -15;
        const rule = isBlocker ? 'BLOCKER_REQUIRED_SENIORITY' : 'EXP_3_PLUS';

        signals.push({
            type: 'experience',
            section: sectionType,
            rule,
            weight,
            matched: match[0],
            context: getContext(lowerText, match.index, match[0].length)
        });
        contributions.push({ rule, delta: weight, section: sectionType });
        trace.push({ step: 'evaluateExperience', result: 'required seniority', rule, delta: weight });
    }

    return { contributions, signals, trace };
}

export function evaluateDescription(sectionType: SectionType, text: string): { contributions: ScoreContribution[], signals: Signal[], trace: DecisionTraceEvent[] } {
    const contributions: ScoreContribution[] = [];
    const signals: Signal[] = [];
    const trace: DecisionTraceEvent[] = [];

    const lowerText = text.toLowerCase();

    const checkPhrases: { phrase: string, rule: RuleId, weight: number }[] = [
        { phrase: 'entry level', rule: 'DESC_ENTRY_LEVEL', weight: WEIGHTS.DESC_ENTRY_LEVEL },
        { phrase: 'new grad', rule: 'DESC_NEW_GRAD', weight: WEIGHTS.DESC_NEW_GRAD },
        { phrase: 'campus hiring', rule: 'DESC_CAMPUS_HIRING', weight: WEIGHTS.DESC_CAMPUS_HIRING },
        { phrase: 'graduate', rule: 'DESC_GRADUATE', weight: WEIGHTS.DESC_GRADUATE },
        { phrase: 'fresher', rule: 'DESC_FRESHER', weight: WEIGHTS.DESC_FRESHER },
        { phrase: 'early career', rule: 'DESC_EARLY_CAREER', weight: WEIGHTS.DESC_EARLY_CAREER }
    ];

    for (const check of checkPhrases) {
        const idx = lowerText.indexOf(check.phrase);
        if (idx !== -1) {
            signals.push({
                type: 'description',
                section: sectionType,
                rule: check.rule,
                weight: check.weight,
                matched: check.phrase,
                context: getContext(lowerText, idx, check.phrase.length)
            });
            contributions.push({ rule: check.rule, delta: check.weight, section: sectionType });
            trace.push({ step: 'evaluateDescription', result: check.phrase, rule: check.rule, delta: check.weight });
        }
    }

    return { contributions, signals, trace };
}

export function calculateConfidence(
    score: number, 
    positiveSignals: Signal[], 
    negativeSignals: Signal[],
    requirementSignals: Signal[]
): number {
    let conf = 50; // Base confidence
    
    // Density of evidence
    const uniquePositiveRules = new Set(positiveSignals.map(s => s.rule));
    conf += uniquePositiveRules.size * 15; // Max 60 here

    // Bonus for strict requirement signals
    if (requirementSignals.some(s => s.weight > 0)) {
        conf += 15;
    }

    // Penalty for conflicting evidence
    if (negativeSignals.length > 0) {
        conf -= (negativeSignals.length * 25);
    }

    return Math.max(0, Math.min(100, conf));
}

export function scoreJobDescription(title: string, text: string): ScoreResult {
    const trace: DecisionTraceEvent[] = [];
    trace.push({ step: 'init', details: 'Starting evaluation' });

    const { sections, warnings } = extractSections(text);
    trace.push({ step: 'extractSections', details: `Found ${sections.length} sections` });

    let allSignals: Signal[] = [];
    let allContributions: ScoreContribution[] = [];

    // 1. Evaluate Title
    const titleEval = evaluateTitle(title);
    allSignals.push(...titleEval.signals);
    allContributions.push(...titleEval.contributions);
    trace.push(...titleEval.trace);

    // 2. Evaluate Sections
    for (const section of sections) {
        const expEval = evaluateExperience(section.type, section.text);
        allSignals.push(...expEval.signals);
        allContributions.push(...expEval.contributions);
        trace.push(...expEval.trace);

        const descEval = evaluateDescription(section.type, section.text);
        allSignals.push(...descEval.signals);
        allContributions.push(...descEval.contributions);
        trace.push(...descEval.trace);
    }

    // Split signals
    const positive = allSignals.filter(s => s.weight > 0);
    const negative = allSignals.filter(s => s.weight < 0 && s.weight > -100);
    const blockers = allSignals.filter(s => s.weight <= -100);
    const requirementSignals = allSignals.filter(s => s.section === 'REQUIREMENTS');

    let score = 0;
    for (const s of allSignals) score += s.weight;

    let verdict: "HIGH" | "MEDIUM" | "UNKNOWN" | "REJECT" = "UNKNOWN";
    
    let blockingRule: RuleId | undefined;
    if (blockers.length > 0) {
        verdict = "REJECT";
        blockingRule = blockers[0].rule;
        trace.push({ step: 'verdict', result: 'REJECT', details: `Blocker found: ${blockingRule}` });
    } else if (score >= 20) {
        verdict = "HIGH";
        trace.push({ step: 'verdict', result: 'HIGH', details: `Score >= 20` });
    } else if (score > 0) {
        verdict = "MEDIUM";
        trace.push({ step: 'verdict', result: 'MEDIUM', details: `Score > 0` });
    } else if (score === 0) {
        verdict = "UNKNOWN";
        trace.push({ step: 'verdict', result: 'UNKNOWN', details: `Score == 0` });
    } else {
        verdict = "REJECT";
        trace.push({ step: 'verdict', result: 'REJECT', details: `Score < 0` });
    }

    // Calculate confidence based on evidence density
    let confidence = calculateConfidence(score, positive, negative, requirementSignals);
    
    if (blockers.length > 0) {
        confidence = 100; // 100% confident it's a reject
    } else if (verdict === 'UNKNOWN') {
        confidence = 0;
    }

    trace.push({ step: 'confidence', result: `${confidence}%` });

    return {
        score,
        confidence: Math.round(confidence),
        verdict,
        version: {
            engine: ENGINE_VERSION,
            weights: WEIGHTS_VERSION
        },
        decisionTrace: trace,
        contributions: allContributions,
        evidence: {
            positive,
            negative,
            blockers
        },
        metadata: {
            sectionCount: sections.length,
            requirementSignals: requirementSignals.length,
            negativeSignals: negative.length,
            blockingRule,
            parseWarnings: warnings
        }
    };
}
