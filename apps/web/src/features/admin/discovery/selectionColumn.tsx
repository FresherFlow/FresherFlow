"use client"

import { ColumnDef, RowData, StockFeatures } from "@tanstack/react-table"

/**
 * A leading checkbox column wired to TanStack row selection. Use as the first
 * entry in the columns array passed to DataGrid (enableSelection must be on).
 */
export function selectionColumn<TRow extends RowData>(): ColumnDef<
  StockFeatures,
  TRow,
  any
> {
  return {
    id: "select",
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
        aria-label="Select all rows"
        className="w-4 h-4 rounded border-border/80 bg-card text-primary accent-primary focus:ring-1 focus:ring-primary focus:ring-offset-0 cursor-pointer transition-colors"
      />
    ),
    cell: ({ row }) => (
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
    size: 40,
    minSize: 40,
    maxSize: 40,
  }
}
