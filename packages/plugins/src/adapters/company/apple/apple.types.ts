export interface AppleSearchResponse {
  res?: {
    searchResults?: AppleJobResult[];
    totalRecords?: number;
  };
}

export interface AppleJobResult {
  id?: string;
  positionId?: string;
  postingTitle?: string;
  postingDate?: string;
  jobSummary?: string;
  transformedPostingTitle?: string;
  homeOffice?: boolean;
  locations?: AppleLocation[];
  team?: { teamName?: string };
}

export interface AppleLocation {
  city?: string;
  stateProvince?: string;
  countryName?: string;
  name?: string;
}
