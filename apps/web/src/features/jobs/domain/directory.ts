import type { Opportunity } from '@fresherflow/types';

export function getRelatedOpportunities(opportunity: Opportunity, opportunities: Opportunity[]) {
    const isGov = Boolean(opportunity.governmentJobDetails);
    const currentSkillSet = new Set((opportunity.requiredSkills || []).map((skill) => skill.toLowerCase()));
    const currentLocations = new Set((opportunity.locations || []).map((location: string) => location.toLowerCase()));

    return (opportunities || [])
        .filter((item) => item.id !== opportunity.id)
        .filter((item) => {
            const itemGov = Boolean(item.governmentJobDetails);
            return itemGov === isGov;
        })
        .filter((item) => !item.expiresAt || new Date(item.expiresAt) > new Date())
        .map((item) => {
            let score = 0;
            if (item.company === opportunity.company) score += 5;

            const itemLocations = (item.locations || []).map((location: string) => location.toLowerCase());
            if (itemLocations.some((location: string) => currentLocations.has(location))) score += 3;

            const itemSkills = (item.requiredSkills || []).map((skill) => skill.toLowerCase());
            const sharedSkills = itemSkills.filter((skill) => currentSkillSet.has(skill)).length;
            score += Math.min(sharedSkills, 4);

            if (item.workMode && item.workMode === opportunity.workMode) score += 1;
            return { item, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
        .map(({ item }) => item);
}

export function getValidDirectoryLinks(opportunities: Opportunity[]) {
    const skillCounts: Record<string, number> = {};
    const locCounts: Record<string, number> = {};
    
    opportunities.forEach(opp => {
        if (opp.status && opp.status !== 'PUBLISHED') return;
        if (opp.expiresAt && new Date(opp.expiresAt) < new Date()) return;
        
        (opp.requiredSkills || []).forEach(skill => {
            if (!skill) return;
            const s = skill.trim().toLowerCase();
            skillCounts[s] = (skillCounts[s] || 0) + 1;
        });
        
        (opp.locations || []).forEach(loc => {
            if (!loc) return;
            const l = loc.trim().toLowerCase();
            locCounts[l] = (locCounts[l] || 0) + 1;
        });
    });

    const validSkills = new Set(Object.keys(skillCounts).filter(k => skillCounts[k] >= 5));
    const validLocations = new Set(Object.keys(locCounts).filter(k => locCounts[k] >= 5));

    return { validSkills, validLocations };
}
