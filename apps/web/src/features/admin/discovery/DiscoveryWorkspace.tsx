'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  MagnifyingGlassIcon,
  BuildingOfficeIcon,
  GlobeAltIcon,
  ServerIcon,
  PlusIcon,
  DocumentTextIcon,
  ServerStackIcon,
  CpuChipIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { cn } from '@repo/ui/utils/cn';

import { apiClient } from '@/lib/api/client';
import { INGESTION_URL, BOARD_SET, COMPANY_PROVIDER_SET } from './constants';
import {
  IngestionTarget,
  PluginEntry,
  Opportunity,
  RunResult,
  RunLog,
  TelemetryStats,
  HashTab,
  ConnectorSubTab,
  NormalizedJob,
} from './types';

import { DiscoveryHeader } from './components/DiscoveryHeader';
import { TargetCompaniesTab } from './components/TargetCompaniesTab';
import { CareerBoardsTab } from './components/CareerBoardsTab';
import { AtsAdaptersTab } from './components/AtsAdaptersTab';
import { OpportunityQueueTab } from './components/OpportunityQueueTab';
import { CrawlerRunsTab } from './components/CrawlerRunsTab';

import { DryRunModal } from './modals/DryRunModal';
import { AddTargetModal } from './modals/AddTargetModal';
import { PayloadModal } from './modals/PayloadModal';

