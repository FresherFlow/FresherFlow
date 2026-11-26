/** Narrow validation of the tool-result envelope. No SDK import, no DOM. */

export type View = 'cards' | 'detail' | 'company' | 'submission';
export type Kind = 'tool-result' | 'submission-record' | 'public-listing' | 'error';
export type WidgetMessage = { view: View; kind: Kind; data: Record<string, unknown> };

const VIEWS: View[] = ['cards', 'detail', 'company', 'submission'];
const KINDS: Kind[] = ['tool-result', 'submission-record', 'public-listing', 'error'];

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function parseWidgetMessage(payload: unknown): WidgetMessage | undefined {
  const envelope = record(payload);
  if (!envelope) return undefined;
  const { view, kind } = envelope;
  if (typeof view !== 'string' || !VIEWS.includes(view as View)) return undefined;
  if (typeof kind !== 'string' || !KINDS.includes(kind as Kind)) return undefined;
  const data = record(envelope.data);
  if (!data) return undefined;
  return { view: view as View, kind: kind as Kind, data };
}

export function asJobs(data: unknown): { jobs: unknown[]; total: number } | undefined {
  const value = record(data);
  if (!value || !Array.isArray(value.jobs)) return undefined;
  return {
    jobs: value.jobs.filter((job) => record(job) !== undefined),
    total: typeof value.total === 'number' && Number.isFinite(value.total) ? value.total : value.jobs.length,
  };
}

export function asJobDetail(data: unknown): Record<string, unknown> | undefined {
  return record(data);
}

export function asCompanyView(data: unknown): Record<string, unknown> | undefined {
  return record(data);
}

export function asSubmissionRecord(data: unknown): Record<string, unknown> | undefined {
  const value = record(data);
  if (!value || typeof value.status !== 'string') return undefined;
  return value;
}

export function asPublicListing(data: unknown): Record<string, unknown> | undefined {
  return record(data);
}

export function asErrorData(data: unknown): { message: string } | undefined {
  const value = record(data);
  if (!value || typeof value.message !== 'string') return undefined;
  return { message: value.message };
}
