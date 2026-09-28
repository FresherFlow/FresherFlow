"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

import { Button } from "@/ui/Button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/Select"
import { cn } from "@/ui/cn"

export interface DataGridPaginationProps {
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
  pageSizeOptions?: number[]
}

/**
 * Compact ReUI-style pagination: "Rows per page" on the left, then
 * "1 - 5 of 487" with numbered page buttons and ellipsis on the right.
 */
export function DataGridPagination({
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
  pageSizeOptions = [10, 20, 50, 100],
}: DataGridPaginationProps) {
  const startRow = totalRows === 0 ? 0 : pageIndex * pageSize + 1
  const endRow = Math.min(totalRows, (pageIndex + 1) * pageSize)

  const getPageNumbers = (): (number | "ellipsis")[] => {
    if (pageCount <= 7) {
      return Array.from({ length: pageCount }, (_, i) => i)
    }
    const pages: (number | "ellipsis")[] = [0]
    const start = Math.max(1, pageIndex - 1)
    const end = Math.min(pageCount - 2, pageIndex + 1)
    if (start > 1) pages.push("ellipsis")
    for (let i = start; i <= end; i++) pages.push(i)
    if (end < pageCount - 2) pages.push("ellipsis")
    pages.push(pageCount - 1)
    return pages
  }

  return (
    <div className="flex w-full flex-row items-center justify-between gap-2 px-3 py-2.5">
      {/* Stacks below `sm`: side-by-side these two halves need ~380px, which
          is wider than a phone. */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="hidden items-center gap-2 sm:flex">
          <p className="whitespace-nowrap text-sm text-muted-foreground">
            Rows per page
          </p>
          <Select
            value={`${pageSize}`}
            onValueChange={(value) => setPageSize(Number(value))}
          >
            {/* `h-9` is `SelectTrigger`'s own height: it is the smallest the
                primitive can render 14px type in (`py-2` + a 20px line box),
                so the whole footer row is 36px instead of mixing heights. */}
            <SelectTrigger className="w-20 text-sm" aria-label="Rows per page">
              <SelectValue placeholder={`${pageSize}`} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedRows > 0 && (
          <span className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{selectedRows}</span>{" "}
            selected
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
          {totalRows > 0 ? (
            <>
              <span className="font-medium text-foreground">{startRow}</span>
              {" - "}
              <span className="font-medium text-foreground">{endRow}</span>
              {" of "}
              <span className="font-medium text-foreground">{totalRows}</span>
            </>
          ) : (
            "No results"
          )}
        </span>
        {/* Numbered buttons need ~380px. Below `sm` they overflow a phone and
            push the row numbers off-screen entirely, so hide them and let the
            prev/next arrows plus the "Page X of Y" indicator carry navigation. */}
        <div className="hidden items-center gap-0.5 sm:flex">
          <Button
            variant="ghost"
            className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
            onClick={previousPage}
            disabled={!canPreviousPage}
            aria-label="Go to previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          {getPageNumbers().map((page, index) =>
            page === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                className="flex h-9 min-w-9 items-center justify-center text-sm text-muted-foreground"
              >
                …
              </span>
            ) : (
              <Button
                key={page}
                variant="ghost"
                onClick={() => setPageIndex(page)}
                aria-label={`Go to page ${page + 1}`}
                aria-current={page === pageIndex ? "page" : undefined}
                className={cn(
                  "h-9 min-w-9 px-1.5 text-sm tabular-nums",
                  page === pageIndex
                    ? "bg-muted font-semibold text-foreground hover:bg-muted"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {page + 1}
              </Button>
            )
          )}
          <Button
            variant="ghost"
            className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
            onClick={nextPage}
            disabled={!canNextPage}
            aria-label="Go to next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Mobile fallback: prev/next arrows stay reachable, with the count
            between them so the current position is still obvious. */}
        <div className="flex items-center gap-1 sm:hidden">
          <Button
            variant="ghost"
            className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
            onClick={previousPage}
            disabled={!canPreviousPage}
            aria-label="Go to previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-1 text-sm font-medium tabular-nums text-foreground">
            {pageIndex + 1} / {pageCount || 1}
          </span>
          <Button
            variant="ghost"
            className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
            onClick={nextPage}
            disabled={!canNextPage}
            aria-label="Go to next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
