/**
 * TypeScript interfaces for Lever API responses.
 * Ported from ats-scrapers/models/lever.py
 */

export interface LeverCategories {
  location?: string | null;
  team?: string | null;
  department?: string | null;
  commitment?: string | null;
  allLocations?: string[] | null;
}

export interface LeverSalaryRange {
  min?: number | null;
  max?: number | null;
  currency?: string | null;
  interval?: string | null;
}

export interface LeverJob {
  additional?: string | null;
  additionalPlain?: string | null;
  categories?: LeverCategories | null;
  createdAt?: number | null;
  descriptionPlain?: string | null;
  description?: string | null;
  id?: string | null;
  lists?: Array<{ text: string; content: string }> | null;
  text?: string | null;
  country?: string | null;
  workplaceType?: string | null;
  salaryRange?: LeverSalaryRange | null;
  opening?: string | null;
  openingPlain?: string | null;
  descriptionBody?: string | null;
  descriptionBodyPlain?: string | null;
  hostedUrl?: string | null;
  applyUrl?: string | null;
}
