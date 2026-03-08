import nlp from 'compromise';
import * as natural from 'natural';
import { City } from 'country-state-city';

export interface ParsedSignature {
    company?: string;
    title?: string;
    locations: string[];
    skills: string[];
    type: 'JOB' | 'INTERNSHIP' | 'WALKIN';
    allowedPassoutYears: number[];
    isFresherOnly: boolean;
    allowedDegrees: string[];
    isRemote: boolean;
    jobFunction?: string;
    incentives?: string;
    salaryPeriod?: 'MONTHLY' | 'YEARLY';
    salaryMin?: number;
    salaryMax?: number;
    experienceMin?: number;
    experienceMax?: number;
    dateRange?: string;
    timeRange?: string;
    venueLink?: string;
    venueAddress?: string;
    expiresAt?: string;
}

export class ParserService {
    private static tfidf = new natural.TfIdf();
    private static stopWords = ['requirements', 'eligibility', 'apply', 'link', 'official', 'company', 'hiring', 'salary', 'posted', 'openings', 'applicants', 'save', 'interested', 'reviews', 'match', 'score', 'early', 'applicant', 'follow', 'stay', 'updated', 'logo', 'send', 'jobs', 'like', 'this', 'highlights', 'perks', 'benefits', 'details', 'responsibilities', 'description', 'carry', 'resume', 'aadhar', 'card', 'mention', 'coming', 'festive', 'dates', 'saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
    private static genericTitles = ['associate', 'senior', 'junior', 'lead', 'trainee', 'representative', 'specialist', 'analyst', 'candidate', 'associate senior', 'immediate joiner'];
    private static commonSkills = ['react', 'node.js', 'aws', 'python', 'java', 'javascript', 'sql', 'itil', 'active directory', 'itsm', 'service desk', 'troubleshooting', 'vpn', 'networking', 'customer support', 'voice process', 'technical support', 'service-now', 'o365', 'outlook', 'windows os', 'bmc remedy', 'hpsm', 'ca service desk', 'citrix', 'exchange support', 'sccm', 'antivirus', 'itil processes'];
    private static monthIndex: Record<string, number> = {
        jan: 0, january: 0,
        feb: 1, february: 1,
        mar: 2, march: 2,
        apr: 3, april: 3,
        may: 4,
        jun: 5, june: 5,
        jul: 6, july: 6,
        aug: 7, august: 7,
        sep: 8, sept: 8, september: 8,
        oct: 9, october: 9,
        nov: 10, november: 10,
        dec: 11, december: 11,
    };

    private static toLocalInputString(date: Date): string {
        const tzOffset = date.getTimezoneOffset() * 60000;
        const local = new Date(date.getTime() - tzOffset);
        return local.toISOString().slice(0, 16);
    }

    private static parseDayMonth(input: string): Date | null {
        const cleaned = input.trim().replace(/(\d+)(st|nd|rd|th)/gi, '$1');
        const match = cleaned.match(/(\d{1,2})\s+([a-zA-Z]{3,9})(?:\s+(\d{4}))?/);
        if (!match) return null;
        const day = Number(match[1]);
        const monthKey = match[2].toLowerCase();
        const month = this.monthIndex[monthKey];
        if (!Number.isFinite(day) || month === undefined) return null;
        const now = new Date();
        const year = match[3] ? Number(match[3]) : now.getFullYear();
        const date = new Date(year, month, day, 23, 59, 0, 0);
        // If year not provided and this date already passed by > 14 days, assume next year.
        if (!match[3]) {
            const threshold = new Date();
            threshold.setDate(threshold.getDate() - 14);
            if (date < threshold) date.setFullYear(year + 1);
        }
        return date;
    }

    private static extractExpiryFromText(text: string): string | undefined {
        const patterns = [
            /(?:apply\s*by|last\s*date(?:\s*to\s*apply)?|deadline)\s*[:\-]?\s*(\d{1,2}(?:st|nd|rd|th)?\s+[a-zA-Z]{3,9}(?:\s+\d{4})?)/i,
            /(?:apply\s*before)\s*[:\-]?\s*(\d{1,2}(?:st|nd|rd|th)?\s+[a-zA-Z]{3,9}(?:\s+\d{4})?)/i,
            /(?:apply\s*by|last\s*date|deadline)\s*[:\-]?\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (!match) continue;
            const raw = match[1];
            if (/\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/.test(raw)) {
                const normalized = raw.replace(/-/g, '/');
                const parts = normalized.split('/').map((v) => Number(v));
                if (parts.length === 3) {
                    const [d, m, y] = parts;
                    const year = y < 100 ? 2000 + y : y;
                    const date = new Date(year, m - 1, d, 23, 59, 0, 0);
                    if (!Number.isNaN(date.getTime())) return this.toLocalInputString(date);
                }
                continue;
            }
            const parsed = this.parseDayMonth(raw);
            if (parsed) return this.toLocalInputString(parsed);
        }
        return undefined;
    }

    private static splitMergedWords(text: string): string[] {
        // Handle merged words like "TechnicalSupport" or "TicketingTools"
        // Also handle "Technical SupportInternational"
        let cleaned = text.replace(/([a-z])([A-Z][a-z])/g, '$1 $2');
        cleaned = cleaned.replace(/([a-zA-Z])([A-Z][a-z])/g, '$1 $2');
        // Handle "TechnicalSupport" where both are cap
        cleaned = cleaned.replace(/([A-Z][a-z]+)([A-Z][a-z]+)/g, '$1 $2');
        return cleaned.split(/\s+/).filter(w => w.length > 0);
    }

    /**
     * Main entry point to parse raw job text
     */
    static parse(text: string): ParsedSignature {
        const doc = nlp(text);
        const textLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const textLower = text.toLowerCase();

        // 1. Extract Title (Usually first significant line)
        let title: string | undefined;
        if (textLines.length > 0) {
            // Find first line that isn't just a company name or "Mega Walkin Drive"
            for (const line of textLines) {
                if (line.length > 10 && !line.toLowerCase().includes('posted') && !line.toLowerCase().includes('reviews')) {
                    title = line.replace(/Mega Walkin Drive-?\s*/i, '').trim();
                    break;
                }
            }
        }

        // 2. Extract Locations (Handle Pan India + verify cities)
        const rawLocations = doc.places().out('array') as string[];
        let locations: string[] = [];

        if (textLower.includes('pan india') || textLower.includes('across india') || textLower.includes('anywhere in india')) {
            locations = ['Pan India'];
        } else {
            const validLocations = rawLocations.filter(loc => {
                const cityName = loc.trim();
                return City.getCitiesOfCountry('IN')?.some(c =>
                    c.name.toLowerCase() === cityName.toLowerCase()
                );
            });
            // Fallback: search for common cities if nlp missed them
            const commonCities = ['Hyderabad', 'Bangalore', 'Mumbai', 'Delhi', 'Pune', 'Chennai', 'Gurgaon', 'Noida'];
            for (const city of commonCities) {
                if (text.includes(city) && !locations.includes(city)) {
                    locations.push(city);
                }
            }
            if (locations.length === 0) locations = validLocations.length > 0 ? validLocations : rawLocations;
        }

        // 3. Determine Type
        let type: 'JOB' | 'INTERNSHIP' | 'WALKIN' = 'JOB';
        if (textLower.includes('walkin') || textLower.includes('walk-in') || textLower.includes('drive') || textLower.includes('venue')) {
            type = 'WALKIN';
        } else if (textLower.includes('internship') || textLower.includes('stipend')) {
            type = 'INTERNSHIP';
        }

        // 4. Extract Company
        const organizations = doc.organizations().out('array');
        let company = organizations.length > 0 ? organizations[0] : undefined;
        // Search for Tech Mahindra specifically or other giants if missed
        const giants = ['Tech Mahindra', 'TCS', 'Infosys', 'Wipro', 'Accenture', 'Cognizant', 'HCL'];
        for (const g of giants) {
            if (text.toLowerCase().includes(g.toLowerCase())) {
                company = g;
                break;
            }
        }

        // 5. Extract Years (Passout)
        const yearRegex = /\b(202[0-9]|20[0-2][0-9])\b/g;
        const foundYears = text.match(yearRegex) || [];
        const allowedPassoutYears = Array.from(new Set(foundYears.map(y => parseInt(y))));

        const isFresherOnly = textLower.includes('fresher') || textLower.includes('freshers');

        // 6. Education Levels
        const allowedDegrees: string[] = [];
        if (/\b(diploma)\b/i.test(text)) allowedDegrees.push('DIPLOMA');
        if (/\b(bachelor|degree|b\.?tech|b\.?e|bsc|b\.?sc|bcom|b\.?com|graduation)\b/i.test(text)) allowedDegrees.push('DEGREE');
        if (/\b(master|pg|post.?graduate|m\.?tech|m\.?e|mca|mba)\b/i.test(text)) allowedDegrees.push('PG');

        // 7. Extra Fields
        let jobFunction: string | undefined;
        const functionKeywords = ['banking', 'sales', 'engineering', 'finance', 'marketing', 'hr', 'support', 'operations', 'customer success'];
        for (const kw of functionKeywords) {
            if (textLower.includes(kw)) {
                jobFunction = kw.charAt(0).toUpperCase() + kw.slice(1);
                break;
            }
        }

        let incentives: string | undefined;
        const incentiveMatch = text.match(/incentives?\s*(?:up to|of)?\s*(?:rs\.?)?\s*([\d,]+(?:\s*to\s*[\d,]+)?)/i);
        if (incentiveMatch) {
            incentives = `Rs. ${incentiveMatch[1]}`;
        }

        let salaryPeriod: 'MONTHLY' | 'YEARLY' = 'YEARLY';
        if (textLower.includes('per month') || textLower.includes('pm') || textLower.includes('/ month') || textLower.includes('monthly')) {
            salaryPeriod = 'MONTHLY';
        }

        // Experience Extraction
        let experienceMin: number | undefined;
        let experienceMax: number | undefined;
        const expMatch = text.match(/(\d+)\s*(?:-|to)\s*(\d+)\s*(?:year|yr)s?/i);
        if (expMatch) {
            experienceMin = parseInt(expMatch[1]);
            experienceMax = parseInt(expMatch[2]);
        } else {
            const minOnlyMatch = text.match(/(\d+)\+?\s*(?:year|yr)s?\s*(?:exp|experience)/i);
            if (minOnlyMatch) {
                experienceMin = parseInt(minOnlyMatch[1]);
            }
        }

        // Salary Extraction (handle Lacs / LPA / P.A.)
        let salaryMin: number | undefined;
        let salaryMax: number | undefined;
        const salaryMatch = text.match(/([\d.]+)\s*(?:-|to)\s*([\d.]+)\s*(?:Lac|Lacs|LPA|P\.A\.)/i);
        if (salaryMatch) {
            salaryMin = parseFloat(salaryMatch[1]);
            salaryMax = parseFloat(salaryMatch[2]);
        }

        // 8. Extract Skills
        let skillCandidates: { text: string; score: number }[] = [];

        // Strategy A: Section based extraction with scoring
        const skillPatterns = [
            /(?:Key Skills|Keyskills|Skills)(.*)/is,
            /(?:Technical Skills|Knowledge of|Technical Support)(.*)/is,
            /(?:Key Responsibilities|Responsibilities|Job Description)(.*)/is
        ];

        for (const pattern of skillPatterns) {
            const matches = Array.from(text.matchAll(new RegExp(pattern.source, 'gis')));
            for (const match of matches) {
                const content = match[1].split(/(?:\n\n|\r\n\r\n|Role:|Education|Industry Type|Department|Requirements|Work location|Immediate joiner|Walk-in Details|Note :)/i)[0];
                const lines = content.split(/\n/).map(l => l.trim()).filter(l => l.length > 0);

                for (const line of lines) {
                    if (line.toLowerCase().includes('highlighted with') || line.length < 3) continue;

                    // Pre-split cleaning for merged words
                    const splitLine = ParserService.splitMergedWords(line).join(' ');
                    const delimiters = /[,|•*■-]/;
                    const parts = splitLine.split(delimiters).map(p => p.trim()).filter(p => p.length > 2);

                    for (const part of parts) {
                        let score = 0;
                        const lowPart = part.toLowerCase();

                        // Score based on common technical terms
                        if (ParserService.commonSkills.some(s => lowPart.includes(s))) score += 5;
                        if (lowPart.includes('support') || lowPart.includes('tools') || lowPart.includes('process')) score += 3;

                        // Penalty for generic jargon
                        if (lowPart.includes('match') || lowPart.includes('early') || lowPart.includes('score') || lowPart.includes('growth')) score -= 10;
                        if (part.split(/\s+/).length > 5) score -= 15; // Too long for a skill

                        skillCandidates.push({ text: part, score });
                    }
                }
            }
        }

        // Strategy B: Global Dictionary Match (Guaranteed boost)
        for (const skill of ParserService.commonSkills) {
            if (textLower.includes(skill)) {
                skillCandidates.push({ text: skill, score: 10 });
            }
        }

        // Sort by score and filter
        let skills = skillCandidates
            .sort((a, b) => b.score - a.score)
            .map(c => c.text.replace(/[()[\]{}"'’‘]/g, '').trim())
            .filter((s, index, self) => {
                const low = s.toLowerCase();
                const wordCount = s.split(/\s+/).length;
                return s.length > 2 &&
                    s.length < 50 &&
                    wordCount <= 4 &&
                    self.indexOf(s) === index &&
                    !ParserService.stopWords.includes(low) &&
                    !ParserService.genericTitles.includes(low) &&
                    !low.includes('match score') &&
                    !low.includes('applicants') &&
                    !low.includes('career') &&
                    !low.includes('job');
            })
            .slice(0, 15);

        // Fallback: If still low, use TF-IDF nouns
        if (skills.length < 5) {
            this.tfidf.addDocument(text);
            const terms = doc.nouns().out('array') as string[];
            const uniqueTerms = Array.from(new Set(terms))
                .filter((t: string) => {
                    const low = t.toLowerCase();
                    return t.length > 2 &&
                        !ParserService.stopWords.includes(low) &&
                        !locations.some(l => l.toLowerCase() === low) &&
                        !ParserService.genericTitles.includes(low);
                });
            const topNouns = uniqueTerms.slice(0, 5);
            skills = Array.from(new Set([...skills, ...topNouns]));
        }

        // Final Filter and Clean
        skills = Array.from(new Set(skills))
            .map(s => s.replace(/[()[\]{}"'’‘]/g, '').trim())
            .filter(s => {
                const low = s.toLowerCase();
                const wordCount = s.split(/\s+/).length;
                return s.length > 2 &&
                    s.length < 50 &&
                    wordCount <= 4 && // Filter out full sentences
                    !ParserService.stopWords.includes(low) &&
                    !ParserService.genericTitles.includes(low) &&
                    !low.includes('match score') &&
                    !low.includes('logo') &&
                    !low.includes('reviews') &&
                    !low.includes('queries') &&
                    !low.includes('issues') &&
                    !low.includes('documentation');
            })
            .slice(0, 15);

        // 9. Walk-in Extraction
        let dateRange: string | undefined;
        let timeRange: string | undefined;
        let venueLink: string | undefined;
        let venueAddress: string | undefined;
        const expiresAt = this.extractExpiryFromText(text);

        if (type === 'WALKIN') {
            // Enhanced Date Range (handle ordinals and shared months)
            // Enhanced Date Range (handle ordinals and shared months)
            const dateRangeMatch = text.match(/(\d+(?:st|nd|rd|th)?(?:\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:uary|ruary|arch|il|une|uly|ust|ember|tober|ember)?)?\s*(?:to|-)\s*\d+(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:uary|ruary|arch|il|une|uly|ust|ember|tober|ember)?)/i);
            if (dateRangeMatch) dateRange = dateRangeMatch[1].trim();

            // Enhanced Time Range (handle dots and spaces)
            const timeRangeMatch = text.match(/(\d{1,2}(?:[:.]\d{2})?\s*(?:AM|PM)\s*(?:to|-)\s*\d{1,2}(?:[:.]\d{2})?\s*(?:AM|PM))/i);
            if (timeRangeMatch) timeRange = timeRangeMatch[1].trim();

            const mapLinkMatch = text.match(/https?:\/\/(?:www\.)?(?:google\.com\/maps|maps\.app\.goo\.gl)\/\S+/i);
            if (mapLinkMatch) venueLink = mapLinkMatch[0];

            const venueMatch = text.match(/(?:Venue|Location|Address):\s*([^\n\r]+)/i);
            if (venueMatch) venueAddress = venueMatch[1].trim();

            // Fallback: lines after "Time and Venue"
            if (!venueAddress) {
                const venueIndex = textLines.findIndex(l => l.toLowerCase().includes('time and venue'));
                if (venueIndex !== -1 && textLines[venueIndex + 2]) {
                    venueAddress = textLines[venueIndex + 2];
                }
            }
        }

        return {
            company,
            title,
            locations: Array.from(new Set(locations)) as string[],
            type,
            allowedPassoutYears,
            isFresherOnly,
            allowedDegrees,
            jobFunction,
            incentives,
            salaryPeriod,
            salaryMin,
            salaryMax,
            experienceMin,
            experienceMax,
            dateRange,
            timeRange,
            venueLink,
            venueAddress,
            expiresAt,
            skills,
            isRemote: textLower.includes('remote') || textLower.includes('work from home'),
        };
    }
}
