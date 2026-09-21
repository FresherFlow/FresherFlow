export const VALID_LOCATIONS = {
    'bangalore': {
        label: 'Bangalore',
        aliases: ['bangalore', 'bengaluru']
    },
    'hyderabad': {
        label: 'Hyderabad',
        aliases: ['hyderabad']
    },
    'pune': {
        label: 'Pune',
        aliases: ['pune']
    },
    'chennai': {
        label: 'Chennai',
        aliases: ['chennai']
    },
    'mumbai': {
        label: 'Mumbai',
        aliases: ['mumbai']
    },
    'delhi-ncr': {
        label: 'Delhi NCR',
        aliases: ['delhi', 'noida', 'gurugram', 'ncr', 'gurgaon']
    },
    'remote': {
        label: 'Remote',
        aliases: ['remote', 'work from home', 'wfh', 'telecommute']
    }
} as const;

export function getCanonicalLocation(loc: string): string | null {
    const lower = loc.toLowerCase().trim();
    for (const [canonicalSlug, info] of Object.entries(VALID_LOCATIONS)) {
        if (info.aliases.some(alias => lower.includes(alias))) {
            return canonicalSlug;
        }
    }
    return null;
}
