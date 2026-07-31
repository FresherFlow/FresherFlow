/**
 * TypeScript interfaces for Taleo API responses.
 */

export interface TaleoSearchPayload {
  advancedSearchFiltersSelectionParam?: {
    searchFilterSelections?: Array<{
      id: string;
      selectedValues: string[];
    }>;
  };
  fieldData?: {
    fields: Record<string, Record<string, unknown>>;
    currentRecordNumber: number;
    lastRecordNumber: number;
    fieldId: number;
  };
  multilineEnabled?: boolean;
  sortingSelection?: {
    sortBySelectionParam: string;
    ascendingSortingOrder: string;
  };
  pageNo?: number;
  pageSize?: number;
  keyword?: string;
  location?: string;
  locationRadius?: number;
}

export interface TaleoJobListItem {
  contestNo?: string | null;
  title?: string | null;
  primaryLocation?: string | null;
  jobField?: string | null;
  postingDate?: string | null;
  contestUrl?: string | null;
  openingDate?: string | null;
  closingDate?: string | null;
  organization?: string | null;
  jobType?: string | null;
}

export interface TaleoSearchResponse {
  requisitionList?: TaleoJobListItem[];
  totalCount?: number;
}
