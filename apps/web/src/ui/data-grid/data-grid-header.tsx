"use client"

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"
import {
  flexRender,
  Header,
  RowData,
  StockFeatures,
  Table,
} from "@tanstack/react-table"

import { Button } from "@/ui/Button"
import { TableHead, TableHeader, TableRow } from "@/ui/Table"
import { cn } from "@/ui/cn"
import { stickyHeaderCellClass } from "./sticky"

interface DataGridHeaderProps<TData extends RowData> {
  table: Table<StockFeatures, TData>
  enableSelection: boolean
}

export function DataGridHeader<TData extends RowData>({
  table,
  enableSelection,
}: DataGridHeaderProps<TData>) {
  return (
    /* Reference (`users-table.tsx:126-151`): plain, opaque `TableHead`s.
     *
     * This row sticks inside the grid's own scroller, so its background has to
     * be fully opaque — rows sliding underneath were visible through the old
     * `bg-muted/60`, which read as glassmorphism, and `shadow-xs` added a
     * gradient-like edge on top of it. `bg-background` matches the reference
     * exactly: no alpha, no blur, no shadow, and the same tone as the cells
     * below it. `TableHeader`'s own `bg-muted/40` default loses to this in
     * `cn`. */
    <TableHeader className="sticky top-0 z-10 bg-background">
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow key={headerGroup.id}>
          {headerGroup.headers.map((header) => {
            return (
              <HeaderTh<TData>
                key={header.id}
                table={table}
                header={header}
                enableSelection={enableSelection}
              />
            )
          })}
        </TableRow>
      ))}
    </TableHeader>
  )
}

interface HeaderThProps<TData extends RowData> {
  table: Table<StockFeatures, TData>
  header: Header<StockFeatures, TData>
  enableSelection: boolean
}

function HeaderTh<TData extends RowData>({
  table,
  header,
  enableSelection,
}: HeaderThProps<TData>) {
  if (header.isPlaceholder) {
    return (
      <TableHead
        key={header.id}
        colSpan={header.colSpan}
        className="py-2.5 px-3 normal-case tracking-normal sm:px-4"
      />
    )
  }

  const column = header.column
  const canSort = column.getCanSort()
  const sorted = column.getIsSorted()
  const meta = column.columnDef.meta
  const isSelection = column.id === "select"

  if (isSelection) {
    return (
      <TableHead
        key={header.id}
        className={cn(
          "py-2.5 pl-3 pr-0 w-10 normal-case tracking-normal",
          meta?.sticky === "left" && stickyHeaderCellClass(meta?.stickyOffsetClass)
        )}
        style={{ width: 40 }}
      >
        <SelectionHeader table={table} />
      </TableHead>
    )
  }

  return (
    <TableHead
      key={header.id}
      colSpan={header.colSpan}
      style={
        column.getCanResize()
          ? { width: column.getSize() }
          : undefined
      }
      /* No vertical padding on the sortable head: the `size="sm"` control below
         is 40px tall and `TableHead` already reserves `h-10`, so padding on top
         of it pushed the header row to 60px. The non-sortable and select heads
         keep `py-2.5` because their content is smaller. */
      className={cn(
        "relative px-3 font-medium normal-case tracking-normal group/header sm:px-4",
        meta?.sticky === "left" && stickyHeaderCellClass(meta?.stickyOffsetClass),
        meta?.headerClassName
      )}
    >
      {canSort ? (
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            /* Type and height come from the `sm` size itself (40px / 14px). The
               old `h-7 … text-xs` override made the header labels 12px, which
               is where "the admin text feels small" came from. */
            "-ml-2 px-2 font-medium text-muted-foreground hover:bg-transparent hover:text-foreground",
            sorted && "data-[state=sorted]:bg-muted/60 text-foreground"
          )}
          onClick={() => column.toggleSorting(sorted === "asc")}
          data-state={sorted ? "sorted" : "unsorted"}
        >
          {meta?.headerTitle ??
            flexRender(header.column.columnDef.header, header.getContext())}
          {sorted === "asc" ? (
            <ArrowUp className="ml-1 h-3 w-3" />
          ) : sorted === "desc" ? (
            <ArrowDown className="ml-1 h-3 w-3" />
          ) : (
            <ChevronsUpDown className="ml-1 h-3 w-3 opacity-40" />
          )}
        </Button>
      ) : (
        <span className="text-sm font-medium text-muted-foreground">
          {meta?.headerTitle ??
            flexRender(header.column.columnDef.header, header.getContext())}
        </span>
      )}

      {column.getCanResize() && (
        <div
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          className={cn(
            "absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none bg-transparent hover:bg-primary/40 group-hover/header:bg-border transition-colors",
            column.getIsResizing() && "bg-primary"
          )}
        />
      )}
    </TableHead>
  )
}

function SelectionHeader<TData extends RowData>({
  table,
}: {
  table: Table<StockFeatures, TData>
}) {
  return (
    <input
      type="checkbox"
      checked={table.getIsAllPageRowsSelected()}
      onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
      aria-label="Select all rows"
      className="h-4 w-4 rounded border-border/80 bg-card text-primary accent-primary focus:ring-1 focus:ring-primary focus:ring-offset-0 cursor-pointer transition-colors"
    />
  )
}
