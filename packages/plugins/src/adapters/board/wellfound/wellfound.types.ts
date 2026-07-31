/**
 * TypeScript interfaces for Wellfound (AngelList) job listings.
 * Extracted from __NEXT_DATA__ or Apollo state embedded in the page.
 *
 * TODO: Validate against live Wellfound page structure
 */

export interface WellfoundNextData {
  props?: {
    pageProps?: {
      listings?: WellfoundListing[];
      jobs?: WellfoundListing[];
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface WellfoundListing {
  id: string | number;
  title: string;
  slug?: string;
  company?: {
    name: string;
    slug?: string;
    logoUrl?: string;
    highConcept?: string;
    companySize?: string;
  };
  compensation?: {
    min?: number | null;
    max?: number | null;
    currency?: string;
    equity?: boolean;
    equityMin?: number | null;
    equityMax?: number | null;
  };
  locations?: string[];
  remote?: boolean;
  description?: string;
  skills?: string[];
  createdAt?: string;
}
