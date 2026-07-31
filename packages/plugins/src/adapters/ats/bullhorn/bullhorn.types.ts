/**
 * TypeScript interfaces for Bullhorn REST API responses.
 *
 * @see https://bullhorn.github.io/rest-api-docs/
 */

export interface BullhornSearchResponse {
  data: BullhornJobOrder[];
  total: number;
  count: number;
}

export interface BullhornJobOrder {
  id: number;
  title: string;
  publicDescription: string | null;
  address: BullhornAddress | null;
  /** Epoch milliseconds when the job was added */
  dateAdded: number | null;
  salary: number | null;
  salaryUnit: string | null;
  employmentType: string | null;
  categories: BullhornCategories | null;
}

export interface BullhornAddress {
  city: string | null;
  state: string | null;
  country: string | null;
  zip: string | null;
}

export interface BullhornCategories {
  data: BullhornCategory[];
}

export interface BullhornCategory {
  id: number;
  name: string;
}
