"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast } from "sonner";
import { Loader2, Play, Plus, RefreshCw, ToggleLeft, ToggleRight, Trash2, X, ChevronDown, ChevronRight } from "lucide-react";

type SourceType = "JSON_FEED" | "WORKDAY" | "GREENHOUSE" | "LEVER" | "CUSTOM";
type DefaultType = "JOB" | "INTERNSHIP" | "WALKIN";
type HealthStatus = "healthy" | "degraded" | "failing" | "unknown";

type IngestionSource = {
    id: string;
    name: string;
    sourceType: SourceType;
    endpoint: string;
    enabled: boolean;
    runFrequencyMinutes: number;
    defaultType: DefaultType;
    lastRunAt: string | null;
    lastSuccessAt: string | null;
    health: HealthStatus;
    latestRun: {
        id: string;
        status: string;
        fetchedCount: number;
        draftCreatedCount: number;
        dedupedCount: number;
        rejectedCount: number;
        errorCount: number;
        startedAt: string;
        endedAt: string | null;
    } | null;
};

type IngestionRun = {
    id: string;
    status: string;
    fetchedCount: number;
    draftCreatedCount: number;
    dedupedCount: number;
    rejectedCount: number;
    errorCount: number;
    startedAt: string;
    endedAt: string | null;
    source: { id: string; name: string; sourceType: string };
};

const SOURCE_TYPES: SourceType[] = ["JSON_FEED", "GREENHOUSE", "LEVER", "WORKDAY", "CUSTOM"];
const DEFAULT_TYPES: DefaultType[] = ["JOB", "INTERNSHIP", "WALKIN"];

const healthDot: Record<HealthStatus, string> = {
    healthy: "bg-green-500",
    degraded: "bg-amber-500",
    failing: "bg-red-500",
    unknown: "bg-zinc-400",
};

const statusColor: Record<string, string> = {
    SUCCESS: "text-green-600 dark:text-green-400",
    PARTIAL: "text-amber-600 dark:text-amber-400",
    FAILED: "text-red-600 dark:text-red-400",
    RUNNING: "text-blue-600 dark:text-blue-400",
};

const blankForm = { name: "", endpoint: "", sourceType: "LEVER" as SourceType, runFrequencyMinutes: 720, defaultType: "JOB" as DefaultType };

