"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/shared/api/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/features/system/components/ui/Card";
import { Button } from "@/features/system/components/ui/Button";
import { Badge } from "@/features/system/components/ui/Badge";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";

type BroadcastStatus = "SENT" | "FAILED" | "SKIPPED";
type BroadcastWindow = "24h" | "7d" | "30d" | "all";

type BroadcastItem = {
    id: string;
    status: BroadcastStatus;
    channel: string;
    errorMessage: string | null;
    sentAt: string | null;
    createdAt: string;
    opportunity: {
        id: string;
        slug: string;
        title: string;
        company: string;
    } | null;
};

type TopPost = {
    key: string;
    title: string;
    company: string;
    slug: string;
    sends: number;
    latestSentAt: number;
};

export default function TelegramBroadcastPanel() {
    const [statusFilter, setStatusFilter] = useState<"ALL" | BroadcastStatus>("ALL");
    const [windowFilter, setWindowFilter] = useState<BroadcastWindow>("7d");
    const [loading, setLoading] = useState(true);
    const [retryingId, setRetryingId] = useState<string | null>(null);
    const [items, setItems] = useState<BroadcastItem[]>([]);
    const [topPosts, setTopPosts] = useState<TopPost[]>([]);
    const [summary, setSummary] = useState<{ sent: number; failed: number; skipped: number }>({
        sent: 0,
        failed: 0,
        skipped: 0,
    });

    const load = async () => {
        setLoading(true);
        try {
            const [response, sentOnly] = await Promise.all([
                adminApi.getTelegramBroadcasts(
                    statusFilter === "ALL" ? undefined : statusFilter,
                    50,
                    windowFilter
                ),
                adminApi.getTelegramBroadcasts("SENT", 200, windowFilter)
            ]) as [{ broadcasts: BroadcastItem[]; summary: { sent: number; failed: number; skipped: number } }, { broadcasts: BroadcastItem[] }];
            setItems(response.broadcasts || []);
            setSummary(response.summary || { sent: 0, failed: 0, skipped: 0 });

            const grouped = new Map<string, TopPost>();
            for (const row of (sentOnly.broadcasts || []) as BroadcastItem[]) {
                if (!row.opportunity) continue;
                const key = row.opportunity.id || row.opportunity.slug || row.id;
                const sentAt = row.sentAt ? new Date(row.sentAt).getTime() : new Date(row.createdAt).getTime();
                const existing = grouped.get(key);
                if (!existing) {
                    grouped.set(key, {
                        key,
                        title: row.opportunity.title,
                        company: row.opportunity.company,
                        slug: row.opportunity.slug || row.opportunity.id,
                        sends: 1,
                        latestSentAt: sentAt,
                    });
                    continue;
                }
                existing.sends += 1;
                if (sentAt > existing.latestSentAt) existing.latestSentAt = sentAt;
            }

            const nextTopPosts = Array.from(grouped.values())
                .sort((a, b) => (b.sends - a.sends) || (b.latestSentAt - a.latestSentAt))
                .slice(0, 3);
            setTopPosts(nextTopPosts);
        } catch {
            toast.error("Failed to load Telegram broadcast logs");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter, windowFilter]);

    const total = summary.sent + summary.failed + summary.skipped;
    const successRate = total > 0 ? Math.round((summary.sent / total) * 100) : 0;

    const onRetry = async (id: string) => {
        setRetryingId(id);
        try {
            await adminApi.retryTelegramBroadcast(id);
            toast.success("Retry request sent");
            await load();
        } catch {
            toast.error("Retry failed");
        } finally {
            setRetryingId(null);
        }
    };

    return (
        <Card className="max-w-4xl">
            <CardHeader className="space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                        <CardTitle>Telegram broadcasts</CardTitle>
                        <CardDescription>
                            Track channel post status, weekly reliability, and retry failures.
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant={statusFilter === "FAILED" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setStatusFilter("FAILED")}
                        >
                            Failed
                        </Button>
                        <Button
                            variant={statusFilter === "SKIPPED" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setStatusFilter("SKIPPED")}
                        >
                            Skipped
                        </Button>
                        <Button
                            variant={statusFilter === "SENT" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setStatusFilter("SENT")}
                        >
                            Sent
                        </Button>
                        <Button
                            variant={statusFilter === "ALL" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setStatusFilter("ALL")}
                        >
                            All
                        </Button>
                        <Button variant="outline" size="icon" onClick={load} aria-label="Refresh logs">
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        variant={windowFilter === "24h" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setWindowFilter("24h")}
                    >
                        24h
                    </Button>
                    <Button
                        variant={windowFilter === "7d" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setWindowFilter("7d")}
                    >
                        7d
                    </Button>
                    <Button
                        variant={windowFilter === "30d" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setWindowFilter("30d")}
                    >
                        30d
                    </Button>
                    <Button
                        variant={windowFilter === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setWindowFilter("all")}
                    >
                        All
                    </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg border p-2">
                        <p className="text-[10px] font-bold capitalize tracking-wider text-muted-foreground">Sent</p>
                        <p className="text-lg font-bold text-foreground">{summary.sent}</p>
                    </div>
                    <div className="rounded-lg border p-2">
                        <p className="text-[10px] font-bold capitalize tracking-wider text-muted-foreground">Failed</p>
                        <p className="text-lg font-bold text-red-600 dark:text-red-400">{summary.failed}</p>
                    </div>
                    <div className="rounded-lg border p-2">
                        <p className="text-[10px] font-bold capitalize tracking-wider text-muted-foreground">Skipped</p>
                        <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{summary.skipped}</p>
                    </div>
                </div>
                <div className="rounded-lg border p-2">
                    <p className="text-[10px] font-bold capitalize tracking-wider text-muted-foreground">Delivery success rate ({windowFilter})</p>
                    <p className="text-lg font-bold text-foreground">{successRate}%</p>
                </div>
                <div className="rounded-lg border p-3 space-y-2">
                    <p className="text-[10px] font-bold capitalize tracking-wider text-muted-foreground">
                        Top posts {windowFilter === "7d" ? "this week" : `(${windowFilter})`}
                    </p>
                    {topPosts.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No sent posts in this window.</p>
                    ) : (
                        <div className="space-y-2">
                            {topPosts.map((post, index) => (
                                <div key={post.key} className="flex items-center justify-between gap-3 rounded-md border p-2">
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-foreground truncate">
                                            {index + 1}. {post.title}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground truncate">{post.company}</p>
                                    </div>
                                    <div className="shrink-0 flex items-center gap-2">
                                        <Badge variant="outline">{post.sends}x</Badge>
                                        <Button asChild size="sm" variant="outline" className="h-7 px-2 text-[10px]">
                                            <a href={`/${post.slug}`} target="_blank" rel="noreferrer">
                                                Open
                                            </a>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {loading ? (
                    <div className="py-6 flex justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : items.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No broadcast logs found for this filter.</p>
                ) : (
                    items.map((item) => (
                        <div key={item.id} className="rounded-lg border p-3 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1">
                                    <p className="text-sm font-semibold">
                                        {item.opportunity?.title || "Unknown opportunity"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {item.opportunity?.company || "Unknown company"} | {item.channel}
                                    </p>
                                </div>
                                <Badge variant="outline">{item.status}</Badge>
                            </div>
                            {item.errorMessage ? (
                                <p className="text-xs text-red-600 dark:text-red-400">{item.errorMessage}</p>
                            ) : null}
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-xs text-muted-foreground">
                                    {item.sentAt
                                        ? `Sent: ${new Date(item.sentAt).toLocaleString()}`
                                        : `Created: ${new Date(item.createdAt).toLocaleString()}`}
                                </p>
                                {(item.status === "FAILED" || item.status === "SKIPPED") ? (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onRetry(item.id)}
                                        disabled={retryingId === item.id}
                                    >
                                        {retryingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Retry"}
                                    </Button>
                                ) : null}
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}
