/**
 * Rule-based Walk-in Details Extractor
 */

export interface ParsedWalkInDetails {
  dateRange?: string;
  dates: string[];
  timeRange?: string;
  reportingTime: string;
  venueAddress: string;
  contactPerson?: string;
  contactPhone?: string;
  requiredDocuments: string[];
}

export function parseWalkInDetails(title: string, description: string, locationStr = 'Hyderabad'): ParsedWalkInDetails {
  const fullText = `${title}\n${description}`;

  // 1. Extract Time Range / Timing
  let timeRange: string | undefined;
  let reportingTime = '9:30 AM';

  const timeMatch = fullText.match(/(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))\s*(?:to|-|–)\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))/i);
  if (timeMatch) {
    timeRange = `${timeMatch[1].toUpperCase()} - ${timeMatch[2].toUpperCase()}`;
    reportingTime = timeMatch[1].toUpperCase();
  }

  // 2. Extract Dates
  const dates: string[] = [];
  let dateRange: string | undefined;

  // Match patterns like "24th Aug - 28th Aug" or "August 24, 2026" or "24th to 26th August"
  const dateRangeMatch = fullText.match(/(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*)\s*(?:to|-|–)\s*(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:\s+\d{4})?)/i);
  if (dateRangeMatch) {
    dateRange = `${dateRangeMatch[1]} - ${dateRangeMatch[2]}`;
  } else {
    const singleDateMatch = fullText.match(/(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:\s+\d{4})?)/i);
    if (singleDateMatch) {
      dateRange = singleDateMatch[1];
    }
  }

  // 3. Extract Venue
  let venueAddress = locationStr;
  const venueMatch = fullText.match(/(?:venue|interview venue|interview location|location|walkin venue|address)\s*:\s*([^\n\r.]+)/i);
  if (venueMatch && venueMatch[1].trim().length > 10) {
    venueAddress = venueMatch[1].trim();
  }

  // 4. Extract Contact
  let contactPerson: string | undefined;
  let contactPhone: string | undefined;

  const hrMatch = fullText.match(/(?:contact person|hr|recruiter|spoc)\s*:\s*([A-Za-z\s]+?)(?:[\n\r,]|$)/i);
  if (hrMatch && hrMatch[1].trim().length > 2 && hrMatch[1].trim().length < 30) {
    contactPerson = hrMatch[1].trim();
  }

  const phoneMatch = fullText.match(/(?:\+91[\s-]?)?[6-9]\d{9}/);
  if (phoneMatch) {
    contactPhone = phoneMatch[0];
  }

  // 5. Standard Required Documents Checklist
  const requiredDocuments = [
    'Updated Resume (2 Copies)',
    'Government Photo ID (Aadhaar / PAN / Passport)',
    'Passport Size Photographs (2)',
    'Academic Marksheets / Degree Certificates',
  ];

  return {
    dateRange,
    dates,
    timeRange,
    reportingTime,
    venueAddress,
    contactPerson,
    contactPhone,
    requiredDocuments,
  };
}
