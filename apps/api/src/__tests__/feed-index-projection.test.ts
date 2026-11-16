import { describe, expect, it } from 'vitest';
import { FeedGeneratorService } from '../infrastructure/services/opportunity/feedGenerator.service';

describe('public feed-index projection', () => {
    it('retains recruitmentMethod for clients that read the CDN index', () => {
        const [projected] = FeedGeneratorService.projectFeedIndex([
            { id: 'job-1', category: 'WALKIN', status: 'PUBLISHED', recruitmentMethod: 'WALK_IN' },
        ]);

        expect(projected).toMatchObject({ type: 'WALKIN', recruitmentMethod: 'WALK_IN' });
    });
});
