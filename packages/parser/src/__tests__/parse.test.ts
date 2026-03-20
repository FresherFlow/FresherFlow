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
    expect(result.locations).toContain('Bangalore');
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
      Requirement: 2023, 2024 and 2025 batch only.
    `;
    const result = parseJobText(text);
    expect(result.allowedPassoutYears).toContain(2023);
    expect(result.allowedPassoutYears).toContain(2024);
    expect(result.allowedPassoutYears).toContain(2025);
  });
});
