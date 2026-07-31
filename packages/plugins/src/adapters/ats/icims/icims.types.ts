/**
 * TypeScript interfaces for iCIMS responses.
 */

export interface IcimsJobListItem {
  id?: string | null;
  title?: string | null;
  url?: string | null;
  location?: string | null;
  datePosted?: string | null;
  category?: string | null;
}

export interface IcimsGatewayResponse {
  jobs?: IcimsJobListItem[];
  totalCount?: number;
}
