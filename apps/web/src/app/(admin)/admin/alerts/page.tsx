'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi } from '@/lib/api/admin';

type DispatchStatus = 'INITIATED' | 'SENT' | 'FAILED' | 'SKIPPED';
type DispatchKind = 'DAILY_DIGEST' | 'CLOSING_SOON' | 'HIGHLIGHT' | 'APP_UPDATE' | 'NEW_JOB' | 'EVENT_REMINDER';
type DispatchChannel = 'EMAIL' | 'APP' | 'PUSH';
type DispatchReason = 'DEDUPE_HIT' | 'DAILY_CAP' | 'PREFERENCE_DISABLED' | 'NOT_ELIGIBLE' | 'CHANNEL_ERROR' | 'ENUM_FALLBACK' | 'VALIDATION_ERROR' | 'SENT_OK';

type GroupCount<T extends string | null> = { _count: { _all: number } } & Record<string, T>;

type DispatchLogRow = {
  id: string;
  correlationId: string;
  status: DispatchStatus;
  reason: DispatchReason | null;
  kind: DispatchKind;
  channel: DispatchChannel | null;
  dedupeKey: string | null;
  errorMessage: string | null;
  createdAt: string;
  user: { id: string; email: string } | null;
  opportunity: { id: string; slug: string; title: string } | null;
};

type DispatchResponse = {
  totals: {
    byStatus: Array<GroupCount<DispatchStatus>>;
    byReason: Array<GroupCount<DispatchReason | null>>;
  };
  logs: DispatchLogRow[];
};

const STATUS_OPTIONS: Array<DispatchStatus | 'ALL'> = ['ALL', 'INITIATED', 'SENT', 'FAILED', 'SKIPPED'];
const KIND_OPTIONS: Array<DispatchKind | 'ALL'> = ['ALL', 'NEW_JOB', 'DAILY_DIGEST', 'CLOSING_SOON', 'HIGHLIGHT', 'APP_UPDATE', 'EVENT_REMINDER'];
const CHANNEL_OPTIONS: Array<DispatchChannel | 'ALL'> = ['ALL', 'APP', 'EMAIL', 'PUSH'];
const REASON_OPTIONS: Array<DispatchReason | 'ALL'> = ['ALL', 'DEDUPE_HIT', 'DAILY_CAP', 'PREFERENCE_DISABLED', 'NOT_ELIGIBLE', 'CHANNEL_ERROR', 'ENUM_FALLBACK', 'VALIDATION_ERROR', 'SENT_OK'];

