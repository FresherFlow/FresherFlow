import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Set environment variables
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.INTERNAL_API_SECRET = 'test-secret';

const prismaMock = {
    user: {
        findFirst: vi.fn(),
    },
    opportunity: {
        findFirst: vi.fn(),
        create: vi.fn(),
    },
};

vi.mock('@fresherflow/database', () => ({
    prisma: prismaMock,
    OpportunityStatus: {
        DRAFT: 'DRAFT',
        PUBLISHED: 'PUBLISHED',
        ARCHIVED: 'ARCHIVED',
        EXPIRED: 'EXPIRED'
    },
    OpportunityType: {
        JOB: 'JOB',
        INTERNSHIP: 'INTERNSHIP',
        WALKIN: 'WALKIN',
        REMOTE: 'REMOTE',
        GOVERNMENT: 'GOVERNMENT',
        HACKATHONS: 'HACKATHONS'
    },
    EducationLevel: {
        TENTH: 'TENTH',
        INTER: 'INTER',
        DIPLOMA: 'DIPLOMA',
        DEGREE: 'DEGREE',
        PG: 'PG'
    },
    WorkMode: {
        ONSITE: 'ONSITE',
        HYBRID: 'HYBRID',
        REMOTE: 'REMOTE'
    },
    SalaryPeriod: {
        MONTHLY: 'MONTHLY',
        YEARLY: 'YEARLY'
    }
}));

describe('Job Submission Secure Endpoint', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        prismaMock.user.findFirst.mockResolvedValue({ id: 'admin-id', role: 'ADMIN' });
    });

    it('POST /submit returns 401 if x-api-key is invalid', async () => {
        const submitRouter = (await import('../routes/public/opportunities/submit')).default;
        const app = express();
        app.use(express.json());
        app.use('/', submitRouter);

        const res = await request(app)
            .post('/submit')
            .set('x-api-key', 'wrong-secret')
            .send({
                title: 'Software Engineer',
                company: 'Microsoft'
            });

        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('Invalid API Key');
    });

    it('POST /submit returns 400 on Zod validation failure', async () => {
        const submitRouter = (await import('../routes/public/opportunities/submit')).default;
        const app = express();
        app.use(express.json());
        app.use('/', submitRouter);

        const res = await request(app)
            .post('/submit')
            .set('x-api-key', 'test-secret')
            .send({
                title: '', // should fail validation (min 1)
                company: 'Microsoft'
            });

        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toContain('Validation failed');
    });

    it('POST /submit returns 200 indicating duplicate if url exists', async () => {
        prismaMock.user.findFirst.mockResolvedValue({ id: 'admin-id', role: 'ADMIN' });
        prismaMock.opportunity.findFirst.mockResolvedValueOnce({ id: 'existing-id' }); // Duplicate URL check

        const submitRouter = (await import('../routes/public/opportunities/submit')).default;
        const app = express();
        app.use(express.json());
        app.use('/', submitRouter);

        const res = await request(app)
            .post('/submit')
            .set('x-api-key', 'test-secret')
            .send({
                title: 'Software Engineer',
                company: 'Microsoft',
                applyLink: 'https://apply.careers.microsoft.com/123'
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('Opportunity already exists');
        expect(res.body.id).toBe('existing-id');
        expect(prismaMock.opportunity.findFirst).toHaveBeenCalled();
        expect(prismaMock.opportunity.create).not.toHaveBeenCalled();
    });

    it('POST /submit successfully creates opportunity with API key and attributes to ADMIN', async () => {
        prismaMock.user.findFirst.mockResolvedValue({ id: 'admin-id', role: 'ADMIN' });
        prismaMock.opportunity.findFirst.mockResolvedValueOnce(null); // No duplicate URL
        prismaMock.opportunity.findFirst.mockResolvedValueOnce(null); // No duplicate slug
        prismaMock.opportunity.create.mockResolvedValue({ id: 'new-id' });

        const submitRouter = (await import('../routes/public/opportunities/submit')).default;
        const app = express();
        app.use(express.json());
        app.use('/', submitRouter);

        const res = await request(app)
            .post('/submit')
            .set('x-api-key', 'test-secret')
            .send({
                title: 'Software Engineer',
                company: 'Microsoft',
                description: 'We are hiring software engineers.',
                type: 'JOB',
                status: 'PUBLISHED', // testing customizable status
                locations: ['Bangalore'],
                requiredSkills: ['Node.js'],
                applyLink: 'https://apply.careers.microsoft.com/123'
            });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toBe('Opportunity submitted successfully');
        expect(res.body.id).toBe('new-id');
        expect(prismaMock.opportunity.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
                title: 'Software Engineer',
                company: 'Microsoft',
                status: 'PUBLISHED',
                postedByUserId: 'admin-id'
            })
        });
    });
});
