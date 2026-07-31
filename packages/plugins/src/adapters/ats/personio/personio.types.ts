/**
 * TypeScript interfaces for Personio XML feed positions.
 * The XML is parsed into these structures via cheerio xmlMode.
 */

export interface PersonioPosition {
  id: string;
  name: string;
  office: string | null;
  department: string | null;
  recruitingCategory: string | null;
  employmentType: string | null;
  seniority: string | null;
  schedule: string | null;
  keywords: string | null;
  createdAt: string | null;
  descriptions: PersonioDescription[];
}

export interface PersonioDescription {
  name: string;
  value: string;
}

/**
 * TypeScript interfaces for the Personio Recruiting API (v1) responses.
 * Used when authenticated API credentials are available.
 *
 * @see https://developer.personio.de/reference/get_v1-recruiting-positions
 */

export interface PersonioApiAuthResponse {
  success: boolean;
  data: {
    token: string;
  };
}

export interface PersonioApiPositionsResponse {
  success: boolean;
  data: PersonioApiPosition[];
}

export interface PersonioApiPosition {
  id: number;
  attributes: {
    name?: string;
    status?: string;
    office?: {
      type: string;
      attributes: {
        name?: string;
      };
    };
    department?: {
      type: string;
      attributes: {
        name?: string;
      };
    };
    recruiting_category?: string | null;
    employment_type?: string | null;
    seniority?: string | null;
    schedule?: string | null;
    keywords?: string[] | null;
    description?: string | null;
    created_at?: string | null;
    occupation?: string | null;
  };
}
