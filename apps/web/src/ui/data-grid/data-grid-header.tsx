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
import { cn } from "@/lib/utils/utils"

interface DataGridHeaderProps<TData extends RowData> {
  table: Table<StockFeatures, TData>
  enableSelection: boolean
}

export function DataGridHeader<TData extends RowData>({
  table,
  enableSelection,
}: DataGridHeaderProps<TData>) {
  return (
    <TableHeader className="sticky top-0 z-10 bg-muted/60 border-border/40 shadow-xs">
      {table.getHeaderGroups().map((headerGroup) => (
        <TableRow key={headerGroup.id}>
          {headerGroup.headers.map((header) => {
            return (
              <HeaderTh<TData>
                key={header.id}
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
  header: Header<StockFeatures, TData>
  enableSelection: boolean
}

function HeaderTh<TData extends RowData>({
  header,
  enableSelection,
}: HeaderThProps<TData>) {
  if (header.isPlaceholder) {
    return (
      <TableHead
        key={header.id}
        colSpan={header.colSpan}
        className="py-2.5 px-4 normal-case tracking-normal"
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
        className="py-2.5 pl-4 pr-0 w-10 normal-case tracking-normal"
        style={{ width: 40 }}
      >
        <SelectionHeader table={header.table} />
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
      className={cn(
        "relative py-2.5 px-4 font-medium normal-case tracking-normal group/header",
        meta?.headerClassName
      )}
    >
      {canSort ? (
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "-ml-2 h-7 px-2 text-xs font-medium text-muted-foreground hover:bg-transparent hover:text-foreground",
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
        <span className="text-xs font-medium text-muted-foreground">
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
