"use client"

import * as React from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  SortingState,
  ColumnFiltersState,
  Table as ReactTable,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/Table"
import { DataTablePagination } from "./DataTablePagination"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
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
  onPaginationChange?: (updater: any) => void
  onRowSelectionChange?: (selectedRows: TData[]) => void
  toolbar?: (table: ReactTable<TData>) => React.ReactNode
}

export function DataTable<TData, TValue>({
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
  const [rowSelection, setRowSelection] = React.useState({})
  
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

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: enableFiltering ? getFilteredRowModel() : undefined,
    getPaginationRowModel: enablePagination && !manualPagination ? getPaginationRowModel() : undefined,
    onRowSelectionChange: setRowSelection,
    enableRowSelection,
    manualPagination,
    pageCount,
    rowCount,
    onPaginationChange: manualPagination ? onPaginationChange : setLocalPagination,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      ...(enablePagination ? { pagination: manualPagination ? pagination : localPagination } : {}),
    },
  })

  React.useEffect(() => {
    if (onRowSelectionChange) {
      const selectedData = table
        .getFilteredSelectedRowModel()
        .rows.map((row) => row.original)
      onRowSelectionChange(selectedData)
    }
  }, [rowSelection, table, onRowSelectionChange])

  return (
    <div className="space-y-4">
      {toolbar && toolbar(table)}
      <div className="rounded-lg border border-border/40 overflow-hidden">
        <div className="relative w-full overflow-auto max-h-[70vh]">
          <Table>
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
                    className="hover:bg-muted/30 transition-colors"
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
                  <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground text-sm">
                    No results found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      {enablePagination && <DataTablePagination table={table} />}
    </div>
  )
}
