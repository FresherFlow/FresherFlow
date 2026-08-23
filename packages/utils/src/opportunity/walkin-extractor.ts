/**
 * Rule-based Walk-in Details & Expiry Extractor
 */

export interface ParsedWalkInDetails {
  dateRange?: string;
  dates: string[];
  walkinStartDate?: string;
  walkinEndDate?: string;
  expiresAt?: string;
  timeRange?: string;
  reportingTime: string;
  venueAddress: string;
  contactPerson?: string;
  contactPhone?: string;
  requiredDocuments: string[];
}

const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

function parseDateStringToDate(str: string): Date | null {
  if (!str) return null;
  const match = str.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)(?:\s+(\d{4}))?/i);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const monthKey = match[2].toLowerCase();
  const month = MONTH_MAP[monthKey] ?? MONTH_MAP[monthKey.slice(0, 3)];
  if (month === undefined) return null;

  const year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();
  const d = new Date(Date.UTC(year, month, day, 17, 0, 0)); // 5:00 PM UTC (or local evening)
  return isNaN(d.getTime()) ? null : d;
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

  // 2. Extract Dates & Expiry
  const dates: string[] = [];
  let dateRange: string | undefined;
  let walkinStartDate: string | undefined;
  let walkinEndDate: string | undefined;
  let expiresAt: string | undefined;

  // Match patterns like "24th Aug - 28th Aug" or "August 24, 2026" or "24th to 26th August"
  const dateRangeMatch = fullText.match(/(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*)\s*(?:to|-|–)\s*(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:\s+\d{4})?)/i);
  if (dateRangeMatch) {
    dateRange = `${dateRangeMatch[1]} - ${dateRangeMatch[2]}`;
    const startD = parseDateStringToDate(dateRangeMatch[1]);
    const endD = parseDateStringToDate(dateRangeMatch[2]);
    if (startD) {
      walkinStartDate = startD.toISOString();
      dates.push(walkinStartDate);
    }
    if (endD) {
      walkinEndDate = endD.toISOString();
      dates.push(walkinEndDate);
      expiresAt = walkinEndDate;
    }
  } else {
    const singleDateMatch = fullText.match(/(\d{1,2}(?:st|nd|rd|th)?\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*(?:\s+\d{4})?)/i);
    if (singleDateMatch) {
      dateRange = singleDateMatch[1];
      const singleD = parseDateStringToDate(singleDateMatch[1]);
      if (singleD) {
        walkinStartDate = singleD.toISOString();
        walkinEndDate = singleD.toISOString();
        expiresAt = singleD.toISOString();
        dates.push(walkinStartDate);
      }
    }
  }

  // Fallback: If no explicit date is parsed, expire in 3 days at 5:00 PM
  if (!expiresAt) {
    const fallbackDate = new Date();
    fallbackDate.setDate(fallbackDate.getDate() + 3);
    fallbackDate.setHours(17, 0, 0, 0);
    expiresAt = fallbackDate.toISOString();
  }

  // 3. Extract Venue
  let venueAddress = locationStr;
  const venueMatch = fullText.match(/(?:venue|interview venue|interview location|walkin venue|address)\s*:\s*([^\n\r.]+)/i);
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
    walkinStartDate,
    walkinEndDate,
    expiresAt,
    timeRange,
    reportingTime,
    venueAddress,
    contactPerson,
    contactPhone,
    requiredDocuments,
  };
}
