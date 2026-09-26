"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  createCoreRowModel,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  flexRender,
  PaginationState,
  ReactTable,
  RowData,
  RowSelectionState,
  SortingState,
  stockFeatures,
  StockFeatures,
  Updater,
  useTable,
} from "@tanstack/react-table"

import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/Table"
import { EmptyState } from "@/ui/EmptyState"
import { DataTablePagination } from "./DataTablePagination"

// Row models in v9 are feature slots, not `get*RowModel()` table options. The
// core model is built in; the rest must be registered or the table renders
// every row and sorting/filtering/pagination stay inert.
const dataTableFeatures = {
  ...stockFeatures,
  coreRowModel: createCoreRowModel(),
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
}

interface DataTableProps<TData extends RowData, TValue> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: ColumnDef<StockFeatures, TData, any>[]
  data: TData[]
  enableSorting?: boolean
  enableFiltering?: boolean
  enablePagination?: boolean
  enableRowSelection?: boolean
  manualPagination?: boolean
  pageCount?: number
  rowCount?: number
  pagination?: {
    pageIndex: number
    pageSize: number
  }
  onPaginationChange?: (updater: Updater<PaginationState>) => void
  onRowSelectionChange?: (selectedRows: TData[]) => void
  toolbar?: (table: ReactTable<StockFeatures, TData>) => React.ReactNode
}

export function DataTable<TData extends RowData, TValue>({
  columns,
  data,
  enableSorting,
  enableFiltering,
  enablePagination,
  enableRowSelection,
  manualPagination,
  pageCount,
  rowCount,
  pagination,
  onPaginationChange,
  onRowSelectionChange,
  toolbar,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  // Local pagination state for client-side pagination
  const [localPagination, setLocalPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })

  // Reset pagination when local sorting or filtering changes (client-side only)
  React.useEffect(() => {
    if (!manualPagination) {
      setLocalPagination((prev) => ({ ...prev, pageIndex: 0 }))
    }
  }, [sorting, columnFilters, manualPagination])

  const table = useTable<StockFeatures, TData>({
    features: dataTableFeatures,
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    enableRowSelection,
    enableSorting,
    enableColumnFilters: enableFiltering,
    manualPagination,
    pageCount,
    rowCount,
    onPaginationChange: manualPagination ? onPaginationChange : setLocalPagination,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      ...(enablePagination
        ? { pagination: manualPagination ? pagination : localPagination }
        : {}),
    },
  })

  React.useEffect(() => {
    if (onRowSelectionChange) {
      const selectedData = table
        .getSelectedRowModel()
        .rows.map((row) => row.original)
      onRowSelectionChange(selectedData)
    }
  }, [rowSelection, table, onRowSelectionChange])

  return (
    <div className="space-y-4">
      {toolbar && toolbar(table)}
      <div className="rounded-lg border border-border/40 overflow-hidden">
        <div className="relative w-full overflow-auto max-h-[70vh]">
          <UITable>
            <TableHeader className="sticky top-0 z-10 bg-card">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground bg-muted/20">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    )
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="p-6">
                    <EmptyState
                      title="No results found"
                      description="Try adjusting your search or filters."
                      icon="search"
                      size="md"
                      variant="ghost"
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </UITable>
        </div>
      </div>
      {enablePagination && <DataTablePagination table={table} />}
    </div>
  )
}
