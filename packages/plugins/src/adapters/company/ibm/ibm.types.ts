/** Shape of a job listing extracted from IBM's __NEXT_DATA__ JSON payload. */
export interface IbmJob {
  id?: string;
  req_id?: string;
  title?: string;
  url?: string;
  location?: string;
  locations?: string[];
  description?: string;
  posted_date?: string;
  date_posted?: string;
  department?: string;
  team?: string;
  employment_type?: string;
}