export default function AdminAlertsPage() {
  const [status, setStatus] = useState<DispatchStatus | 'ALL'>('ALL');
  const [kind, setKind] = useState<DispatchKind | 'ALL'>('ALL');
  const [channel, setChannel] = useState<DispatchChannel | 'ALL'>('ALL');
  const [reason, setReason] = useState<DispatchReason | 'ALL'>('ALL');
  const [sinceHours, setSinceHours] = useState(24);
  const [correlationId, setCorrelationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DispatchResponse | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getAlertDispatchLogs({
        status: status === 'ALL' ? undefined : status,
        kind: kind === 'ALL' ? undefined : kind,
        channel: channel === 'ALL' ? undefined : channel,
        reason: reason === 'ALL' ? undefined : reason,
        correlationId: correlationId.trim() || undefined,
        sinceHours,
        limit: 200,
      }) as DispatchResponse;
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [channel, correlationId, kind, reason, sinceHours, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const statusMap = useMemo(() => {
    const map = new Map<string, number>();
    (data?.totals.byStatus || []).forEach((row) => map.set(row.status, row._count._all));
    return map;
  }, [data]);

  const reasonRows = useMemo(() => {
    return [...(data?.totals.byReason || [])]
      .filter((row) => row.reason)
      .sort((a, b) => b._count._all - a._count._all);
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Alerts Health</h1>
        <p className="text-sm text-muted-foreground hidden md:block">Dispatch totals, reason breakdown, and raw delivery logs.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6 rounded-lg border bg-card p-4">
        <label className="text-sm space-y-1">
          <span className="text-muted-foreground">Status</span>
          <select className="w-full rounded border bg-secondary/20 px-2 py-1" value={status} onChange={(e) => setStatus(e.target.value as DispatchStatus | 'ALL')}>
            {STATUS_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-sm space-y-1">
          <span className="text-muted-foreground">Kind</span>
          <select className="w-full rounded border bg-secondary/20 px-2 py-1" value={kind} onChange={(e) => setKind(e.target.value as DispatchKind | 'ALL')}>
            {KIND_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-sm space-y-1">
          <span className="text-muted-foreground">Channel</span>
          <select className="w-full rounded border bg-secondary/20 px-2 py-1" value={channel} onChange={(e) => setChannel(e.target.value as DispatchChannel | 'ALL')}>
            {CHANNEL_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-sm space-y-1">
          <span className="text-muted-foreground">Reason</span>
          <select className="w-full rounded border bg-secondary/20 px-2 py-1" value={reason} onChange={(e) => setReason(e.target.value as DispatchReason | 'ALL')}>
            {REASON_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label className="text-sm space-y-1">
          <span className="text-muted-foreground">Since hours</span>
          <input className="w-full rounded border bg-secondary/20 px-2 py-1" type="number" min={1} max={720} value={sinceHours} onChange={(e) => setSinceHours(Number(e.target.value) || 24)} />
        </label>
        <label className="text-sm space-y-1">
          <span className="text-muted-foreground">Correlation ID</span>
          <input className="w-full rounded border bg-secondary/20 px-2 py-1" value={correlationId} onChange={(e) => setCorrelationId(e.target.value)} placeholder="optional" />
        </label>
        <div className="md:col-span-2 lg:col-span-6 flex justify-end">
          <button onClick={() => void load()} className="rounded border px-3 py-1.5 text-sm font-semibold hover:bg-muted">Refresh</button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STATUS_OPTIONS.filter((item) => item !== 'ALL').map((item) => (
          <div key={item} className="rounded-lg border bg-card p-3">
            <div className="text-xs text-muted-foreground">{item}</div>
            <div className="text-2xl font-bold">{statusMap.get(item) || 0}</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-4">
        <h2 className="text-lg font-semibold mb-3">Reason Breakdown</h2>
        {reasonRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reason data for this filter window.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {reasonRows.map((row) => (
              <div key={String(row.reason)} className="rounded border px-3 py-2 flex items-center justify-between">
                <span className="text-sm font-medium">{row.reason}</span>
                <span className="text-sm text-muted-foreground">{row._count._all}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b font-semibold">Raw Logs</div>
        {loading ? <div className="p-4 text-sm text-muted-foreground">Loading...</div> : null}
        {error ? <div className="p-4 text-sm text-destructive">{error}</div> : null}
        {!loading && !error && (data?.logs.length || 0) === 0 ? (
          <div className="p-4 text-sm text-muted-foreground">No logs in this window.</div>
        ) : null}
        {!loading && !error && (data?.logs.length || 0) > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2">Time</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Kind/Channel</th>
                  <th className="px-4 py-2">Reason</th>
                  <th className="px-4 py-2">User</th>
                  <th className="px-4 py-2">Opportunity</th>
                  <th className="px-4 py-2">Error</th>
                </tr>
              </thead>
              <tbody>
                {data?.logs.map((row) => (
                  <tr key={row.id} className="border-b align-top">
                    <td className="px-4 py-2 whitespace-nowrap">{new Date(row.createdAt).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-2">{row.status}</td>
                    <td className="px-4 py-2">{row.kind} {row.channel ? `/${row.channel}` : ''}</td>
                    <td className="px-4 py-2">{row.reason || '-'}</td>
                    <td className="px-4 py-2">{row.user?.email || '-'}</td>
                    <td className="px-4 py-2 max-w-[260px] truncate" title={row.opportunity?.title || ''}>{row.opportunity?.title || '-'}</td>
                    <td className="px-4 py-2">
                      {row.errorMessage ? (
                        <button
                          className="rounded border px-2 py-1 text-xs hover:bg-muted"
                          onClick={() => navigator.clipboard.writeText(row.errorMessage || '')}
                        >
                          Copy Error
                        </button>
                      ) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}






