"use client"

import * as React from "react"
import { X } from "lucide-react"

import { Badge } from "@/ui/Badge"
import { Button } from "@/ui/Button"
import { Separator } from "@/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/ui/Tooltip"
import { cn } from "@/ui/cn"

/**
 * Floating bulk-actions bar — faithful port of shadcn-admin's
 * `DataTableBulkActions` (components/data-table/bulk-actions.tsx).
 *
 * The reference's hover is the whole point: the shell lifts on hover
 * (`hover:scale-105`) over a `transition-all delay-100 duration-300 ease-out`,
 * and the panel is a `bg-background/95 backdrop-blur-lg` surface that steps
 * down to `supports-backdrop-filter:bg-background/60` where blur is available.
 *
 * Renders nothing until at least one row is selected, then docks to the
 * bottom-center of the viewport so bulk actions stay reachable on mobile —
 * the inline header actions they replace are cramped past ~360px. Clear + the
 * count are the reference's outline icon button, `Separator`, and `Badge`
 * trio; the actions themselves are children, so each caller keeps its own
 * button set. `Escape` clears the selection.
 */
export function DataGridBulkBar({
  selectedCount,
  entityName = "row",
  onClear,
  children,
  className,
}: {
  selectedCount: number
  entityName?: string
  onClear: () => void
  children: React.ReactNode
  className?: string
}) {
  React.useEffect(() => {
    if (selectedCount === 0) return
    const onKeyDown = (event: KeyboardEvent) => {
      // Menus own Escape while they are open (the reference guards this on
      // dropdown triggers/content) — only clear when nothing else claimed it.
      if (event.defaultPrevented) return
      if (event.key === "Escape") onClear()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [selectedCount, onClear])

  if (selectedCount === 0) return null

  const plural = selectedCount > 1 ? "s" : ""

  return (
    <div
      role="toolbar"
      aria-label={`Bulk actions for ${selectedCount} selected ${entityName}${plural}`}
      tabIndex={-1}
      className={cn(
        // Sits above the admin bottom nav on mobile, near the edge on desktop.
        "fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-xl lg:bottom-6",
        // Reference hover: the whole bar lifts.
        "transition-all delay-100 duration-300 ease-out hover:scale-105 motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        className
      )}
    >
      <div
        className={cn(
          "flex max-w-[calc(100vw-2rem)] items-center gap-x-2 overflow-x-auto p-2 shadow-xl",
          "rounded-xl border border-border",
          "bg-background/95 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60"
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onClear}
              className="size-6 shrink-0 rounded-full"
              aria-label="Clear selection"
              title="Clear selection (Escape)"
            >
              {/* Explicit size: shadcn's Button primitive sizes children via
                  `[&_svg]:size-4`, ours does not, so a bare <X /> rendered at
                  lucide's 24px default inside this size-6 circle. */}
              <X className="size-4" />
              <span className="sr-only">Clear selection</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Clear selection (Escape)</p>
          </TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-5" aria-hidden />

        {/* Count only — the "N listings selected" sentence is carried by the
            aria-label instead of on screen. */}
        <div className="flex shrink-0 items-center">
          <Badge
            variant="default"
            className="min-w-8 rounded-lg tabular-nums"
            aria-label={`${selectedCount} ${entityName}${plural} selected`}
          >
            {selectedCount}
          </Badge>
        </div>

        <Separator orientation="vertical" className="h-5" aria-hidden />

        <div className="flex shrink-0 items-center gap-x-2">{children}</div>
      </div>
    </div>
  )
}
