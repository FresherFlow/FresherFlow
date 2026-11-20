import { describe, expect, it } from 'vitest';
import { FeedGeneratorService } from '../infrastructure/services/opportunity/feedGenerator.service';

describe('public feed-index projection', () => {
    it('retains recruitmentMethod for clients that read the CDN index', () => {
        const [projected] = FeedGeneratorService.projectFeedIndex([
            { id: 'job-1', category: 'WALKIN', status: 'PUBLISHED', recruitmentMethod: 'WALK_IN' },
        ]);

        expect(projected).toMatchObject({ type: 'WALKIN', recruitmentMethod: 'WALK_IN' });
    });

    it('retains the salary, venue and government fields the index advertises', () => {
        const [mapped] = FeedGeneratorService.mapFeedOpportunities([
            {
                id: 'job-1',
                category: 'WALKIN',
                status: 'PUBLISHED',
                recruitmentMethod: 'WALK_IN',
                sector: 'GOVERNMENT',
                salaryRange: '5-7 LPA',
                stipend: '20,000/month',
                driveDetails: { venueAddress: 'Acme Office, Hyderabad', dates: ['2026-12-01'] },
                governmentJobDetails: { department: 'Railways' },
            },
        ]);
        const [projected] = FeedGeneratorService.projectFeedIndex([mapped]);

        // These were destructured out of the mapped row, so the index listed
        // them in FEED_INDEX_FIELDS but always wrote nothing — every card had no
        // salary, every drive no venue and every government listing no details.
        expect(projected).toMatchObject({
            sector: 'GOVERNMENT',
            salaryRange: '5-7 LPA',
            stipend: '20,000/month',
            driveDetails: { venueAddress: 'Acme Office, Hyderabad' },
            governmentJobDetails: { department: 'Railways' },
        });
    });
});
