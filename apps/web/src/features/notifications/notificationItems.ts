import type {
    AlertDelivery,
    AlertKind,
    CommunityNotification,
} from "@fresherflow/types";
import { ALERTS_UPDATED_EVENT } from "@/lib/cache/unreadCount";

/**
 * Tell every mounted bell that the unread counts are stale. Reading one is
 * cheap and polling is interval-based, so a mutation has to announce itself
 * rather than wait for the next tick.
 */
export function notifyUnreadChanged() {
    if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(ALERTS_UPDATED_EVENT));
    }
}

/**
 * One shape for everything that reaches a reader, whichever delivery table it
 * came from. Community notifications and alert deliveries are different rows
 * in different tables but they are the same thing to the person reading them,
 * so they are normalised here once and rendered by both the bell dropdown and
 * the notifications page.
 */
export type NotificationItem = {
    id: string;
    title: string;
    body?: string | null;
    isRead: boolean;
    receivedAt: number;
    opportunitySlug?: string | null;
    opportunityTitle?: string | null;
    commentId?: string | null;
    source: "community" | "alerts";
    alertKind?: AlertKind | null;
    /**
     * Where the row goes when there is no opportunity to link to. Without
     * this a notification such as a referral response is a dead row.
     */
    fallbackHref?: string | null;
};

function readPayloadString(
    notification: CommunityNotification,
    key: string,
): string | null {
    const payload = notification.payload;
    if (!payload || typeof payload !== "object") return null;
    const value = (payload as Record<string, unknown>)[key];
    return typeof value === "string" && value.length > 0 ? value : null;
}

function readPayloadFlag(
    notification: CommunityNotification,
    key: string,
): boolean {
    const payload = notification.payload;
    if (!payload || typeof payload !== "object") return false;
    return (payload as Record<string, unknown>)[key] === true;
}

export function alertKindLabel(kind: AlertKind): string {
    switch (kind) {
        case "DAILY_DIGEST":
            return "Daily digest";
        case "CLOSING_SOON":
            return "Closing soon";
        case "HIGHLIGHT":
            return "Highlight";
        case "APP_UPDATE":
            return "Update";
        case "EVENT_REMINDER":
            return "Event";
        case "NEW_JOB":
        default:
            return "New job";
    }
}

export function toAlertItem(delivery: AlertDelivery): NotificationItem {
    const opportunityTitle = delivery.opportunity?.title ?? null;
    let title: string;
    switch (delivery.kind) {
        case "DAILY_DIGEST":
            title = "Your daily job digest is ready";
            break;
        case "CLOSING_SOON":
            title = opportunityTitle
                ? `${opportunityTitle} is closing soon`
                : "A job you follow is closing soon";
            break;
        case "NEW_JOB":
        default:
            title = opportunityTitle
                ? `New match: ${opportunityTitle}`
                : `${alertKindLabel(delivery.kind)} alert`;
            break;
    }

    return {
        id: delivery.id,
        title,
        body: null,
        isRead: Boolean(delivery.readAt),
        receivedAt: new Date(delivery.sentAt).getTime(),
        opportunitySlug: delivery.opportunity?.slug ?? null,
        opportunityTitle,
        commentId: null,
        source: "alerts",
        alertKind: delivery.kind,
        fallbackHref: null,
    };
}

function actorName(notification: CommunityNotification): string {
    return (
        notification.actor?.fullName ||
        notification.actor?.username ||
        "Someone"
    );
}

