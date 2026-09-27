import { cn } from "@/ui/cn"

/**
 * Sticky-column helpers for the data grid (shadcn-admin pattern).
 *
 * On small screens the grid scrolls horizontally instead of squeezing, and
 * the columns marked with `meta.sticky = 'left'` pin to the left edge —
 * typically the select checkbox plus the first identity column (title/name).
 * On `md` and up every column fits, so pinning is scoped to `max-md:` and
 * costs nothing on desktop.
 *
 * Sticky cells must be opaque: without their own background the scrolled
 * columns show through underneath.
 */
export function stickyCellClass(offsetClass?: string): string {
  return cn(
    "max-md:sticky max-md:z-[2] max-md:bg-card max-md:border-r max-md:border-border/60",
    offsetClass ?? "max-md:left-0"
  )
}

export function stickyHeaderCellClass(offsetClass?: string): string {
  return cn(
    "max-md:sticky max-md:z-[3] max-md:bg-muted max-md:border-r max-md:border-border/60",
    offsetClass ?? "max-md:left-0"
  )
}

/** Offset for a sticky column that follows the 40px select checkbox column. */
export const STICKY_AFTER_SELECT = "max-md:left-10" as const
