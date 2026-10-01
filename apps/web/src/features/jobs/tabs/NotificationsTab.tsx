"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CommunityNotification, AlertFeedResponse } from "@fresherflow/types";
import { apiClient } from "@/lib/api/core";
import { alertsApi } from "@/lib/api/client";
import {
  ArrowLeftIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@repo/ui/utils/cn";
import { Skeleton } from "@/ui/Skeleton";
import { useAuth } from "@/lib/auth/AuthContext";
import { EmptyState } from "@/ui/EmptyState";
import { BrandButton } from "@/ui/BrandButton";
import {
  alertKindLabel,
  groupByDay,
  notifyUnreadChanged,
  timeAgo,
  toAlertItem,
  toNotificationItem,
  type NotificationItem,
} from "@/features/notifications/notificationItems";

function NotificationsPageContent() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiClient<{
        notifications: CommunityNotification[];
      }>("/api/notifications");
      const items = result.notifications.map(toNotificationItem);
      // Job alerts live in a separate delivery table; merge them in so an
      // alert a user configured is actually visible here. Either source may
      // fail independently without hiding the other.
      try {
        const feed = (await alertsApi.getFeed("all", 50)) as AlertFeedResponse;
        if (feed && Array.isArray(feed.deliveries)) {
          items.push(...feed.deliveries.map(toAlertItem));
        }
      } catch {
        /* Alerts failing is not surfaced. The rest of the feed still renders. */
      }
      items.sort((a, b) => b.receivedAt - a.receivedAt);
      setNotifications(items);
    } catch {
      /* No error screen. There is nothing to show and nothing the reader can
         do about it, so a failed fetch just falls through to the empty state
         like a signed-in account with no notifications. */
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Only fetch once we know who the user is. `GET /api/notifications` is
  // `requireAuth` and returns 401 for anyone signed out, so fetching on mount
  // guaranteed a red error for every logged-out visitor.
  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    void load();
  }, [user, isAuthLoading, load]);

  const markAllRead = async () => {
    if (!notifications.some((n) => !n.isRead)) return;
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await Promise.all([
        apiClient("/api/notifications/read", {
          method: "POST",
          body: JSON.stringify({}),
        }),
        alertsApi.markAllRead(),
      ]);
      notifyUnreadChanged();
    } catch {
      void load();
    }
  };

  const markRead = async (notif: NotificationItem) => {
    const notifId = notif.id;
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n)),
    );
    try {
      if (notif.source === "alerts") {
        await alertsApi.markRead(notifId);
        notifyUnreadChanged();
      } else {
        await apiClient("/api/notifications/read", {
          method: "POST",
          body: JSON.stringify({ ids: [notifId] }),
        });
      }
    } catch {
      void load();
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const visibleNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications;
  const groups = groupByDay(visibleNotifications);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-4 md:py-8 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 hover:bg-muted rounded-xl transition-colors cursor-pointer"
            aria-label="Go back"
          >
            <ArrowLeftIcon className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {unreadCount} unread
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex items-center rounded-lg border border-border bg-card p-0.5 text-xs font-semibold"
            role="tablist"
            aria-label="Filter notifications"
          >
            {(["all", "unread"] as const).map((key) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={filter === key}
                onClick={() => setFilter(key)}
                className={cn(
                  "rounded-md px-2.5 py-1 capitalize transition-colors cursor-pointer",
                  filter === key
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {key}
                {key === "unread" && unreadCount > 0 ? ` (${unreadCount})` : ""}
              </button>
            ))}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => void markAllRead()}
              className="text-xs font-bold text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-lg hover:bg-primary/5"
            >
              Clear all
            </button>
          )}
          <Link
            href="/jobs?tab=alerts"
            className="p-2 hover:bg-muted rounded-xl transition-colors"
          >
            <Cog6ToothIcon className="w-5 h-5 text-muted-foreground" />
          </Link>
        </div>
      </div>

      {!user ? (
        <EmptyState
          icon="inbox"
          size="md"
          title="Sign in to see notifications"
          description="New jobs matching your alerts and changes to jobs you follow land here once you are signed in."
          action={
            <BrandButton asChild size="sm">
              <Link href="/login?redirect=%2Fjobs%3Ftab%3Dnotifications">
                Sign in
              </Link>
            </BrandButton>
          }
        />
      ) : loading ? (
        /* Matches the real row: dot, title, timestamp. `SkeletonListRow` has
           three bars plus a time column, which drew a taller block than the
           content it stood in for. */
        <div className="space-y-1" aria-busy="true" aria-label="Loading notifications">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3" aria-hidden="true">
              <Skeleton variant="pill" className="mt-1.5 h-2 w-2 shrink-0" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-3/5" />
              </div>
              <Skeleton className="mt-0.5 h-3 w-8 shrink-0" />
            </div>
          ))}
        </div>
      ) : visibleNotifications.length === 0 ? (
        <EmptyState
          icon="inbox"
          size="md"
          title={filter === "unread" && notifications.length > 0 ? "All caught up" : "No notifications yet"}
          description={
            filter === "unread" && notifications.length > 0
              ? "Nothing unread. Switch to All to browse earlier notifications."
              : "We'll let you know when a new job matches your alerts, or a job you follow changes."
          }
          action={
            filter === "unread" && notifications.length > 0 ? (
              <button
                type="button"
                onClick={() => setFilter("all")}
                className="inline-flex h-9 items-center justify-center px-6 bg-muted text-foreground font-bold text-xs rounded-lg hover:bg-muted/80 transition-all"
              >
                Show all
              </button>
            ) : (
              <Link
                href="/jobs"
                className="inline-flex h-9 items-center justify-center px-6 bg-primary text-primary-foreground font-bold capitalize tracking-widest text-xs rounded-lg hover:bg-primary/90 transition-all shadow"
              >
                Browse jobs
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.label} className="space-y-1.5">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">
                {group.label}
              </p>
              <div className="bg-card border border-border/60 rounded-2xl overflow-hidden divide-y divide-border/40">
                {group.items.map((notif) => (
                  <div
                    key={notif.id}
                    className={cn(
                      "flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors cursor-pointer",
                      !notif.isRead && "bg-primary/5",
                    )}
                    onClick={() => {
                      void markRead(notif);
                      if (notif.href) {
                        router.push(notif.href);
                      } else if (notif.opportunitySlug) {
                        router.push(`/jobs/${notif.opportunitySlug}`);
                      } else if (notif.fallbackHref) {
                        router.push(notif.fallbackHref);
                      } else if (notif.source === "alerts") {
                        router.push("/jobs?tab=alerts");
                      }
                    }}
                  >
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full mt-2 shrink-0",
                        !notif.isRead ? "bg-primary" : "bg-transparent",
                      )}
                    />
                    <div className="flex-1 min-w-0 space-y-0.5">
                      {notif.source === "alerts" && notif.alertKind ? (
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {alertKindLabel(notif.alertKind)}
                        </p>
                      ) : null}
                      <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
                        {notif.title}
                      </p>
                      {notif.body && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {notif.body}
                        </p>
                      )}
                      {notif.opportunityTitle && (
                        <p className="text-xs text-muted-foreground">
                          {notif.opportunityTitle}
                        </p>
                      )}
                    </div>
                    <p
                      className="text-xs text-muted-foreground shrink-0 mt-0.5 tabular-nums"
                      title={new Date(notif.receivedAt).toLocaleString("en-IN")}
                    >
                      {timeAgo(notif.receivedAt)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NotificationsTab() {
  return <NotificationsPageContent />;
}
