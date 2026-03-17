"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api/admin";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { SocialPost, SocialPostStatus, SocialPlatform } from "@fresherflow/types";

export default function SocialBroadcastPanel() {
    const [statusFilter, setStatusFilter] = useState<"ALL" | SocialPostStatus>("ALL");
    const [platformFilter, setPlatformFilter] = useState<"ALL" | SocialPlatform>("ALL");
    const [loading, setLoading] = useState(true);
    const [retryingId, setRetryingId] = useState<string | null>(null);
    const [items, setItems] = useState<SocialPost[]>([]);

    const load = async () => {
        setLoading(true);
        try {
            const response = await adminApi.getSocialPosts({
                status: statusFilter === "ALL" ? undefined : statusFilter,
                platform: platformFilter === "ALL" ? undefined : platformFilter,
            }) as { posts: SocialPost[] };
            setItems(response.posts || []);
        } catch {
            toast.error("Failed to load social posts history");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter, platformFilter]);

    const onRetry = async (id: string) => {
        setRetryingId(id);
        try {
            await adminApi.retrySocialPost(id);
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
            <CardHeader className="space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                        <CardTitle>Social Posts History</CardTitle>
                        <CardDescription>
                            Monitor X, LinkedIn, and Facebook posts. Retry failures inline.
                        </CardDescription>
                    </div>
                    <Button variant="outline" size="icon" onClick={load} aria-label="Refresh logs">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
                
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-muted-foreground w-16">Platform:</span>
                        <Button variant={platformFilter === "ALL" ? "default" : "outline"} size="sm" onClick={() => setPlatformFilter("ALL")}>All</Button>
                        <Button variant={platformFilter === SocialPlatform.X ? "default" : "outline"} size="sm" onClick={() => setPlatformFilter(SocialPlatform.X)}>X</Button>
                        <Button variant={platformFilter === SocialPlatform.LINKEDIN ? "default" : "outline"} size="sm" onClick={() => setPlatformFilter(SocialPlatform.LINKEDIN)}>LinkedIn</Button>
                        <Button variant={platformFilter === SocialPlatform.FACEBOOK ? "default" : "outline"} size="sm" onClick={() => setPlatformFilter(SocialPlatform.FACEBOOK)}>Facebook</Button>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-muted-foreground w-16">Status:</span>
                        <Button variant={statusFilter === "ALL" ? "default" : "outline"} size="sm" onClick={() => setStatusFilter("ALL")}>All</Button>
                        <Button variant={statusFilter === SocialPostStatus.PUBLISHED ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(SocialPostStatus.PUBLISHED)}>Published</Button>
                        <Button variant={statusFilter === SocialPostStatus.FAILED ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(SocialPostStatus.FAILED)}>Failed</Button>
                        <Button variant={statusFilter === SocialPostStatus.PENDING ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(SocialPostStatus.PENDING)}>Pending</Button>
                        <Button variant={statusFilter === SocialPostStatus.DISABLED ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(SocialPostStatus.DISABLED)}>Disabled</Button>
                        <Button variant={statusFilter === SocialPostStatus.DRY_RUN ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(SocialPostStatus.DRY_RUN)}>Dry Run</Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {loading ? (
                    <div className="py-6 flex justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="py-12 border-2 border-dashed rounded-lg text-center flex flex-col items-center justify-center space-y-2">
                         <p className="text-sm font-medium text-muted-foreground">No posts found for this filter.</p>
                         <Button variant="ghost" size="sm" onClick={() => { setStatusFilter("ALL"); setPlatformFilter("ALL"); }}>Clear filters</Button>
                    </div>
                ) : (
                    items.map((item) => (
                        <div key={item.id} className="rounded-lg border bg-card/50 p-4 transition-colors hover:bg-muted/20">
                            <div className="flex items-start justify-between gap-4 mb-2">
                                <div className="space-y-1">
                                    <h4 className="text-sm font-semibold text-foreground leading-none">
                                        {item.opportunity?.title || "Unknown opportunity"}
                                    </h4>
                                    <p className="text-xs text-muted-foreground">
                                        {item.opportunity?.company || "Unknown"}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Badge variant="secondary" className="bg-muted text-xs font-semibold uppercase">{item.platform}</Badge>
                                    <Badge variant={item.status === 'FAILED' ? 'destructive' : item.status === 'PUBLISHED' ? 'default' : 'outline'} className="text-[10px] tracking-wide">
                                        {item.status.replace("_", " ")}
                                    </Badge>
                                </div>
                            </div>
                            
                            {item.errorMessage && (
                                <div className="mt-3 mb-2 p-2 rounded bg-destructive/10 text-destructive text-[11px] font-mono break-all">
                                    {item.errorMessage}
                                </div>
                            )}

                            {!!item.payload && typeof item.payload === 'object' && !!(item.payload as Record<string, unknown>).text && (
                                <div className="mt-3 p-3 rounded bg-muted/30 border border-border/50">
                                     <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Generated Text</p>
                                     <p className="text-[11px] text-foreground whitespace-pre-wrap italic">
                                         {String((item.payload as Record<string, unknown>).text)}
                                     </p>
                                </div>
                            )}
                            
                            <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-border/50">
                                <div className="space-y-0.5">
                                    <p className="text-[11px] text-muted-foreground">
                                        {item.publishedAt
                                            ? `Published: ${new Date(item.publishedAt).toLocaleString()}`
                                            : `Attempted: ${new Date(item.createdAt).toLocaleString()}`}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground/70">
                                        Retries: {item.retryCount} • Ext ID: {item.externalPostId || "N/A"}
                                    </p>
                                </div>
                                
                                {(item.status === "FAILED" || item.status === "DISABLED") && (
                                    <Button
                                        size="sm"
                                        className="h-8 shadow-sm text-xs"
                                        onClick={() => onRetry(item.id)}
                                        disabled={retryingId === item.id}
                                    >
                                        {retryingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                                        Retry Post
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}
