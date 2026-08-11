'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils/utils';
import { toast } from 'react-hot-toast';

import {
  IngestionTarget,
  PluginEntry,
  NormalizedJob,
  RunResult,
  RunLog,
  TelemetryStats,
  DiscoveryRun,
} from './types';

import { DiscoveryHeader } from './components/DiscoveryHeader';
import { DashboardTab } from './components/DashboardTab';
import { DiscoveryRunsTab } from './components/DiscoveryRunsTab';
import { DiscoveredJobsTab } from './components/DiscoveredJobsTab';
import { ProcessedJobsTab } from './components/ProcessedJobsTab';
import { TargetCompaniesTab } from './components/TargetCompaniesTab';
import { AtsAdaptersTab } from './components/AtsAdaptersTab';
import { JobBoardsTab } from './components/JobBoardsTab';

const INGESTION_URL = process.env.NEXT_PUBLIC_INGESTION_URL || 'http://localhost:3005';
const INGESTION_SECRET = process.env.NEXT_PUBLIC_INGESTION_SECRET || '';

const BOARD_PROVIDERS = new Set([
  'glassdoor',
  'hackernews',
  'hasjob',
  'indeed',
  'internshala',
  'linkedin',
  'naukri',
  'remoteok',
  'wellfound',
  'weworkremotely',
  'bayt',
]);

export const COMPANY_PROVIDERS = new Set([
  'google',
  'amazon',
  'microsoft',
  'ibm',
  'apple',
  'uber',
  'stripe',
  'meta',
  'nvidia',
]);

const DISCOVERY_SUB_TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'runs', label: 'Runs' },
  { id: 'discovered', label: 'Discovered' },
  { id: 'processed', label: 'Processed' },
  { id: 'companies', label: 'Companies' },
  { id: 'adapters', label: 'ATS Adapters' },
  { id: 'boards', label: 'Job Boards' },
];

