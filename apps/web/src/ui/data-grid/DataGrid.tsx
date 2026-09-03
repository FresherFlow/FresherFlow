"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  createCoreRowModel,
  createFacetedMinMaxValues,
  createFacetedRowModel,
  createFacetedUniqueValues,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  flexRender,
  PaginationState,
  RowData,
  RowSelectionState,
  SortingState,
  StockFeatures,
  Table,
  useTable,
  stockFeatures,
} from "@tanstack/react-table"

import { Badge } from "@/ui/Badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/ui/Card"
import { Input } from "@/ui/Input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/Select"
import { Skeleton } from "@/ui/Skeleton"
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableRow,
} from "@/ui/Table"
import { cn } from "@/lib/utils/utils"
import { Button } from "@/ui/Button"
import { DataGridHeader } from "./data-grid-header"
import { DataGridPagination } from "./data-grid-pagination"
import { EmptyState } from "@/ui/EmptyState"
import "./types"

// Row-model factories ride on the features object in v9 (NonFeatureKeys
// slots). Without them the table renders every row and pagination, search
// and sorting are inert.
const dataGridFeatures = {
  ...stockFeatures,
  coreRowModel: createCoreRowModel(),
  filteredRowModel: createFilteredRowModel(),
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  facetedRowModel: createFacetedRowModel(),
  facetedUniqueValues: createFacetedUniqueValues(),
  facetedMinMaxValues: createFacetedMinMaxValues(),
}

export type DataGridColumn<TData extends RowData> = ColumnDef<
  StockFeatures,
  TData,
  any
>

export interface StatusFilterOption {
  value: string
  label: string
}

export interface DataGridActionsContext<TData extends RowData> {
  selectedRows: TData[]
  selectedCount: number
  clearSelection: () => void
}

export interface DataGridProps<TData extends RowData> {
  data: TData[]
  columns: DataGridColumn<TData>[]
  getRowId: (row: TData) => string
  title?: React.ReactNode
  description?: React.ReactNode
  count?: number
  countLabel?: string
  enableSelection?: boolean
  defaultPageSize?: number
  pageSizeOptions?: number[]
  isLoading?: boolean
  loadingRowCount?: number
  noResults?: React.ReactNode
  searchPlaceholder?: string
  statusValue?: string
  onStatusChange?: (value: string) => void
  statusOptions?: StatusFilterOption[]
  onClear?: () => void
  actions?: (ctx: DataGridActionsContext<TData>) => React.ReactNode
  onSelectedRowsChange?: (rows: TData[]) => void
  className?: string
}

