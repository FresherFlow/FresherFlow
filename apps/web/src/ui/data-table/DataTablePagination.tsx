"use client"

import type { RowData } from "@tanstack/react-table"
import { LegacyReactTable } from "@tanstack/react-table/legacy"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react"

import { Button } from "@/ui/Button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/Select"
import { cn } from "@/ui/cn"

export interface PaginationControlsProps {
  pageIndex: number
  pageSize: number
  pageCount: number
  totalRows: number
  selectedRows?: number
  canPreviousPage: boolean
  canNextPage: boolean
  setPageIndex: (index: number) => void
  setPageSize: (size: number) => void
  previousPage: () => void
  nextPage: () => void
}

export function PaginationControls({
  pageIndex,
  pageSize,
  pageCount,
  totalRows,
  selectedRows = 0,
  canPreviousPage,
  canNextPage,
  setPageIndex,
  setPageSize,
  previousPage,
  nextPage,
}: PaginationControlsProps) {
  // Calculate which page numbers to show, with ellipsis for large datasets
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = []
    
    if (pageCount <= 7) {
      for (let i = 0; i < pageCount; i++) {
        pages.push(i)
      }
    } else {
      pages.push(0) // First page
      if (pageIndex > 2) {
        pages.push("ellipsis")
      }
      
      const start = Math.max(1, pageIndex - 1)
      const end = Math.min(pageCount - 2, pageIndex + 1)
      
      for (let i = start; i <= end; i++) {
        pages.push(i)
      }
      
      if (pageIndex < pageCount - 3) {
        pages.push("ellipsis")
      }
      pages.push(pageCount - 1) // Last page
    }
    return pages
  }

  const startRow = totalRows === 0 ? 0 : pageIndex * pageSize + 1
  const endRow = Math.min(totalRows, (pageIndex + 1) * pageSize)

  return (
    <div className="flex flex-row items-center justify-between px-2 py-3 gap-2 sm:gap-0 border-t border-border/40 bg-muted/10 w-full">
      {/* Selection & Total Counts */}
      <div className="flex-1 text-xs sm:text-sm text-muted-foreground w-auto text-left truncate pr-2">
        {selectedRows > 0 ? (
          <span className="truncate">
            {selectedRows} of {totalRows} row(s) selected.
          </span>
        ) : (
          <span className="truncate">
            {totalRows > 0 ? (
              <>Showing <span className="font-medium text-foreground">{startRow}</span>–<span className="font-medium text-foreground">{endRow}</span> of <span className="font-medium text-foreground">{totalRows}</span></>
            ) : (
              "No results found."
            )}
          </span>
        )}
      </div>

      <div className="flex flex-row items-center gap-2 sm:gap-6 lg:gap-8 w-auto shrink-0">
        {/* Page Size Selector */}
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium whitespace-nowrap hidden sm:block">Rows per page</p>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => {
              setPageSize(Number(value))
            }}
          >
            <SelectTrigger className="h-8 w-[70px] text-xs hidden sm:flex" aria-label="Select rows per page">
              <SelectValue placeholder={`${pageSize}`} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 50, 100].map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-1">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex bg-card hover:bg-muted"
            onClick={() => setPageIndex(0)}
            disabled={!canPreviousPage}
            aria-label="Go to first page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0 bg-card hover:bg-muted"
            onClick={() => previousPage()}
            disabled={!canPreviousPage}
            aria-label="Go to previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          {/* Page numbers (hidden on very small screens, shown on sm+) */}
          <div className="hidden sm:flex items-center gap-1">
            {getPageNumbers().map((p, i) => 
              p === "ellipsis" ? (
                <div key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-muted-foreground text-xs font-semibold select-none">
                  ...
                </div>
              ) : (
                <Button
                  key={p}
                  variant={pageIndex === p ? "default" : "outline"}
                  className={cn(
                    "h-8 w-8 p-0 text-xs font-semibold",
                    pageIndex === p ? "" : "bg-card hover:bg-muted"
                  )}
                  onClick={() => setPageIndex(p as number)}
                  aria-label={`Go to page ${(p as number) + 1}`}
                  aria-current={pageIndex === p ? "page" : undefined}
                >
                  {(p as number) + 1}
                </Button>
              )
            )}
          </div>
          
          {/* Simple Page Indicator for Mobile */}
          <div className="flex sm:hidden w-auto px-1 items-center justify-center text-xs font-medium whitespace-nowrap">
            {pageIndex + 1} / {pageCount || 1}
          </div>

          <Button
            variant="outline"
            className="h-8 w-8 p-0 bg-card hover:bg-muted"
            onClick={() => nextPage()}
            disabled={!canNextPage}
            aria-label="Go to next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex bg-card hover:bg-muted"
            onClick={() => setPageIndex(pageCount - 1)}
            disabled={!canNextPage}
            aria-label="Go to last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

interface DataTablePaginationProps<TData extends RowData> {
  table: LegacyReactTable<TData>
}

export function DataTablePagination<TData extends RowData>({
  table,
}: DataTablePaginationProps<TData>) {
  return (
    <PaginationControls
      pageIndex={table.getState().pagination.pageIndex}
      pageSize={table.getState().pagination.pageSize}
      pageCount={table.getPageCount()}
      totalRows={table.options.rowCount ?? table.getFilteredRowModel()?.rows?.length ?? 0}
      selectedRows={table.getFilteredSelectedRowModel()?.rows?.length ?? 0}
      canPreviousPage={table.getCanPreviousPage()}
      canNextPage={table.getCanNextPage()}
      setPageIndex={table.setPageIndex}
      setPageSize={table.setPageSize}
      previousPage={table.previousPage}
      nextPage={table.nextPage}
    />
  )
}
