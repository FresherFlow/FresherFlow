'use client';

import { useState, useEffect } from 'react';
import { cn } from '@repo/ui/utils/cn';

const INGESTION_URL = process.env.NEXT_PUBLIC_INGESTION_URL || 'http://localhost:3005';
const INGESTION_SECRET = process.env.NEXT_PUBLIC_INGESTION_SECRET || '';

const COMPANY_TARGETS = [
  { company: 'Razorpay',       ats: 'greenhouse', slug: 'razorpaysoftwareprivatelimited' },
  { company: 'CRED',           ats: 'lever',      slug: 'cred' },
  { company: 'Urban Company',  ats: 'lever',      slug: 'urbancompany' },
  { company: 'Slice',          ats: 'lever',      slug: 'slice' },
  { company: 'Canonical',      ats: 'greenhouse', slug: 'canonical' },
  { company: 'Figma',          ats: 'greenhouse', slug: 'figma' },
  { company: 'Coinbase',       ats: 'greenhouse', slug: 'coinbase' },
  { company: 'Airbnb',         ats: 'greenhouse', slug: 'airbnb' },
  { company: 'Hotstar',        ats: 'lever',      slug: 'hotstar' },
  { company: 'Zeta',           ats: 'lever',      slug: 'zeta' },
  { company: 'Google',         ats: 'google',     slug: 'google' },
  { company: 'Microsoft',      ats: 'microsoft',  slug: 'microsoft' },
  { company: 'Amazon',         ats: 'amazon',     slug: 'amazon' },
  { company: 'Apple',          ats: 'apple',      slug: 'apple' },
  { company: 'Meta',           ats: 'meta',       slug: 'meta' },
  { company: 'Uber',           ats: 'uber',       slug: 'uber' },
  { company: 'Stripe',         ats: 'stripe',     slug: 'stripe' },
  { company: 'IBM',            ats: 'ibm',        slug: 'ibm' },
  { company: 'Nvidia',         ats: 'nvidia',     slug: 'nvidia' },
];

const BOARD_PROVIDERS = new Set([
  'glassdoor','hackernews','hasjob','indeed','internshala',
  'linkedin','naukri','remoteok','wellfound','weworkremotely','bayt'
]);
const COMPANY_PROVIDERS = new Set([
  'google','amazon','microsoft','ibm','apple','uber','stripe','meta','nvidia'
]);

interface RunResult {
  ats: string;
  slug: string;
  company: string;
  total: number;
  filtered: number;
  saved: number;
  skipped: number;
  durationMs: number;
  status: 'OK' | 'TIMEOUT' | 'ERROR';
  error?: string;
  jobs?: NormalizedJob[];
  dryRun?: boolean;
}

interface NormalizedJob {
  title: string;
  company: string;
  company_website: string | null;
  description: string;
  apply_link: string;
  locations: string[];
  work_mode: 'REMOTE' | 'HYBRID' | 'ONSITE' | null;
  required_skills: string[];
  experience_min: number;
  experience_max: number;
  salary_range: string;
  posted_at: string | null;
  source_ats: string | null;
  department: string | null;
  allowed_degrees: string[];
  allowed_passout_years: number[];
}

