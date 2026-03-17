import { describe, it, expect } from 'vitest';
import { getProfileCompletionDetails } from '../profileCompletion';
import { Profile } from '@fresherflow/types';

describe('Profile Completion Utility', () => {
    it('should return 0 for empty profile', () => {
        const profile = {} as Profile;
        const result = getProfileCompletionDetails(profile);
        expect(result.percentage).toBe(0);
        expect(result.missingFields).toContain('graduationDetails');
    });

    it('should calculate percentage correctly for partial profile', () => {
        const profile = {
            gradCourse: 'B.Tech',
            gradSpecialization: 'CSE',
            gradYear: 2024,
            skills: ['React'],
            availability: 'IMMEDIATE',
        } as unknown as Profile;
        
        const result = getProfileCompletionDetails(profile);
        expect(result.percentage).toBeGreaterThan(0);
        expect(result.percentage).toBeLessThan(100);
    });

    it('should return 100 for complete profile', () => {
        const profile = {
            gradCourse: 'B.Tech',
            gradSpecialization: 'CSE',
            gradYear: 2024,
            tenthYear: 2018,
            twelfthYear: 2020,
            interestedIn: ['Software Engineer'],
            preferredCities: ['Bangalore'],
            workModes: ['REMOTE'],
            availability: 'IMMEDIATE',
            skills: ['React', 'Node.js'],
        } as unknown as Profile;
        
        const result = getProfileCompletionDetails(profile);
        expect(result.percentage).toBe(100);
        expect(result.missingFields.length).toBe(0);
    });
});