export function DiscoveryWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTab = searchParams.get('tab') || 'dashboard';
  const activeTab = rawTab === 'ats' ? 'adapters' : rawTab;

  const [engineStatus, setEngineStatus] = useState<'online' | 'offline' | 'loading'>('loading');
  const [enginePlugins, setEnginePlugins] = useState(0);
  const [stats, setStats] = useState<any>(null);
  
  const [allPlugins, setAllPlugins] = useState<PluginEntry[]>([]);
  const [allTargets, setAllTargets] = useState<IngestionTarget[]>([]);
  const [runs, setRuns] = useState<DiscoveryRun[]>([]);

  const [runResults, setRunResults] = useState<Record<string, RunResult & { running?: boolean }>>({});
  const [runLogs, setRunLogs] = useState<RunLog[]>([]);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [isRunningAllBoards, setIsRunningAllBoards] = useState(false);
  const [runningAdapterId, setRunningAdapterId] = useState<string | null>(null);
  const [runningBoardId, setRunningBoardId] = useState<string | null>(null);

  const [hoursOld, setHoursOld] = useState<number>(168);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [dryRunModal, setDryRunModal] = useState<{ open: boolean; jobs: NormalizedJob[]; company: string }>({
    open: false,
    jobs: [],
    company: '',
  });

  const checkHealth = async () => {
    try {
      const r = await fetch(`${INGESTION_URL}/health`);
      const d = await r.json();
      setEngineStatus('online');
      setEnginePlugins(d.plugins || 0);
    } catch {
      setEngineStatus('offline');
    }
  };

  const loadInitialData = async () => {
    checkHealth();

    fetch('/api/admin/discovery/stats')
      .then(r => r.json())
      .then(setStats)
      .catch(() => {});
      
    fetch('/api/admin/discovery/runs')
      .then(r => r.json())
      .then(d => setRuns(d.runs || []))
      .catch(() => {});

    fetch('/api/admin/discovery/plugins')
      .then(r => r.json())
      .then(d => setAllPlugins(d.plugins || []))
      .catch(() => {});

    fetch('/api/admin/discovery/targets')
      .then(r => r.json())
      .then(d => setAllTargets(d.targets || []))
      .catch(() => {});
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        loadInitialData();
      }, 30000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const atsAdapters = allPlugins.filter(
    p => !BOARD_PROVIDERS.has(p.provider) && !COMPANY_PROVIDERS.has(p.provider)
  );
  const boards = allPlugins.filter(p => BOARD_PROVIDERS.has(p.provider));

  const handleTabChange = (tabId: string) => {
    router.push(`/admin/discovery?tab=${tabId}`);
  };

  async function runCompany(target: IngestionTarget, dryRun = false) {
    setRunResults(prev => ({ ...prev, [target.slug]: { running: true } as any }));
    const startTime = new Date().toISOString();
    try {
      const res = await fetch(`${INGESTION_URL}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(INGESTION_SECRET ? { Authorization: `Bearer ${INGESTION_SECRET}` } : {}),
        },
        body: JSON.stringify({
          ats: target.ats,
          slug: target.slug,
          company: target.company,
          filter: true,
          dryRun,
          hoursOld,
        }),
      });
      const result: RunResult = await res.json();
      setRunResults(prev => ({ ...prev, [target.slug]: result }));

      setRunLogs(prev => [
        {
          key: target.slug,
          company: target.company,
          ats: target.ats,
          result,
          startedAt: startTime,
          isDryRun: dryRun,
        },
        ...prev,
      ]);

      if (dryRun && result.jobs?.length) {
        setDryRunModal({ open: true, jobs: result.jobs, company: target.company });
      }
    } catch (e) {
      setRunResults(prev => ({
        ...prev,
        [target.slug]: { status: 'ERROR', error: String(e), running: false } as any,
      }));
    }
  }

  async function runAllCompanies() {
    setIsRunningAll(true);
    try {
      for (const target of allTargets) {
        await runCompany(target);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunningAll(false);
    }
  }

  async function runAllBoards() {
    setIsRunningAllBoards(true);
    try {
      for (const board of boards) {
        await runBoard(board.provider);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRunningAllBoards(false);
    }
  }

  async function runAdapterBatch(adapter: PluginEntry) {
    setRunningAdapterId(adapter.provider);
    const targets = allTargets.filter(t => t.ats === adapter.provider);
    try {
      for (const target of targets) {
        await runCompany(target);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRunningAdapterId(null);
    }
  }

  async function runBoard(boardSlug: string) {
    setRunningBoardId(boardSlug);
    const boardPlugin = allPlugins.find(p => p.provider === boardSlug);
    try {
      await fetch(`${INGESTION_URL}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(INGESTION_SECRET ? { Authorization: `Bearer ${INGESTION_SECRET}` } : {}),
        },
        body: JSON.stringify({
          ats: boardSlug,
          slug: boardSlug,
          company: boardPlugin?.providerName || boardSlug,
          filter: true,
          hoursOld,
        }),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setRunningBoardId(null), 2500);
    }
  }

  async function runDorker() {
    try {
      await fetch(`${INGESTION_URL}/dork`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(INGESTION_SECRET ? { Authorization: `Bearer ${INGESTION_SECRET}` } : {}),
        }
      });
      toast.success('Dorker started in background');
    } catch (e) {
      console.error(e);
      toast.error('Failed to start Dorker');
    }
  }

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden relative">
      {/* Discovery Top Header */}
      <DiscoveryHeader
        isCollapsed={isHeaderCollapsed}
        setIsCollapsed={setIsHeaderCollapsed}
        engineOnline={engineStatus === 'online'}
        enginePluginCount={enginePlugins}
        stats={stats || {}}
        isRunningAll={isRunningAll}
        isRunningAllBoards={isRunningAllBoards}
        onRunAllCompanies={runAllCompanies}
        onRunAllBoards={runAllBoards}
        onRefreshHealth={checkHealth}
        onOpenAddModal={() => {}}
        onRunDorker={runDorker}
        autoRefresh={autoRefresh}
        setAutoRefresh={setAutoRefresh}
        lastRunTime={runs[0]?.startedAt}
        hoursOld={hoursOld}
        setHoursOld={setHoursOld}
      />

      {/* Mobile Sub-Tabs Bar */}
      <div className="md:hidden flex items-center gap-1.5 overflow-x-auto no-scrollbar px-4 py-2 bg-card/90 backdrop-blur-md border-b border-border/60 shrink-0 select-none">
        {DISCOVERY_SUB_TABS.map((tab) => {
          const isActive = activeTab === tab.id || (activeTab === 'ats' && tab.id === 'adapters');
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 cursor-pointer border',
                isActive
                  ? 'bg-primary text-primary-foreground font-bold border-primary shadow-xs'
                  : 'bg-muted/30 text-muted-foreground border-border/40 hover:bg-muted hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Tab Content Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div key={activeTab} className="animate-in fade-in duration-150 h-full w-full">
          {activeTab === 'dashboard' && (
            <DashboardTab
              engineStatus={engineStatus}
              enginePlugins={enginePlugins}
              stats={stats}
              allTargets={allTargets}
              recentRuns={runs.slice(0, 5)}
              onRunAll={runAllCompanies}
              onNavigateTab={handleTabChange}
            />
          )}

        {activeTab === 'runs' && (
          <DiscoveryRunsTab runs={runs} onTriggerRun={runAllCompanies} />
        )}

        {activeTab === 'discovered' && <DiscoveredJobsTab />}

        {activeTab === 'processed' && <ProcessedJobsTab />}

        {activeTab === 'companies' && (
          <TargetCompaniesTab
            targets={allTargets}
            runResults={runResults}
            onRunTarget={runCompany}
          />
        )}

        {(activeTab === 'adapters' || activeTab === 'ats') && (
          <AtsAdaptersTab
            adapters={atsAdapters.length ? atsAdapters : allPlugins}
            companyTargets={allTargets}
            runningAdapterId={runningAdapterId}
            onRunAdapterBatch={runAdapterBatch}
          />
        )}

          {activeTab === 'boards' && (
            <JobBoardsTab
              boards={boards}
              runningBoardId={runningBoardId}
              onRunBoard={runBoard}
            />
          )}
        </div>
      </div>

      {/* Dry Run Modal */}
      {dryRunModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border/40 flex justify-between items-center bg-card">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Dry Run Preview — {dryRunModal.company}
                </h2>
                <p className="text-xs text-muted-foreground font-mono">
                  {dryRunModal.jobs.length} normalized jobs extracted
                </p>
              </div>
              <button
                onClick={() => setDryRunModal({ open: false, jobs: [], company: '' })}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors cursor-pointer"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto p-4 space-y-3 bg-muted/10 font-sans">
              {dryRunModal.jobs.map((job, i) => (
                <div key={i} className="border border-border/60 rounded-xl p-3.5 bg-card shadow-xs space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-bold text-sm text-foreground leading-tight">{job.title}</h3>
                    <div className="flex gap-1.5 shrink-0">
                      {job.work_mode && (
                        <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/40 font-mono">
                          {job.work_mode}
                        </span>
                      )}
                      {job.locations?.[0] && (
                        <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded border border-border/40 font-mono">
                          {job.locations[0]}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 items-center text-xs">
                    <a
                      href={job.apply_link}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-primary hover:underline flex items-center gap-1"
                    >
                      Apply Link <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                    </a>
                    <span className="text-muted-foreground font-mono text-[11px]">
                      Exp: {job.experience_min}–{job.experience_max} yrs
                    </span>
                  </div>

                  {job.required_skills && job.required_skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {job.required_skills.slice(0, 5).map(s => (
                        <span
                          key={s}
                          className="bg-muted/60 text-muted-foreground font-mono text-[10px] rounded px-1.5 py-0.5 border border-border/40"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {dryRunModal.jobs.length === 0 && (
                <div className="text-center text-muted-foreground py-8 text-xs font-mono">
                  No jobs found in this dry run execution.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

