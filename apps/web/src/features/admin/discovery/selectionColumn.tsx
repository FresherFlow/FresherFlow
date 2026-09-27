"use client"

/**
 * A leading checkbox column wired to TanStack row selection. Use as the first
 * entry in the columns array passed to DataGrid (enableSelection must be on).
 *
 * NOTE: intentionally typed with `any` row/table handles instead of the
 * TanStack generics — the grid is mid-migration (v9 API against the installed
 * v8 package, owned by ui/), so version-specific generics break typecheck
 * either way. The structural shape below matches both versions at runtime.
 */
export function selectionColumn<T = unknown>(): any {
  return {
    id: "select",
    header: ({ table }: any) => (
      <input
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
        aria-label="Select all rows"
        className="w-4 h-4 rounded border-border/80 bg-card text-primary accent-primary focus:ring-1 focus:ring-primary focus:ring-offset-0 cursor-pointer transition-colors"
      />
    ),
    cell: ({ row }: any) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={(e) => row.toggleSelected(!!e.target.checked)}
        aria-label="Select row"
        className="w-4 h-4 rounded border-border/80 bg-card text-primary accent-primary focus:ring-1 focus:ring-primary focus:ring-offset-0 cursor-pointer transition-colors"
      />
    ),
    enableSorting: false,
    enableResizing: false,
    enableHiding: false,
    size: 40,
    minSize: 40,
    maxSize: 40,
    // Pinned on mobile so row selection stays reachable while the grid
    // scrolls horizontally (see ui/data-grid/sticky).
    meta: { sticky: "left" },
  }
}
