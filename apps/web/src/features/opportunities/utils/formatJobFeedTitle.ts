import { OpportunityType } from '@fresherflow/types';

export interface TitleFilters {
    type?: OpportunityType | null;
    workMode?: string[] | string | null;
    location?: string | null;
    skills?: string[] | null;
    sector?: string | null;
    course?: string | null;
    search?: string | null;
}

export function formatJobFeedTitle(filters: TitleFilters): string {
    const parts: string[] = [];

    // 1. Work Mode
    if (filters.workMode) {
        const modes = Array.isArray(filters.workMode) ? filters.workMode : [filters.workMode];
        if (modes.length > 0) {
            const mappedModes = modes.map(m => {
                if (m.toUpperCase() === 'REMOTE') return 'Remote';
                if (m.toUpperCase() === 'HYBRID') return 'Hybrid';
                if (m.toUpperCase() === 'ON_SITE') return 'On-site';
                return m;
            });
            if (mappedModes.length === 1) parts.push(mappedModes[0]);
            else if (mappedModes.length === 2) parts.push(mappedModes.join(' & '));
            else if (mappedModes.length > 2) parts.push(mappedModes.slice(0, -1).join(', ') + ' & ' + mappedModes[mappedModes.length - 1]);
        }
    } else if (filters.type === OpportunityType.REMOTE) {
        parts.push('Remote');
    }

    // 2. Sector (for Gov)
    if (filters.type === OpportunityType.GOVERNMENT || filters.sector) {
        if (filters.sector) {
            parts.push(filters.sector);
        }
        parts.push('Government');
    }

    // 3. Skill or Course or Search
    if (filters.search) {
        parts.push(`"${filters.search}"`);
    } else if (filters.skills && filters.skills.length > 0) {
        parts.push(filters.skills[0]);
    } else if (filters.course) {
        parts.push(filters.course);
    }

    // 4. Type
    if (filters.type === OpportunityType.INTERNSHIP) {
        parts.push('Internship Jobs');
    } else if (filters.type === OpportunityType.WALKIN) {
        parts.push('Walk-in Drives');
    } else if (filters.type === OpportunityType.HACKATHONS) {
        parts.push('Hackathons');
    } else {
        parts.push('Jobs');
    }
    
    let title = parts.join(' ').trim();

    // 5. Location
    if (filters.location) {
        title += ` in ${filters.location}`;
    }

    return title;
}
