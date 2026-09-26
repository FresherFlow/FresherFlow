"use client"

import { cn } from "@/ui/cn"
import { getStatusLabel } from "./listUtils"

/**
 * Opportunity status presentation, mirroring the discovery workspace's
 * `statuses.tsx`: one badge component, one option list, one badge map.
 *
 * Statuses are derived, not raw: `getStatusLabel` folds `deletedAt`,
 * `expiredAt`/`expiresAt` and the stored status into the operator-facing label
 * (LIVE / EXPIRED / DELETED / ARCHIVED / DRAFT / REJECTED / PENDING).
 */

export interface StatusOption {
  value: string
  label: string
}

/** Options for the DataGrid status facet. `''` means "no status filter". */
export const OPPORTUNITY_STATUS_OPTIONS: StatusOption[] = [
  { value: "", label: "All status" },
  { value: "LIVE", label: "Live" },
  { value: "DRAFT", label: "Draft" },
  { value: "REJECTED", label: "Rejected" },
  { value: "EXPIRED", label: "Expired" },
  { value: "ARCHIVED", label: "Archived" },
  { value: "DELETED", label: "Deleted" },
]

/** Options for the inline status cell / quick status change modal. */
export const OPPORTUNITY_QUICK_STATUS_OPTIONS: StatusOption[] = [
  { value: "PUBLISHED", label: "Published" },
  { value: "DRAFT", label: "Draft" },
  { value: "EXPIRED", label: "Expired" },
  { value: "ARCHIVED", label: "Archived" },
]

const STATUS_VARIANT: Record<string, string> = {
  LIVE: "bg-success/10 text-success dark:text-success border-success/30",
  PUBLISHED: "bg-success/10 text-success dark:text-success border-success/30",
  VERIFIED: "bg-success/10 text-success dark:text-success border-success/30",
  DRAFT: "bg-warning/10 text-warning dark:text-warning border-warning/30",
  PENDING: "bg-warning/10 text-warning dark:text-warning border-warning/30",
  PENDING_REVIEW: "bg-warning/10 text-warning dark:text-warning border-warning/30",
  EXPIRED: "bg-warning/10 text-warning dark:text-warning border-warning/30",
  REJECTED: "bg-error/10 text-error dark:text-error border-error/30",
  ARCHIVED: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30",
  DELETED: "bg-error/10 text-error dark:text-error border-error/30",
}

export function formatStatusText(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase().replace(/_/g, " ")
}

export function OpportunityStatusBadge({ status }: { status: string }) {
  const variant = STATUS_VARIANT[status] ?? "bg-muted/60 text-muted-foreground border-border/40"
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded text-xs font-bold border inline-block whitespace-nowrap",
        variant
      )}
    >
      {formatStatusText(status)}
    </span>
  )
}

/**
 * Inline status cell for a row: a plain, non-interactive derived badge.
 *
 * Opportunities derive their operator-facing status from three fields
 * (`deletedAt`, `expiredAt`/`expiresAt`, `status`), so an in-cell select would
 * offer states that cannot round-trip. Status changes go through the row action
 * / bulk toolbar instead, which reuse the same confirmation flow.
 */
export function OpportunityStatusCell({
  opportunity,
}: {
  opportunity: Parameters<typeof getStatusLabel>[0]
}) {
  return <OpportunityStatusBadge status={getStatusLabel(opportunity)} />
}

/** Small tinted pill used for type / work-mode / experience facets. */
export function MetaPill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "bg-muted/60 border border-border/40 text-muted-foreground px-2 py-0.5 rounded text-xs whitespace-nowrap",
        className
      )}
    >
      {children}
    </span>
  )
}