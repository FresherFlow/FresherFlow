import { Section, SectionType, ParseWarning } from './types.js';

const SECTION_ALIASES: Record<SectionType, string[]> = {
    INTRO: [], // Implicit
    BODY: [], // Implicit
    REQUIREMENTS: [
        "minimum qualifications", "requirements", "what you need", "what you'll need", 
        "basic qualifications", "must have", "experience required", "who you are", 
        "required skills", "qualifications", "what we are looking for", "what we're looking for"
    ],
    PREFERRED: [
        "preferred qualifications", "nice to have", "bonus points", "desired skills", "preferred skills"
    ],
    RESPONSIBILITIES: [
        "responsibilities", "what you will do", "what you'll do", "your role", "day in the life", "what you can expect"
    ],
    ABOUT_COMPANY: [
        "about us", "who we are", "company overview", "the team", "about the company", "about the team"
    ],
    BENEFITS: [
        "benefits", "perks", "what we offer", "why join us"
    ]
};

export function extractSections(text: string): { sections: Section[], warnings: ParseWarning[] } {
    const lines = text.split('\n');
    const sections: Section[] = [];
    const warnings: ParseWarning[] = [];
    
    let currentSectionType: SectionType = "INTRO";
    let currentHeading = "Intro";
    let currentText = "";
    let startOffset = 0;
    
    let offsetCounter = 0;

    for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i];
        const lineLen = rawLine.length + 1; // +1 for newline
        const trimmed = rawLine.trim();
        const lower = trimmed.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[^a-z0-9\s']/g, ' ').replace(/\s+/g, ' ').trim().trim();
        
        let foundHeader: SectionType | null = null;
        let matchedHeading = "";

        // Only consider short lines as potential headers
        if (trimmed.length > 0 && trimmed.length < 60) {
            // Pass 1: exact match
            for (const [sType, aliases] of Object.entries(SECTION_ALIASES)) {
                if (sType === "INTRO" || sType === "BODY") continue;
                for (const alias of aliases as string[]) {
                    if (lower === alias) {
                        foundHeader = sType as SectionType;
                        matchedHeading = trimmed;
                        break;
                    }
                }
                if (foundHeader) break;
            }

            // Pass 2: startsWith or endsWith (longest aliases first would be better, but we can just check if we didn't find an exact match)
            if (!foundHeader) {
                // To avoid "preferred qualifications" matching "qualifications", let's check PREFERRED before REQUIREMENTS, 
                // but more generally we should avoid endsWith matching a shorter alias when a longer one exists.
                // A simpler fix: don't use endsWith. Usually headers are exact or start with the alias.
                for (const [sType, aliases] of Object.entries(SECTION_ALIASES)) {
                    if (sType === "INTRO" || sType === "BODY") continue;
                    for (const alias of aliases as string[]) {
                        if (lower.startsWith(alias + " ") || lower.startsWith(alias + ":") || lower === alias) {
                            foundHeader = sType as SectionType;
                            matchedHeading = trimmed;
                            break;
                        }
                    }
                    if (foundHeader) break;
                }
            }
        }

        if (foundHeader) {
            // Save previous section
            if (currentText.trim().length > 0) {
                sections.push({
                    type: currentSectionType,
                    heading: currentHeading,
                    startOffset,
                    endOffset: offsetCounter,
                    text: currentText.trim()
                });
            }
            // Start new section
            currentSectionType = foundHeader;
            currentHeading = matchedHeading;
            currentText = "";
            startOffset = offsetCounter;
        } else {
            currentText += rawLine + "\n";
        }

        offsetCounter += lineLen;
    }

    // Push the last section
    if (currentText.trim().length > 0) {
        sections.push({
            type: currentSectionType,
            heading: currentHeading,
            startOffset,
            endOffset: offsetCounter,
            text: currentText.trim()
        });
    }

    if (sections.length === 1) {
        warnings.push("NO_HEADERS_FOUND");
        // If no headers found, we treat it as a BODY section rather than INTRO to be safe
        sections[0].type = "BODY";
        sections[0].heading = "Body";
    }

    return { sections, warnings };
}