export function DiscoveryWorkspace({ isStandalone = false }: { isStandalone?: boolean }) {
  const [activeHash, setActiveHash] = useState<HashTab>('queue');
  const [connectorSubTab, setConnectorSubTab] = useState<ConnectorSubTab>('companies');

  const [searchQuery, setSearchQuery] = useState('');

  // Microservice & DB state
  const [engineOnline, setEngineOnline] = useState<boolean | null>(null);
  const [enginePluginCount, setEnginePluginCount] = useState(0);
  const [stats, setStats] = useState<TelemetryStats>({});

  const [companyTargets, setCompanyTargets] = useState<IngestionTarget[]>([]);
  const [allPlugins, setAllPlugins] = useState<PluginEntry[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoadingOpps, setIsLoadingOpps] = useState(false);

  // Execution state
  const [runResults, setRunResults] = useState<Record<string, RunResult & { running?: boolean }>>({});
  const [runLogs, setRunLogs] = useState<RunLog[]>([]);
  const [runningBoardId, setRunningBoardId] = useState<string | null>(null);
  const [runningAdapterId, setRunningAdapterId] = useState<string | null>(null);

  // Modals state
  const [dryRunModal, setDryRunModal] = useState<{ open: boolean; result: RunResult | null }>({
    open: false,
    result: null,
  });
  const [payloadModal, setPayloadModal] = useState<{ open: boolean; data: unknown; title?: string }>({
    open: false,
    data: null,
  });
  const [isAddTargetOpen, setIsAddTargetOpen] = useState(false);

  // Action status
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [runAllConfirm, setRunAllConfirm] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);

  // Computed plugin classifications
  const boards = allPlugins.filter((p) => BOARD_SET.has(p.provider));
  const atsAdapters = allPlugins.filter(
    (p) => !BOARD_SET.has(p.provider) && !COMPANY_PROVIDER_SET.has(p.provider)
  );

  // Sync window.location.hash
  useEffect(() => {
    const syncHash = () => {
      const hash = window.location.hash.replace('#', '') as HashTab;
      if (['queue', 'connectors', 'runs', 'verified'].includes(hash)) {
        setActiveHash(hash);
      } else {
        setActiveHash('queue');
      }
    };
    syncHash();
    window.addEventListener('hashchange', syncHash);
    return () => window.removeEventListener('hashchange', syncHash);
  }, []);

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Fetch ingestion health, telemetry stats, plugins, and default target companies
  const fetchInitialData = useCallback(async () => {
    // Health
    fetch(`${INGESTION_URL}/health`)
      .then((r) => r.json())
      .then((d) => {
        setEngineOnline(d.status === 'ok');
        setEnginePluginCount(d.plugins ?? 0);
      })
      .catch(() => setEngineOnline(false));

    // Telemetry Stats
    fetch(`${INGESTION_URL}/stats`)
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});

    // All plugins
    fetch(`${INGESTION_URL}/plugins`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.plugins) setAllPlugins(d.plugins);
      })
      .catch(() => {});

    // Ingestion default targets
    fetch(`${INGESTION_URL}/run/targets`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d)) setCompanyTargets(d);
      })
      .catch(() => {});
  }, []);

  // Fetch DB opportunities filtered by status
  const fetchOpportunities = useCallback(async (statusFilter: string) => {
    setIsLoadingOpps(true);
    try {
      const res = await apiClient<{ data: Opportunity[] }>(
        `/api/admin/opportunities?status=${statusFilter}&limit=100&sort=createdAt_desc`
      );
      setOpportunities(res?.data ?? []);
    } catch {
      setOpportunities([]);
    } finally {
      setIsLoadingOpps(false);
    }
  }, []);

  useEffect(() => {
    void fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    if (activeHash === 'queue') void fetchOpportunities('PENDING_REVIEW');
    else if (activeHash === 'verified') void fetchOpportunities('PUBLISHED');
  }, [activeHash, fetchOpportunities]);

  // Execute single crawler (target / board / custom)
  const handleRunTarget = async (
    target: { ats: string; slug: string; company: string },
    isDryRun = false
  ) => {
    const key = target.slug;
    setRunResults((prev) => ({
      ...prev,
      [key]: { ...(prev[key] || {}), running: true } as RunResult & { running: boolean },
    }));

    const tid = toast.loading(`${isDryRun ? 'Dry Run' : 'Crawling'}: ${target.company}...`);
    const startedAt = new Date().toISOString();

    try {
      const res = await fetch(`${INGESTION_URL}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ats: target.ats,
          slug: target.slug,
          company: target.company,
          filter: true,
          dryRun: isDryRun,
        }),
      });

      const result: RunResult = await res.json();
      setRunResults((prev) => ({ ...prev, [key]: { ...result, running: false } }));

      // Append to session logs
      setRunLogs((prev) => [
        { key, company: target.company, ats: target.ats, result, startedAt, isDryRun },
        ...prev,
      ]);

      if (isDryRun && result.jobs?.length) {
        setDryRunModal({ open: true, result });
      }

      if (result.status === 'OK') {
        toast.success(
          `${target.company}: ${result.saved} saved · ${result.skipped} skipped · ${(result.durationMs / 1000).toFixed(1)}s`,
          { id: tid }
        );
      } else {
        toast.error(
          `${target.company}: ${result.status}${result.error ? ` — ${result.error}` : ''}`,
          { id: tid }
        );
      }

      // Refresh opportunities & stats
      void fetchInitialData();
      if (activeHash === 'queue') void fetchOpportunities('PENDING_REVIEW');
    } catch {
      setRunResults((prev) => ({
        ...prev,
        [key]: { ...(prev[key] || {}), running: false, status: 'ERROR' } as RunResult & {
          running: boolean;
        },
      }));
      toast.error(`Failed to reach ingestion service for ${target.company}`, { id: tid });
    }
  };

  // Execute batch run
  const triggerRunAll = () => {
    if (!runAllConfirm) {
      setRunAllConfirm(true);
      setTimeout(() => setRunAllConfirm(false), 3000);
      return;
    }
    setRunAllConfirm(false);
    handleRunAllConnectors();
  };

  const handleRunAllConnectors = async () => {
    setIsRunningAll(true);
    const tid = toast.loading('Running all default crawlers batch...');

    try {
      const res = await fetch(`${INGESTION_URL}/run/all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filter: true }),
      });

      const result = await res.json();
      toast.success(
        `Batch complete: ${result.success ?? 0} OK · ${result.failed ?? 0} failed · ${result.totalJobsSaved ?? 0} saved`,
        { id: tid }
      );

      void fetchInitialData();
      if (activeHash === 'queue') void fetchOpportunities('PENDING_REVIEW');
    } catch {
      toast.error('Batch execution failed', { id: tid });
    } finally {
      setIsRunningAll(false);
    }
  };

  // Publish all
  const handlePublishAll = async () => {
    const pending = opportunities.filter((o) => o.status === 'PENDING_REVIEW');
    for (const opp of pending) {
      await handlePublishOpportunity(opp.id);
    }
  };

  // Publish opportunity
  const handlePublishOpportunity = async (id: string) => {
    setIsActionLoading(id);
    try {
      await apiClient(`/api/admin/opportunities/${id}/publish`, { method: 'POST' });
      setOpportunities((prev) => prev.filter((j) => j.id !== id));
      toast.success('Opportunity published to live feed');
    } catch {
      toast.error('Failed to publish opportunity');
    }
    setIsActionLoading(null);
  };

  // Reject opportunity
  const handleRejectOpportunity = async (id: string) => {
    setIsActionLoading(id);
    try {
      await apiClient(`/api/admin/opportunities/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Rejected from Discovery control review' }),
      });
      setOpportunities((prev) => prev.filter((j) => j.id !== id));
      toast.success('Opportunity rejected and archived');
    } catch {
      toast.error('Failed to reject opportunity');
    }
    setIsActionLoading(null);
  };

  // Filter lists by search query
  const query = searchQuery.toLowerCase().trim();

  const filteredCompanyTargets = companyTargets.filter(
    (t) => !query || t.company.toLowerCase().includes(query) || t.ats.toLowerCase().includes(query) || t.slug.toLowerCase().includes(query)
  );

  const filteredBoards = boards.filter(
    (b) => !query || b.providerName.toLowerCase().includes(query) || b.provider.toLowerCase().includes(query)
  );

  const filteredAdapters = atsAdapters.filter(
    (a) => !query || a.providerName.toLowerCase().includes(query) || a.provider.toLowerCase().includes(query)
  );

  const filteredOpportunities = opportunities.filter(
    (j) => !query || (j.company || '').toLowerCase().includes(query) || (j.title || '').toLowerCase().includes(query)
  );

  return (
    <div className="pt-16 md:pt-0 h-full flex flex-col flex-1 min-h-0 overflow-hidden bg-background text-foreground w-full font-sans antialiased">
      {/* Header Bar */}
      <DiscoveryHeader
        isCollapsed={isHeaderCollapsed}
        setIsCollapsed={setIsHeaderCollapsed}
        engineOnline={engineOnline}
        enginePluginCount={enginePluginCount}
        stats={stats}
        isRunningAll={isRunningAll}
        isConfirming={runAllConfirm}
        onRunAll={triggerRunAll}
        onRefreshHealth={fetchInitialData}
        onOpenAddModal={() => setIsAddTargetOpen(true)}
        isStandalone={isStandalone}
      />

      {/* Main Content Area */}
      <div className="flex-1 p-4 sm:p-6 pb-28 sm:pb-6 space-y-4 min-h-0 overflow-y-auto overscroll-contain">
        {/* Workspace Top Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl border border-border/70 bg-card/60 backdrop-blur-md w-full max-w-full overflow-x-auto no-scrollbar shadow-xs shrink-0">
          <button
            onClick={() => { window.location.hash = '#queue'; setActiveHash('queue'); }}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-[background-color,color] duration-150 ease-out cursor-pointer flex items-center gap-2 shrink-0',
              activeHash === 'queue'
                ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            )}
          >
            <DocumentTextIcon className="w-3.5 h-3.5" />
            <span>Ingestion Queue</span>
          </button>

          <button
            onClick={() => { window.location.hash = '#connectors'; setActiveHash('connectors'); }}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-[background-color,color] duration-150 ease-out cursor-pointer flex items-center gap-2 shrink-0',
              activeHash === 'connectors'
                ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            )}
          >
            <ServerStackIcon className="w-3.5 h-3.5" />
            <span>ATS Connectors</span>
          </button>

          <button
            onClick={() => { window.location.hash = '#runs'; setActiveHash('runs'); }}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-[background-color,color] duration-150 ease-out cursor-pointer flex items-center gap-2 shrink-0',
              activeHash === 'runs'
                ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            )}
          >
            <CpuChipIcon className="w-3.5 h-3.5" />
            <span>Crawler Runs</span>
          </button>

          <button
            onClick={() => { window.location.hash = '#verified'; setActiveHash('verified'); }}
            className={cn(
              'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-[background-color,color] duration-150 ease-out cursor-pointer flex items-center gap-2 shrink-0',
              activeHash === 'verified'
                ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
            )}
          >
            <ShieldCheckIcon className="w-3.5 h-3.5" />
            <span>Verified Directory</span>
          </button>
        </div>

        {/* Toolbar & Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <MagnifyingGlassIcon className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeHash === 'connectors'
                  ? `Search ${connectorSubTab}...`
                  : 'Filter by company, title...'
              }
              className="w-full h-9 pl-9 pr-10 rounded-lg border border-border/80 bg-card/80 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 placeholder:text-muted-foreground transition-colors duration-150"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center h-4 px-1.5 rounded-sm border border-border/60 bg-muted/50 text-[10px] text-muted-foreground font-mono">
              /
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeHash === 'connectors' && (
              <button
                onClick={() => setIsAddTargetOpen(true)}
                className="h-8 px-3 rounded-lg border border-border/80 bg-card hover:bg-muted text-xs font-semibold text-foreground flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>Add Target</span>
              </button>
            )}

            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-muted/60 border border-border/60 text-xs text-muted-foreground font-mono hidden sm:inline-block">
              {activeHash === 'connectors'
                ? connectorSubTab === 'companies'
                  ? `${filteredCompanyTargets.length} targets`
                  : connectorSubTab === 'boards'
                  ? `${filteredBoards.length} boards`
                  : `${filteredAdapters.length} adapters`
                : `${filteredOpportunities.length} records`}
            </span>
          </div>
        </div>

        {/* Tab content routing */}
        {activeHash === 'connectors' ? (
          <div className="space-y-4 max-w-6xl">
            {/* Connectors Sub-Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl border border-border/70 bg-card/60 backdrop-blur-md w-full max-w-full overflow-x-auto no-scrollbar shadow-xs shrink-0">
              <button
                onClick={() => setConnectorSubTab('companies')}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150 ease-out cursor-pointer flex items-center gap-2',
                  connectorSubTab === 'companies'
                    ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                )}
              >
                <BuildingOfficeIcon className="w-3.5 h-3.5" />
                <span>Target Companies</span>
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded font-mono text-[10px]',
                    connectorSubTab === 'companies'
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-muted/60 text-muted-foreground'
                  )}
                >
                  {filteredCompanyTargets.length}
                </span>
              </button>

              <button
                onClick={() => setConnectorSubTab('boards')}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150 ease-out cursor-pointer flex items-center gap-2',
                  connectorSubTab === 'boards'
                    ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                )}
              >
                <GlobeAltIcon className="w-3.5 h-3.5" />
                <span>Career Boards</span>
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded font-mono text-[10px]',
                    connectorSubTab === 'boards'
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-muted/60 text-muted-foreground'
                  )}
                >
                  {filteredBoards.length}
                </span>
              </button>

              <button
                onClick={() => setConnectorSubTab('adapters')}
                className={cn(
                  'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150 ease-out cursor-pointer flex items-center gap-2',
                  connectorSubTab === 'adapters'
                    ? 'bg-primary text-primary-foreground shadow-xs font-bold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                )}
              >
                <ServerIcon className="w-3.5 h-3.5" />
                <span>ATS Adapters</span>
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded font-mono text-[10px]',
                    connectorSubTab === 'adapters'
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-muted/60 text-muted-foreground'
                  )}
                >
                  {filteredAdapters.length}
                </span>
              </button>
            </div>

            {/* Sub-tab views */}
            {connectorSubTab === 'companies' && (
              <TargetCompaniesTab
                targets={filteredCompanyTargets}
                runResults={runResults}
                onRunTarget={handleRunTarget}
              />
            )}

            {connectorSubTab === 'boards' && (
              <CareerBoardsTab
                boards={filteredBoards}
                runningBoardId={runningBoardId}
                onRunBoard={async (board) => {
                  setRunningBoardId(board.provider);
                  await handleRunTarget({ ats: board.provider, slug: board.provider, company: board.providerName });
                  setRunningBoardId(null);
                }}
              />
            )}

            {connectorSubTab === 'adapters' && (
              <AtsAdaptersTab
                adapters={filteredAdapters}
                companyTargets={companyTargets}
                runningAdapterId={runningAdapterId}
                onRunAdapterBatch={async (adapter) => {
                  setRunningAdapterId(adapter.provider);
                  const matchingTargets = companyTargets.filter((t) => t.ats === adapter.provider);
                  if (matchingTargets.length > 0) {
                    for (const t of matchingTargets) {
                      await handleRunTarget(t);
                    }
                  } else {
                    await handleRunTarget({
                      ats: adapter.provider,
                      slug: adapter.provider,
                      company: adapter.providerName,
                    });
                  }
                  setRunningAdapterId(null);
                }}
              />
            )}
          </div>
        ) : activeHash === 'runs' ? (
          <CrawlerRunsTab
            logs={runLogs}
            onInspectJobs={(res) => setDryRunModal({ open: true, result: res })}
          />
        ) : (
          <OpportunityQueueTab
            opportunities={filteredOpportunities}
            isLoading={isLoadingOpps}
            activeHash={activeHash}
            onPublish={handlePublishOpportunity}
            onPublishAll={handlePublishAll}
            onReject={handleRejectOpportunity}
            onInspectPayload={(data) => setPayloadModal({ open: true, data })}
            isActionLoading={isActionLoading}
          />
        )}
      </div>

      {/* Modals */}
      <DryRunModal
        open={dryRunModal.open}
        result={dryRunModal.result}
        onClose={() => setDryRunModal({ open: false, result: null })}
        onInspectJob={(job: NormalizedJob) =>
          setPayloadModal({ open: true, data: job, title: `${job.title} @ ${job.company}` })
        }
      />

      <AddTargetModal
        open={isAddTargetOpen}
        adapters={allPlugins}
        onClose={() => setIsAddTargetOpen(false)}
        onRunCustom={handleRunTarget}
      />

      <PayloadModal
        open={payloadModal.open}
        data={payloadModal.data}
        onClose={() => setPayloadModal({ open: false, data: null })}
        title={payloadModal.title}
      />
    </div>
  );
}