export function DiscoveryWorkspace() {
  const [engineStatus, setEngineStatus] = useState<'online'|'offline'|'loading'>('loading');
  const [enginePlugins, setEnginePlugins] = useState(0);
  const [stats, setStats] = useState<{ totalJobsIngested:number; totalJobsSaved:number; totalJobsSkipped:number; totalRuns:number; uptimeSeconds:number } | null>(null);

  const [allPlugins, setAllPlugins] = useState<{ provider:string; providerName:string; hasDetailFetcher:boolean }[]>([]);

  type ConnectorTab = 'companies' | 'boards' | 'adapters';
  const [connectorTab, setConnectorTab] = useState<ConnectorTab>('companies');

  const [runResults, setRunResults] = useState<Record<string, RunResult & { running?: boolean }>>({});
  const [dryRunModal, setDryRunModal] = useState<{ open: boolean; jobs: NormalizedJob[]; company: string }>({ open: false, jobs: [], company: '' });

  useEffect(() => {
    // Health
    fetch(`${INGESTION_URL}/health`)
      .then(r => r.json())
      .then(d => { setEngineStatus('online'); setEnginePlugins(d.plugins); })
      .catch(() => setEngineStatus('offline'));

    // Stats
    fetch(`${INGESTION_URL}/stats`)
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});

    // Plugins
    fetch(`${INGESTION_URL}/plugins`)
      .then(r => r.json())
      .then(d => setAllPlugins(d.plugins))
      .catch(() => {});
  }, []);

  const atsAdapters = allPlugins.filter(p => !BOARD_PROVIDERS.has(p.provider) && !COMPANY_PROVIDERS.has(p.provider));
  const boards      = allPlugins.filter(p => BOARD_PROVIDERS.has(p.provider));

  async function runCompany(target: typeof COMPANY_TARGETS[0], dryRun = false) {
    setRunResults(prev => ({ ...prev, [target.slug]: { running: true } as any }));
    try {
      const res = await fetch(`${INGESTION_URL}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(INGESTION_SECRET ? { 'Authorization': `Bearer ${INGESTION_SECRET}` } : {})
        },
        body: JSON.stringify({ ats: target.ats, slug: target.slug, company: target.company, filter: true, dryRun })
      });
      const result: RunResult = await res.json();
      setRunResults(prev => ({ ...prev, [target.slug]: result }));
      if (dryRun && result.jobs?.length) {
        setDryRunModal({ open: true, jobs: result.jobs, company: target.company });
      }
    } catch (e) {
      setRunResults(prev => ({ ...prev, [target.slug]: { status: 'ERROR', error: String(e), running: false } as any }));
    }
  }

  async function runAll() {
    try {
      await fetch(`${INGESTION_URL}/run/all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(INGESTION_SECRET ? { 'Authorization': `Bearer ${INGESTION_SECRET}` } : {}) },
        body: JSON.stringify({ filter: true })
      });
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b border-border bg-card gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className={cn("px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5", engineStatus === 'online' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>
            <div className={cn("w-1.5 h-1.5 rounded-full", engineStatus === 'online' ? "bg-emerald-500" : "bg-red-500")} />
            {engineStatus === 'loading' ? 'Connecting...' : `Engine ${engineStatus === 'online' ? 'Live' : 'Offline'} (${enginePlugins} ATS Plugins)`}
          </div>
          <div className="font-mono text-xs text-muted-foreground flex gap-4 flex-wrap">
            <span>Jobs Ingested: {stats?.totalJobsIngested ?? 0}</span>
            <span>Saved: {stats?.totalJobsSaved ?? 0}</span>
            <span>Runs: {stats?.totalRuns ?? 0}</span>
          </div>
        </div>
        <button onClick={runAll} className="px-3 py-1.5 bg-foreground text-background text-xs font-medium rounded hover:opacity-90 transition-opacity">
          Run All Crawlers →
        </button>
      </div>

      {/* Main Content */}
      <div className="p-4 sm:p-6 flex-1">
        {/* Connectors Section Sub-tabs */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
          <button onClick={() => setConnectorTab('companies')} className={cn("px-3 py-1.5 rounded-md text-sm transition-colors whitespace-nowrap", connectorTab === 'companies' ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:text-foreground")}>
            Target Companies (19)
          </button>
          <button onClick={() => setConnectorTab('boards')} className={cn("px-3 py-1.5 rounded-md text-sm transition-colors whitespace-nowrap", connectorTab === 'boards' ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:text-foreground")}>
            Job Boards (11)
          </button>
          <button onClick={() => setConnectorTab('adapters')} className={cn("px-3 py-1.5 rounded-md text-sm transition-colors whitespace-nowrap", connectorTab === 'adapters' ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:text-foreground")}>
            ATS Adapters (40)
          </button>
        </div>

        {/* Tab Content */}
        {connectorTab === 'companies' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {COMPANY_TARGETS.map(target => {
              const runResult = runResults[target.slug];
              return (
                <div key={target.slug} className="border border-border/40 rounded-lg p-4 bg-card flex flex-col gap-3 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div className="overflow-hidden">
                      <h3 className="text-foreground font-medium truncate">{target.company}</h3>
                      <p className="text-muted-foreground text-xs font-mono mt-1 truncate">slug: {target.slug}</p>
                    </div>
                    <div className="flex gap-1.5 shrink-0 ml-2">
                      <span className="bg-muted/50 text-muted-foreground font-mono text-[10px] border border-border/40 px-2 py-0.5 rounded">
                        {target.ats}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => runCompany(target, false)} disabled={runResult?.running} className="px-2.5 py-1 text-xs font-medium bg-muted text-foreground rounded border border-border/40 hover:bg-muted/80 disabled:opacity-50">
                      ▶ Run Crawler
                    </button>
                    <button onClick={() => runCompany(target, true)} disabled={runResult?.running} className="px-2.5 py-1 text-xs font-medium bg-muted text-foreground rounded border border-border/40 hover:bg-muted/80 disabled:opacity-50">
                      ⟳ Dry Run
                    </button>
                  </div>
                  {runResult && !runResult.running && (
                    <div className="pt-3 border-t border-border/40 mt-1 flex items-center justify-between">
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span className={cn(runResult.status === 'OK' ? "text-emerald-500" : runResult.status === 'TIMEOUT' ? "text-amber-500" : "text-red-500")}>
                          {runResult.status === 'OK' ? '✓' : '!'}
                        </span>
                        <span>{runResult.saved ?? 0} saved · {runResult.skipped ?? 0} skipped · {((runResult.durationMs ?? 0) / 1000).toFixed(1)}s</span>
                      </div>
                      <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded", runResult.status === 'OK' ? "bg-muted/50 text-muted-foreground border border-border/40" : runResult.status === 'TIMEOUT' ? "bg-amber-500/10 text-amber-500" : "bg-red-500/10 text-red-500")}>
                        {runResult.status}
                      </span>
                    </div>
                  )}
                  {runResult?.running && (
                    <div className="pt-3 border-t border-border/40 mt-1">
                      <div className="text-xs text-muted-foreground">Running...</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {connectorTab === 'boards' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {boards.map(board => (
              <div key={board.provider} className="border border-border/40 rounded-lg p-4 bg-card flex flex-col gap-3 shadow-sm">
                <div>
                  <h3 className="text-foreground font-mono text-sm">{board.provider}</h3>
                  <p className="text-muted-foreground text-xs mt-1">{board.providerName}</p>
                </div>
                <button onClick={() => {
                  fetch(`${INGESTION_URL}/run`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...(INGESTION_SECRET ? { 'Authorization': `Bearer ${INGESTION_SECRET}` } : {}) },
                    body: JSON.stringify({ ats: board.provider, slug: board.provider, company: board.providerName, filter: true })
                  });
                }} className="px-2.5 py-1 text-xs font-medium bg-muted text-foreground rounded border border-border/40 hover:bg-muted/80 mt-auto self-start">
                  ▶ Scrape Board
                </button>
              </div>
            ))}
          </div>
        )}

        {connectorTab === 'adapters' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {atsAdapters.map(adapter => (
              <div key={adapter.provider} className="border border-border/40 rounded-lg p-4 bg-card flex flex-col gap-3 shadow-sm">
                <div>
                  <h3 className="text-foreground font-mono text-sm truncate">{adapter.provider}</h3>
                  <p className="text-muted-foreground text-xs mt-1 truncate">{adapter.providerName}</p>
                  {adapter.hasDetailFetcher && (
                    <span className="inline-block mt-2 text-[10px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">Detail Fetcher ✓</span>
                  )}
                </div>
                <button onClick={() => {
                  const targets = COMPANY_TARGETS.filter(t => t.ats === adapter.provider);
                  if (targets.length) {
                    fetch(`${INGESTION_URL}/run/batch`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', ...(INGESTION_SECRET ? { 'Authorization': `Bearer ${INGESTION_SECRET}` } : {}) },
                      body: JSON.stringify(targets.map(t => ({ ats: t.ats, slug: t.slug, company: t.company, filter: true })))
                    });
                  }
                }} className="px-2.5 py-1 text-xs font-medium bg-muted text-foreground rounded border border-border/40 hover:bg-muted/80 mt-auto self-start">
                  ⟳ Run All {adapter.providerName} Targets
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dry Run Modal */}
      {dryRunModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl shadow-lg w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border/40 flex justify-between items-center bg-card">
              <div>
                <h2 className="text-lg font-medium text-foreground">Dry Run Preview — {dryRunModal.company}</h2>
                <p className="text-sm text-muted-foreground">{dryRunModal.jobs.length} jobs would be saved</p>
              </div>
              <button onClick={() => setDryRunModal({ open: false, jobs: [], company: '' })} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
            </div>
            <div className="overflow-y-auto p-4 flex flex-col gap-3 bg-muted/10">
              {dryRunModal.jobs.map((job, i) => (
                <div key={i} className="border border-border/40 rounded-lg p-3 bg-card shadow-sm">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <h3 className="font-medium text-sm text-foreground leading-tight">{job.title}</h3>
                    <div className="flex gap-1.5 shrink-0">
                      {job.work_mode && <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-border/40">{job.work_mode}</span>}
                      {job.locations?.[0] && <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-border/40">{job.locations[0]}</span>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 items-center mb-3">
                    <a href={job.apply_link} target="_blank" rel="noreferrer" className="text-xs font-medium text-foreground hover:underline flex items-center gap-1">
                      Apply <span className="text-[10px]">↗</span>
                    </a>
                    <span className="text-xs text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded">{job.experience_min}–{job.experience_max} yrs</span>
                  </div>
                  {job.required_skills && job.required_skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-auto">
                      {job.required_skills.slice(0, 5).map(s => (
                        <span key={s} className="bg-muted/50 text-muted-foreground font-mono text-[10px] rounded px-1.5 py-0.5 border border-border/40">{s}</span>
                      ))}
                      {job.required_skills.length > 5 && (
                        <span className="text-muted-foreground font-mono text-[10px] rounded px-1.5 py-0.5">+{job.required_skills.length - 5} more</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {dryRunModal.jobs.length === 0 && (
                <div className="text-center text-muted-foreground py-8 text-sm">No jobs found in this dry run.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