export function DataGrid<TData extends RowData>({
  data,
  columns,
  getRowId,
  title,
  description,
  count,
  countLabel = "records",
  enableSelection = true,
  defaultPageSize = 20,
  pageSizeOptions = [10, 20, 50, 100],
  isLoading = false,
  loadingRowCount = 10,
  noResults,
  searchPlaceholder = "Search…",
  statusValue,
  onStatusChange,
  statusOptions,
  onClear,
  actions,
  onSelectedRowsChange,
  className,
}: DataGridProps<TData>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: defaultPageSize,
  })

  const table = useTable<StockFeatures, TData>({
    features: dataGridFeatures,
    data,
    columns,
    getRowId,
    enableRowSelection: enableSelection,
    enableSorting: true,
    enableMultiSort: false,
    enableGlobalFilter: true,
    enableColumnResizing: true,
    columnResizeMode: "onChange",
    state: {
      sorting,
      globalFilter,
      columnFilters,
      rowSelection,
      pagination,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
  })

  // Serialize the selection to a primitive key: `table` and the row models
  // are new objects on every render, so depending on the derived array (or
  // an empty-array fallback) re-triggers the notify effect each render and
  // loops the parent's setState forever.
  const selectedIdsKey = React.useMemo(
    () =>
      Object.keys(rowSelection)
        .filter((id) => rowSelection[id])
        .sort()
        .join(","),
    [rowSelection]
  )

  const selectedRows = React.useMemo(() => {
    if (!selectedIdsKey) return []
    const idSet = new Set(selectedIdsKey.split(","))
    return table.getSelectedRowModel().rows
      .filter((row) => idSet.has(row.id))
      .map((row) => row.original)
  }, [selectedIdsKey, table])

  React.useEffect(() => {
    if (!onSelectedRowsChange) return
    const idSet = new Set(selectedIdsKey ? selectedIdsKey.split(",") : [])
    const rows = selectedIdsKey
      ? table.getSelectedRowModel().rows
          .filter((row) => idSet.has(row.id))
          .map((row) => row.original)
      : []
    onSelectedRowsChange(rows)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIdsKey])

  const totalRows = table.getPrePaginatedRowModel().rows.length
  const displayCount = count ?? data.length

  const handleClear = () => {
    setGlobalFilter("")
    setRowSelection({})
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    onClear?.()
  }

  const hasActiveFilters =
    globalFilter !== "" ||
    Boolean(
      statusValue &&
        statusOptions &&
        statusValue !== statusOptions[0]?.value
    )

  React.useEffect(() => {
    if (table.getRowModel().rows.length === 0 && pagination.pageIndex > 0) {
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table.getRowModel().rows.length, pagination.pageIndex])

  return (
    <Card
      className={cn(
        "flex flex-col min-h-0 flex-1 overflow-hidden border-border/60 bg-card shadow-xs backdrop-blur-none",
        className
      )}
    >
      <CardHeader className="flex-row items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          {typeof title === "string" ? (
            <CardTitle className="text-[15px] font-semibold text-foreground">
              {title}
            </CardTitle>
          ) : (
            title
          )}
          <Badge
            variant="secondary"
            className="rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums"
          >
            {displayCount}
          </Badge>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="relative">
            <Input
              value={globalFilter}
              onChange={(e) => {
                setGlobalFilter(e.target.value)
                setPagination((prev) => ({ ...prev, pageIndex: 0 }))
              }}
              placeholder={searchPlaceholder}
              className="h-9 w-56 pr-8 text-xs"
            />
          </div>
          {statusOptions && onStatusChange && (
            <Select value={statusValue} onValueChange={onStatusChange}>
              <SelectTrigger className="h-9 w-auto min-w-[130px] text-xs">
                <SelectValue
                  placeholder={
                    statusOptions.find((o) => o.value === statusValue)
                      ?.label ?? "All statuses"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleClear}
              className="h-9 shrink-0 text-xs"
            >
              Clear
            </Button>
          )}
          {actions &&
            actions({
              selectedRows,
              selectedCount: selectedRows.length,
              clearSelection: () => setRowSelection({}),
            })}
        </div>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 p-0">
        {isLoading ? (
          <DataGridSkeleton
            columnCount={table.getVisibleFlatColumns().length || columns.length}
            rowCount={loadingRowCount}
          />
        ) : (
          <DataGridBody<TData>
            table={table}
            enableSelection={enableSelection}
            noResults={noResults}
          />
        )}
      </CardContent>

      <CardFooter className="border-t border-border/40 px-2 py-1">
        <DataGridPagination
          pageIndex={pagination.pageIndex}
          pageSize={pagination.pageSize}
          pageCount={table.getPageCount()}
          totalRows={totalRows}
          selectedRows={selectedRows.length}
          canPreviousPage={table.getCanPreviousPage()}
          canNextPage={table.getCanNextPage()}
          setPageIndex={table.setPageIndex}
          setPageSize={table.setPageSize}
          previousPage={table.previousPage}
          nextPage={table.nextPage}
          pageSizeOptions={pageSizeOptions}
        />
      </CardFooter>
    </Card>
  )
}

interface DataGridBodyProps<TData extends RowData> {
  table: Table<StockFeatures, TData>
  enableSelection: boolean
  noResults?: React.ReactNode
}

function DataGridBody<TData extends RowData>({
  table,
  enableSelection,
  noResults,
}: DataGridBodyProps<TData>) {
  const rows = table.getRowModel().rows

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center p-12 text-center">
        {noResults ?? (
          <EmptyState
            title="No results found"
            description="Try adjusting your search or filters to find what you're looking for."
            icon="search"
            size="md"
            variant="ghost"
          />
        )}
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-auto custom-scrollbar">
      <UITable>
        <DataGridHeader table={table} enableSelection={enableSelection} />
        <TableBody className="divide-y divide-border/40 text-xs">
          {rows.map((row) => (
            <TableRow
              key={row.id}
              data-state={row.getIsSelected() && "selected"}
              className="hover:bg-muted/30 transition-colors"
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  style={
                    cell.column.getCanResize()
                      ? { width: cell.column.getSize() }
                      : undefined
                  }
                  className={cn(
                    "py-2.5 px-4",
                    cell.column.columnDef.meta?.cellClassName
                  )}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </UITable>
    </div>
  )
}

interface DataGridSkeletonProps {
  columnCount: number
  rowCount: number
}

function DataGridSkeleton({ columnCount, rowCount }: DataGridSkeletonProps) {
  return (
    <div className="px-4 py-2">
      {Array.from({ length: rowCount }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-border/40 py-3 px-1"
        >
          {Array.from({ length: columnCount }).map((_, j) => (
            <Skeleton
              key={j}
              className={cn(
                "h-4 rounded",
                j === 0 ? "w-5" : j === 1 ? "w-40" : "flex-1"
              )}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
