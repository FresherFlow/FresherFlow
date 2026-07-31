/**
 * TypeScript interfaces for the Zoho Recruit public career-site payload.
 *
 * Field names mirror the real wire shape of the `Job_Openings` module as
 * embedded in the rendered careers page (hidden `<input id="jobs">`). Fields are
 * PascalCase with underscores (Zoho convention) and vary between tenants — many
 * are optional/nullable, so every consumer reads them defensively.
 */

/** A single open position from the embedded careers `jobs` array. */
export interface ZohoRecruitJobOpening {
  /** Zoho record id (the numeric trailing segment of the job-detail URL). */
  id?: string | number | null;

  /** Public posting title (career-site facing); `Job_Opening_Name` is the internal fallback. */
  Posting_Title?: string | null;
  Job_Opening_Name?: string | null;

  /** Location components — any may be null/absent on a given tenant. */
  City?: string | null;
  State?: string | null;
  Country?: string | null;

  /** HTML (or plain) job description. Present on most tenants' listing payload. */
  Job_Description?: string | null;

  /** Posting date — ISO ("YYYY-MM-DD"), epoch seconds/ms, or full ISO timestamp. */
  Date_Opened?: string | number | null;

  /** Remote/on-site flag. */
  Remote_Job?: boolean | null;

  /** Employment type (e.g. "Full time", "Contract"). */
  Job_Type?: string | null;

  /** Industry / functional grouping — used as the department fallback. */
  Industry?: string | null;

  /** Required experience band (e.g. "2-4 years"), when present. */
  Work_Experience?: string | null;

  /** Whether the opening is publicly published / kept on the career site. */
  Publish?: boolean | null;
  Keep_on_Career_Site?: boolean | null;

  /** Locked records are draft/closed and should be skipped. */
  Is_Locked?: boolean | null;

  /** Salary currency, when the tenant emits it. */
  Currency?: string | null;
}
