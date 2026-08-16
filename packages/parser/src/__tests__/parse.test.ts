import { describe, it, expect } from 'vitest';
import { parseJobText } from '../index.js';
import { OpportunityType, WorkMode } from '@fresherflow/types';

describe('Job Parser Logic', () => {
  it('should extract title and company accurately', () => {
    const text = `
      Junior Software Engineer 
      Accenture - Bangalore, Karnataka
      We are looking for a developer...
    `;
    const result = parseJobText(text);
    
    expect(result.title).toContain('Engineer');
    expect(result.company).toBe('Accenture');
    expect(result.locations.some(l => l.includes('Banga'))).toBe(true);
  });

  it('should detect Internship type correctly', () => {
    const text = `
      Backend Internship at Startup ABC
      Stipend: 25k per month
    `;
    const result = parseJobText(text);
    expect(result.type).toBe(OpportunityType.INTERNSHIP);
  });

  it('should detect Remote work mode', () => {
    const text = `
      Frontend Developer (Fully Remote / WFH)
      Apply now...
    `;
    const result = parseJobText(text);
    expect(result.workMode).toBe(WorkMode.REMOTE);
  });

  it('should extract passout years', () => {
    const text = `
      We are hiring the batch of 2025. 
      Also accepting the class of 2026.
      And those graduating in 2027.
    `;
    const result = parseJobText(text);
    expect(result.allowedPassoutYears).toContain(2025);
    expect(result.allowedPassoutYears).toContain(2026);
    expect(result.allowedPassoutYears).toContain(2027);
  });

  it('should extract experience requirements including bracket formats', () => {
    const text1 = `Requires [2+] years in a customer-facing technical role`;
    const res1 = parseJobText(text1);
    expect(res1.experienceMin).toBe(2);
    expect(res1.experienceMax).toBe(2);

    const text2 = `Looking for [1-3] years of work experience`;
    const res2 = parseJobText(text2);
    expect(res2.experienceMin).toBe(1);
    expect(res2.experienceMax).toBe(3);

    const text3 = `Minimum 3+ years experience`;
    const res3 = parseJobText(text3);
    expect(res3.experienceMin).toBe(3);
    expect(res3.experienceMax).toBe(3);
    
    const text4 = `1-2 years experience required`;
    const res4 = parseJobText(text4);
    expect(res4.experienceMin).toBe(1);
    expect(res4.experienceMax).toBe(2);

    const text5 = `B.Tech./ M.Tech. with 2&#43; years of relevant experience`;
    const res5 = parseJobText(text5);
    expect(res5.experienceMin).toBe(2);
    expect(res5.experienceMax).toBe(2);
  });
});