export function toNotificationItem(
    notification: CommunityNotification,
): NotificationItem {
    const name = actorName(notification);
    const opportunityTitle = notification.opportunity?.title ?? null;
    const company = readPayloadString(notification, "company");
    let title: string;

    switch (notification.type) {
        case "COMMENT_REPLY":
            title = `${name} replied to your comment`;
            break;
        case "COMMENT_VOTE":
            title = `${name} voted on your comment`;
            break;
        case "JOB_SIGNAL_MILESTONE":
            title = opportunityTitle
                ? `Your activity on ${opportunityTitle} is picking up`
                : "Your signal milestone";
            break;
        case "JOB_UPDATED":
            title = opportunityTitle
                ? `${opportunityTitle} was updated`
                : "A job you follow was updated";
            break;
        case "JOB_CLOSED":
            title = opportunityTitle
                ? `${opportunityTitle} is closing soon`
                : "A job you follow is closing";
            break;
        case "EXPIRED_JOB":
            title = opportunityTitle
                ? `${opportunityTitle} is no longer accepting applications`
                : "A job you saved is no longer accepting applications";
            break;
        case "COMMENT_ON_EXPIRED":
            title = opportunityTitle
                ? `New comment on ${opportunityTitle}`
                : "New comment on a closed job";
            break;
        case "ROOM_HELPFUL":
            title = "Someone marked your post as helpful";
            break;
        case "REFERRAL_RESPONSE":
            title = company
                ? `${company} responded to your referral request`
                : "A company responded to your referral request";
            break;
        case "INTRO_REQUEST":
            title = `${name} asked to connect`;
            break;
        case "CAMPUS_DRIVE_MATCH":
            title = opportunityTitle
                ? `A drive matches your profile: ${opportunityTitle}`
                : "A new drive matches your profile";
            break;
        case "REGISTRATION_OPEN":
            title = opportunityTitle
                ? `Registration is open for ${opportunityTitle}`
                : "Registration is open";
            break;
        case "REGISTRATION_CLOSING":
            title = opportunityTitle
                ? `Registration closes soon for ${opportunityTitle}`
                : "Registration closes soon";
            break;
        case "OPPORTUNITY_APPLIED":
            title = opportunityTitle
                ? `You applied to ${opportunityTitle}`
                : "You applied to a job";
            break;
        case "APPLICATION_STAGE_CHANGED":
            title = opportunityTitle
                ? `${opportunityTitle} updated your application`
                : "An application updated";
            break;
        case "NEW_MATCHING_JOB":
            title = opportunityTitle
                ? `New match: ${opportunityTitle}`
                : "A new matching job";
            break;
        default:
            /* The `NotificationType` enum in the database and in
             * `packages/types` have drifted apart before, which is how
             * `EXPIRED_JOB`, `COMMENT_ON_EXPIRED`, `ROOM_HELPFUL` and
             * `REFERRAL_RESPONSE` all rendered as "A new matching job". Every
             * known type is handled above, so reaching this means a value the
             * types package does not know about. Say something neutral rather
             * than something confidently wrong. */
            title = opportunityTitle
                ? `Update on ${opportunityTitle}`
                : "New activity";
            break;
    }

    return {
        id: notification.id,
        // Own submission went live — overrides the JOB_UPDATED wording. The
        // row rides JOB_UPDATED with a payload flag because a new enum value
        // would need a DB migration (see approveSubmission in the API).
        title: readPayloadFlag(notification, "submissionPublished")
            ? opportunityTitle
                ? `Your submitted job is live: ${opportunityTitle}`
                : "Your submitted job is live"
            : title,
        body: notification.payload?.excerpt ?? null,
        isRead: Boolean(notification.readAt),
        receivedAt: new Date(notification.createdAt).getTime(),
        opportunitySlug: notification.opportunity?.slug ?? null,
        opportunityTitle,
        commentId: notification.commentId ?? null,
        source: "community",
        alertKind: null,
        // Referral responses carry no opportunity, so the row would otherwise
        // have nothing to link to. Point it at the referrals section.
        fallbackHref:
            notification.type === "REFERRAL_RESPONSE" &&
            !notification.opportunity?.slug
                ? "/account?tab=referral"
                : null,
    };
}

export function timeAgo(receivedAt: number): string {
    const diffMs = Date.now() - receivedAt;
    if (diffMs < 0) return "just now";
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(receivedAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
    });
}

export function groupByDay(
    items: NotificationItem[],
): { label: string; items: NotificationItem[] }[] {
    const now = new Date();
    const today = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
    ).getTime();
    const yesterday = today - 86400000;

    const todayItems = items.filter((n) => n.receivedAt >= today);
    const yesterdayItems = items.filter(
        (n) => n.receivedAt >= yesterday && n.receivedAt < today,
    );
    const olderItems = items.filter((n) => n.receivedAt < yesterday);

    const groups: { label: string; items: NotificationItem[] }[] = [];
    if (todayItems.length) groups.push({ label: "Today", items: todayItems });
    if (yesterdayItems.length)
        groups.push({ label: "Yesterday", items: yesterdayItems });
    if (olderItems.length) groups.push({ label: "Older", items: olderItems });
    return groups;
}

export function countUnread(items: NotificationItem[]): number {
    return items.reduce((total, item) => (item.isRead ? total : total + 1), 0);
}
