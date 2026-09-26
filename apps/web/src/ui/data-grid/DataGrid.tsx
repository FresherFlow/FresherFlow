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

/** Pagination/sorting state shapes, aliased so the public props stay readable. */
export type GridPaginationState = PaginationState
/** Sorting state for the (optionally controlled) `sorting` prop. */
export type GridSortingState = SortingState

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
import { Skeleton } from "@/ui/Skeleton"
import { Table as UITable, TableBody, TableCell, TableRow } from "@/ui/Table"
import { cn } from "@/ui/cn"
import { Button } from "@/ui/Button"
import { FilterSelect } from "./FilterSelect"
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

/**
 * Server-side paging contract. When a caller owns paging (its data source is
 * paginated server-side), it passes the current page and total page count; the
 * grid then renders every row it was handed and the footer navigates through
 * `onPageChange` instead of slicing rows locally.
 */
export interface DataGridServerPagination {
  /** Zero-based index of the page currently rendered. */
  pageIndex: number
  /** Total pages known to the server. */
  pageCount: number
  onPageChange: (pageIndex: number) => void
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
  /**
   * Controlled sorting. Pass both when the sort belongs to the caller — e.g. it
   * maps to a server `sort` query param or a toolbar dropdown. Without them the
   * grid sorts locally, which is the default.
   */
  sorting?: GridSortingState
  onSortingChange?: (updater: React.SetStateAction<GridSortingState>) => void
  /** Server-side paging; omit to page locally. */
  serverPagination?: DataGridServerPagination
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
  sorting: controlledSorting,
  onSortingChange: controlledOnSortingChange,
  serverPagination,
}: DataGridProps<TData>) {
  const [localSorting, setLocalSorting] = React.useState<GridSortingState>([])
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})
  const [localPagination, setLocalPagination] = React.useState<GridPaginationState>({
    pageIndex: 0,
    pageSize: defaultPageSize,
  })

  const isServerPaginated = Boolean(serverPagination)
  const sorting = controlledSorting ?? localSorting
  const setSorting = controlledOnSortingChange ?? setLocalSorting
  const pagination: GridPaginationState = serverPagination
    ? { pageIndex: serverPagination.pageIndex, pageSize: data.length || defaultPageSize }
    : localPagination
  const setPagination = (
    updater: React.SetStateAction<GridPaginationState>
  ) => {
    if (serverPagination) {
      const next = typeof updater === "function" ? updater(pagination) : updater
      if (next.pageIndex !== pagination.pageIndex) {
        serverPagination.onPageChange(next.pageIndex)
      }
      return
    }
    setLocalPagination(updater)
  }

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

  const totalRows = isServerPaginated
    ? (count ?? data.length)
    : table.getPrePaginatedRowModel().rows.length
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
    if (isServerPaginated) return
    if (table.getRowModel().rows.length === 0 && pagination.pageIndex > 0) {
      setPagination((prev) => ({ ...prev, pageIndex: 0 }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table.getRowModel().rows.length, pagination.pageIndex, isServerPaginated])

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
            <CardTitle className="text-sm font-semibold text-foreground">
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
            <FilterSelect
              value={statusValue ?? statusOptions[0]?.value ?? ""}
              onChange={onStatusChange}
              options={statusOptions}
              ariaLabel="Filter by status"
              placeholder="All statuses"
              className="w-auto min-w-32"
            />
          )}
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleClear} size="sm">
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
          pageCount={isServerPaginated ? serverPagination!.pageCount : table.getPageCount()}
          totalRows={totalRows}
          selectedRows={selectedRows.length}
          canPreviousPage={
            isServerPaginated ? pagination.pageIndex > 0 : table.getCanPreviousPage()
          }
          canNextPage={
            isServerPaginated
              ? pagination.pageIndex < serverPagination!.pageCount - 1
              : table.getCanNextPage()
          }
          setPageIndex={(index) => setPagination((prev) => ({ ...prev, pageIndex: index }))}
          setPageSize={
            isServerPaginated
              ? () => {}
              : (size) => setPagination((prev) => ({ ...prev, pageSize: size, pageIndex: 0 }))
          }
          previousPage={() =>
            setPagination((prev) => ({ ...prev, pageIndex: Math.max(0, prev.pageIndex - 1) }))
          }
          nextPage={() =>
            setPagination((prev) => ({ ...prev, pageIndex: prev.pageIndex + 1 }))
          }
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
    <div className="h-full w-full overflow-auto">
      <UITable>
        <DataGridHeader table={table} enableSelection={enableSelection} />
        <TableBody className="divide-y divide-border/40 text-xs">
          {rows.map((row) => (
            <TableRow
              key={row.id}
              data-state={row.getIsSelected() && "selected"}
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