export default function IngestionPanel() {
    const [sources, setSources] = useState<IngestionSource[]>([]);
    const [runs, setRuns] = useState<IngestionRun[]>([]);
    const [loading, setLoading] = useState(true);
    const [runsLoading, setRunsLoading] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [runningId, setRunningId] = useState<string | null>(null);
    const [runningAll, setRunningAll] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [formMode, setFormMode] = useState<"single" | "bulk">("bulk");
    const [form, setForm] = useState(blankForm);
    const [bulkSlugs, setBulkSlugs] = useState("");
    const [bulkType, setBulkType] = useState<SourceType>("LEVER");
    const [submitting, setSubmitting] = useState(false);
    const [selectedSourceId, setSelectedSourceId] = useState<string | undefined>(undefined);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<SourceType | "ALL">("ALL");
    const [filterHealth, setFilterHealth] = useState<HealthStatus | "ALL">("ALL");
    const [deletingFailing, setDeletingFailing] = useState(false);

    const loadSources = async () => {
        setLoading(true);
        try {
            const res = await adminApi.getIngestionSources() as { sources: IngestionSource[] };
            setSources(res.sources || []);
        } catch {
            toast.error("Failed to load ingestion sources");
        } finally {
            setLoading(false);
        }
    };

    const loadRuns = async (sourceId?: string) => {
        setRunsLoading(true);
        try {
            const res = await adminApi.getIngestionRuns(sourceId, 20) as { runs: IngestionRun[] };
            setRuns(res.runs || []);
        } catch {
            toast.error("Failed to load runs");
        } finally {
            setRunsLoading(false);
        }
    };

    useEffect(() => { loadSources(); loadRuns(); }, []);

    const onToggle = async (source: IngestionSource) => {
        setTogglingId(source.id);
        try {
            await adminApi.toggleIngestionSource(source.id, !source.enabled);
            toast.success(`${source.name} ${source.enabled ? "disabled" : "enabled"}`);
            await loadSources();
        } catch {
            toast.error("Toggle failed");
        } finally {
            setTogglingId(null);
        }
    };

    const onRun = async (source: IngestionSource) => {
        setRunningId(source.id);
        try {
            const res = await adminApi.triggerIngestionRun(source.id) as { result: { fetchedCount: number; draftCreatedCount: number } };
            toast.success(`${source.name}: ${res.result?.fetchedCount ?? 0} fetched, ${res.result?.draftCreatedCount ?? 0} drafts`);
            await Promise.all([loadSources(), loadRuns(selectedSourceId)]);
        } catch {
            toast.error("Run failed");
        } finally {
            setRunningId(null);
        }
    };

    const onRunAll = async (type?: string) => {
        const label = type || "ALL";
        setRunningAll(label);
        try {
            if (type) {
                const res = await adminApi.runAllByType(type) as { result: { total: number } };
                toast.success(`Ran ${res.result?.total ?? 0} ${type} sources`);
            } else {
                for (const source of sources.filter(s => s.enabled)) {
                    try { await adminApi.triggerIngestionRun(source.id); } catch { /* continue */ }
                }
                toast.success(`Ran ${sources.filter(s => s.enabled).length} sources`);
            }
            await Promise.all([loadSources(), loadRuns(selectedSourceId)]);
        } catch {
            toast.error(`Run all ${label} failed`);
        } finally {
            setRunningAll(null);
        }
    };

    const onDelete = async (source: IngestionSource) => {
        try {
            await adminApi.deleteIngestionSource(source.id);
            toast.success(`"${source.name}" deleted`);
            setSources(prev => prev.filter(s => s.id !== source.id));
        } catch {
            toast.error("Delete failed");
        }
    };

    const onDeleteAllFailing = async () => {
        const failingSources = sources.filter(s => s.health === "failing");
        if (failingSources.length === 0) return;
        setDeletingFailing(true);
        let deleted = 0;
        for (const source of failingSources) {
            try {
                await adminApi.deleteIngestionSource(source.id);
                deleted++;
                setSources(prev => prev.filter(s => s.id !== source.id));
            } catch { /* continue */ }
        }
        toast.success(`Deleted ${deleted} failing sources`);
        setDeletingFailing(false);
    };

    const onBulkImport = async () => {
        const slugs = bulkSlugs.split('\n').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
        if (slugs.length === 0) return;
        setSubmitting(true);
        try {
            const res = await adminApi.bulkImportSources(slugs, bulkType) as { created: number; skipped: number };
            toast.success(`${res.created} created, ${res.skipped} skipped (duplicates)`);
            setBulkSlugs("");
            setShowForm(false);
            await loadSources();
        } catch {
            toast.error("Bulk import failed");
        } finally {
            setSubmitting(false);
        }
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim() || !form.endpoint.trim()) return;
        setSubmitting(true);
        try {
            await adminApi.createIngestionSource(form);
            toast.success(`Source "${form.name}" added`);
            setForm(blankForm);
            setShowForm(false);
            await loadSources();
        } catch {
            toast.error("Failed to create source");
        } finally {
            setSubmitting(false);
        }
    };

    const onSelectSource = (id?: string) => {
        setSelectedSourceId(id);
        loadRuns(id);
    };

    // Filtered sources
    const filtered = sources.filter(s => {
        if (filterType !== "ALL" && s.sourceType !== filterType) return false;
        if (filterHealth !== "ALL" && s.health !== filterHealth) return false;
        return true;
    });

    // Stats
    const healthyCt = sources.filter(s => s.health === "healthy").length;
    const failingCt = sources.filter(s => s.health === "failing").length;
    const enabledCt = sources.filter(s => s.enabled).length;
    const totalFetched = sources.reduce((sum, s) => sum + (s.latestRun?.fetchedCount ?? 0), 0);

    return (
        <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: "Total Sources", value: sources.length, sub: `${enabledCt} enabled` },
                    { label: "Healthy", value: healthyCt, sub: `${Math.round((healthyCt / (sources.length || 1)) * 100)}%`, color: "text-green-600 dark:text-green-400" },
                    { label: "Failing", value: failingCt, sub: failingCt > 0 ? "clean up →" : "none", color: "text-red-600 dark:text-red-400" },
                    { label: "Last Fetch Total", value: totalFetched, sub: "jobs across all" },
                ].map(s => (
                    <div key={s.label} className="rounded-xl border bg-card p-4">
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                        <p className={`text-2xl font-bold ${s.color || ""}`}>{s.value}</p>
                        <p className="text-[10px] text-muted-foreground">{s.sub}</p>
                    </div>
                ))}
            </div>

            {/* Sources Card */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                            <CardTitle className="text-base">Ingestion Sources</CardTitle>
                            <CardDescription className="text-xs">ATS feeds → Supabase staging → fresher filter → Neon drafts</CardDescription>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={loadSources}><RefreshCw className="h-3.5 w-3.5" /></Button>
                            <Button size="sm" variant="outline" disabled={!!runningAll} onClick={() => onRunAll("LEVER")}>
                                {runningAll === "LEVER" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Play className="h-3 w-3 mr-1" />}Lever
                            </Button>
                            <Button size="sm" variant="outline" disabled={!!runningAll} onClick={() => onRunAll("GREENHOUSE")}>
                                {runningAll === "GREENHOUSE" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Play className="h-3 w-3 mr-1" />}GH
                            </Button>
                            <Button size="sm" variant="outline" disabled={!!runningAll} onClick={() => onRunAll()}>
                                {runningAll === "ALL" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Play className="h-3 w-3 mr-1" />}All
                            </Button>
                            <Button size="sm" onClick={() => setShowForm(!showForm)}>
                                {showForm ? <X className="h-3.5 w-3.5 mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
                                {showForm ? "Cancel" : "Add"}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-3">
                    {/* Add Source Forms */}
                    {showForm && (
                        <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setFormMode("single")}
                                    className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${formMode === "single" ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}
                                >Single</button>
                                <button
                                    onClick={() => setFormMode("bulk")}
                                    className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${formMode === "bulk" ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"}`}
                                >Bulk Paste</button>
                            </div>

                            {formMode === "single" ? (
                                <form onSubmit={onSubmit} className="space-y-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-muted-foreground">Name</label>
                                            <input className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. Razorpay" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-muted-foreground">Source Type</label>
                                            <select className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.sourceType} onChange={e => setForm(f => ({ ...f, sourceType: e.target.value as SourceType }))}>
                                                {SOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <div className="sm:col-span-2 space-y-1">
                                            <label className="text-xs font-medium text-muted-foreground">Endpoint URL</label>
                                            <input className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="https://api.lever.co/v0/postings/companyname?mode=json" value={form.endpoint} onChange={e => setForm(f => ({ ...f, endpoint: e.target.value }))} required />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-muted-foreground">Default Type</label>
                                            <select className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.defaultType} onChange={e => setForm(f => ({ ...f, defaultType: e.target.value as DefaultType }))}>
                                                {DEFAULT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-muted-foreground">Run Every (min)</label>
                                            <input type="number" min={5} className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={form.runFrequencyMinutes} onChange={e => setForm(f => ({ ...f, runFrequencyMinutes: Number(e.target.value) }))} />
                                        </div>
                                    </div>
                                    <Button type="submit" size="sm" disabled={submitting}>
                                        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}Add Source
                                    </Button>
                                </form>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-muted-foreground">Source Type</label>
                                            <select className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={bulkType} onChange={e => setBulkType(e.target.value as SourceType)}>
                                                <option value="LEVER">LEVER</option>
                                                <option value="GREENHOUSE">GREENHOUSE</option>
                                            </select>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground mt-4">
                                            Paste one slug per line. Endpoint auto-generated. Duplicates skipped.
                                        </p>
                                    </div>
                                    <textarea
                                        className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring min-h-[120px]"
                                        placeholder={"razorpay\nmeesho\natlassian\nfreshworks"}
                                        value={bulkSlugs}
                                        onChange={e => setBulkSlugs(e.target.value)}
                                    />
                                    <div className="flex items-center gap-3">
                                        <Button size="sm" disabled={submitting || !bulkSlugs.trim()} onClick={onBulkImport}>
                                            {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                                            Import {bulkSlugs.trim().split('\n').filter(s => s.trim()).length} slugs
                                        </Button>
                                        <span className="text-[10px] text-muted-foreground">
                                            {bulkType === "LEVER" ? "→ api.lever.co/v0/postings/{slug}?mode=json" : "→ boards-api.greenhouse.io/v1/boards/{slug}/jobs"}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Filters */}
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="text-muted-foreground font-medium">Filter:</span>
                        {(["ALL", ...SOURCE_TYPES] as const).map(t => (
                            <button
                                key={t}
                                onClick={() => setFilterType(t)}
                                className={`px-2 py-1 rounded-md border transition-colors ${filterType === t ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-border"}`}
                            >{t === "ALL" ? "All Types" : t}</button>
                        ))}
                        <span className="text-muted-foreground mx-1">·</span>
                        {(["ALL", "healthy", "failing", "unknown"] as const).map(h => (
                            <button
                                key={h}
                                onClick={() => setFilterHealth(h)}
                                className={`px-2 py-1 rounded-md border transition-colors flex items-center gap-1 ${filterHealth === h ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-border"}`}
                            >
                                {h !== "ALL" && <span className={`inline-block w-1.5 h-1.5 rounded-full ${healthDot[h]}`} />}
                                {h === "ALL" ? "All Health" : h}
                            </button>
                        ))}
                        {failingCt > 0 && (
                            <>
                                <span className="text-muted-foreground mx-1">·</span>
                                <button
                                    onClick={onDeleteAllFailing}
                                    disabled={deletingFailing}
                                    className="px-2 py-1 rounded-md border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 transition-colors flex items-center gap-1"
                                >
                                    {deletingFailing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                    Delete {failingCt} failing
                                </button>
                            </>
                        )}
                        <span className="ml-auto text-muted-foreground">{filtered.length} shown</span>
                    </div>

                    {/* Sources Table */}
                    {loading ? (
                        <div className="py-8 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                    ) : filtered.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4">No sources match your filters.</p>
                    ) : (
                        <div className="rounded-lg border overflow-hidden">
                            {/* Table header */}
                            <div className="grid grid-cols-[1fr_80px_60px_60px_60px_100px] gap-2 px-3 py-2 bg-muted/50 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-b">
                                <span>Source</span>
                                <span className="text-center">Type</span>
                                <span className="text-center">Fetched</span>
                                <span className="text-center">Drafts</span>
                                <span className="text-center">Status</span>
                                <span className="text-right">Actions</span>
                            </div>
                            {/* Rows */}
                            {filtered.map(source => (
                                <div key={source.id}>
                                    <div
                                        className={`grid grid-cols-[1fr_80px_60px_60px_60px_100px] gap-2 px-3 py-2 items-center text-sm border-b last:border-b-0 cursor-pointer transition-colors ${!source.enabled ? "opacity-50" : ""
                                            } ${expandedId === source.id ? "bg-primary/5" : "hover:bg-muted/30"} ${selectedSourceId === source.id ? "ring-1 ring-primary/30" : ""}`}
                                        onClick={() => setExpandedId(expandedId === source.id ? null : source.id)}
                                    >
                                        {/* Name + health */}
                                        <div className="flex items-center gap-2 min-w-0">
                                            {expandedId === source.id ? <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />}
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${healthDot[source.health]}`} />
                                            <span className="font-medium truncate">{source.name}</span>
                                        </div>
                                        {/* Type */}
                                        <div className="text-center">
                                            <Badge variant="outline" className="text-[9px] px-1.5">{source.sourceType}</Badge>
                                        </div>
                                        {/* Fetched */}
                                        <span className="text-center font-mono text-xs">{source.latestRun?.fetchedCount ?? "—"}</span>
                                        {/* Drafts */}
                                        <span className={`text-center font-mono text-xs ${(source.latestRun?.draftCreatedCount ?? 0) > 0 ? "text-green-600 dark:text-green-400 font-bold" : ""}`}>
                                            {source.latestRun?.draftCreatedCount ?? "—"}
                                        </span>
                                        {/* Health */}
                                        <span className={`text-center text-[10px] font-semibold uppercase ${source.health === "healthy" ? "text-green-600 dark:text-green-400"
                                            : source.health === "failing" ? "text-red-500"
                                                : source.health === "degraded" ? "text-amber-500"
                                                    : "text-muted-foreground"
                                            }`}>{source.health}</span>
                                        {/* Actions */}
                                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                                            <button
                                                onClick={() => onToggle(source)}
                                                disabled={togglingId === source.id}
                                                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                                                title={source.enabled ? "Disable" : "Enable"}
                                            >
                                                {togglingId === source.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : source.enabled ? <ToggleRight className="h-3.5 w-3.5 text-green-500" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                                            </button>
                                            <button
                                                onClick={() => onRun(source)}
                                                disabled={runningId === source.id}
                                                className="text-muted-foreground hover:text-foreground transition-colors p-1"
                                                title="Run now"
                                            >
                                                {runningId === source.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                                            </button>
                                            <button
                                                onClick={() => onDelete(source)}
                                                className="text-muted-foreground hover:text-red-500 transition-colors p-1"
                                                title="Delete"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    {/* Expanded details */}
                                    {expandedId === source.id && (
                                        <div className="px-4 py-3 bg-muted/20 border-b space-y-2">
                                            <p className="text-xs text-muted-foreground truncate">{source.endpoint}</p>
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                <span>Every {source.runFrequencyMinutes}m</span>
                                                <span>Default: {source.defaultType}</span>
                                                <span>Last run: {source.lastRunAt ? new Date(source.lastRunAt).toLocaleString() : "Never"}</span>
                                            </div>
                                            {source.latestRun && (
                                                <div className="flex gap-4 text-xs">
                                                    {[
                                                        { label: "Fetched", val: source.latestRun.fetchedCount },
                                                        { label: "Drafts", val: source.latestRun.draftCreatedCount, cls: "text-green-600 dark:text-green-400" },
                                                        { label: "Deduped", val: source.latestRun.dedupedCount, cls: "text-amber-600 dark:text-amber-400" },
                                                        { label: "Rejected", val: source.latestRun.rejectedCount },
                                                        { label: "Errors", val: source.latestRun.errorCount, cls: "text-red-500" },
                                                    ].map(s => (
                                                        <div key={s.label}>
                                                            <span className="text-muted-foreground">{s.label}: </span>
                                                            <span className={`font-semibold ${s.cls || ""}`}>{s.val}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <button
                                                onClick={() => onSelectSource(selectedSourceId === source.id ? undefined : source.id)}
                                                className="text-xs text-primary hover:underline"
                                            >
                                                {selectedSourceId === source.id ? "Clear run filter" : "Show runs for this source ↓"}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Recent Runs */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <CardTitle className="text-base">Recent Runs</CardTitle>
                            <CardDescription className="text-xs">
                                {selectedSourceId ? "Filtered by selected source." : "All sources · last 20 runs."}
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            {selectedSourceId && (
                                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onSelectSource(undefined)}>Clear filter</Button>
                            )}
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => loadRuns(selectedSourceId)}>
                                <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {runsLoading ? (
                        <div className="py-6 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                    ) : runs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No runs yet.</p>
                    ) : (
                        <div className="space-y-1.5">
                            {runs.map(run => (
                                <div key={run.id} className="rounded-lg border px-3 py-2 flex items-center gap-4 flex-wrap">
                                    <div className="min-w-0 flex-1 space-y-0.5">
                                        <div className="flex items-center gap-2">
                                            <p className="text-xs font-semibold">{run.source.name}</p>
                                            <Badge variant="outline" className="text-[9px] px-1">{run.source.sourceType}</Badge>
                                            <span className={`text-[10px] font-bold uppercase ${statusColor[run.status] ?? ""}`}>{run.status}</span>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">
                                            {new Date(run.startedAt).toLocaleString()} {run.endedAt ? `→ ${new Date(run.endedAt).toLocaleTimeString()}` : "(running)"}
                                        </p>
                                    </div>
                                    <div className="flex gap-3 shrink-0 text-center">
                                        {[
                                            { label: "Fetched", value: run.fetchedCount },
                                            { label: "Drafts", value: run.draftCreatedCount },
                                            { label: "Deduped", value: run.dedupedCount },
                                            { label: "Errors", value: run.errorCount },
                                        ].map(s => (
                                            <div key={s.label}>
                                                <p className="text-[10px] text-muted-foreground">{s.label}</p>
                                                <p className="text-xs font-bold">{s.value}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
