'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api/admin';
import { extractDomain, overlapRatio, tokenSet, type DuplicateOpportunity } from '@/features/admin/opportunities/formUtils';

type DuplicateCandidate = {
    id: string;
    title: string;
    company: string;
    status: string;
    updatedAt: string;
};

type Params = {
    title: string;
    company: string;
    applyLink: string;
    sourceLink: string;
    opportunityId?: string;
};

export function useDuplicateCandidates({ title, company, applyLink, sourceLink, opportunityId }: Params) {
    const [duplicateCandidates, setDuplicateCandidates] = useState<DuplicateCandidate[]>([]);
    const [checkingDuplicates, setCheckingDuplicates] = useState(false);

    useEffect(() => {
        const trimmedTitle = title.trim();
        const trimmedCompany = company.trim();
        if (trimmedTitle.length < 3 || trimmedCompany.length < 2) {
            setDuplicateCandidates([]);
            setCheckingDuplicates(false);
            return;
        }

        const timeoutId = setTimeout(async () => {
            try {
                setCheckingDuplicates(true);
                const response = await adminApi.getOpportunities({ q: trimmedCompany, limit: 25 }) as { opportunities: DuplicateOpportunity[] };
                const opportunities = response?.opportunities || [];
                const titleTokens = tokenSet(trimmedTitle);
                const companyTokens = tokenSet(trimmedCompany);
                const currentApplyDomain = extractDomain(applyLink || sourceLink);

                const scored = opportunities
                    .filter((opp) => opp.id !== opportunityId)
                    .map((opp) => {
                        const titleScore = overlapRatio(titleTokens, tokenSet(opp.title || ''));
                        const companyScore = overlapRatio(companyTokens, tokenSet(opp.company || ''));
                        const candidateDomain = extractDomain(opp.applyLink || opp.sourceLink);
                        const applyDomainScore = currentApplyDomain && candidateDomain && currentApplyDomain === candidateDomain ? 1 : 0;
                        const score = (titleScore * 0.5) + (companyScore * 0.35) + (applyDomainScore * 0.15);
                        return { ...opp, score };
                    })
                    .filter((opp) => opp.score >= 0.45)
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 4)
                    .map((opp) => ({
                        id: opp.id,
                        title: opp.title,
                        company: opp.company,
                        status: `${opp.status} • ${Math.round(opp.score * 100)}%`,
                        updatedAt: opp.updatedAt,
                    }));

                setDuplicateCandidates(scored);
            } catch {
                setDuplicateCandidates([]);
            } finally {
                setCheckingDuplicates(false);
            }
        }, 450);

        return () => clearTimeout(timeoutId);
    }, [title, company, applyLink, sourceLink, opportunityId]);

    return {
        duplicateCandidates,
        checkingDuplicates,
    };
}
