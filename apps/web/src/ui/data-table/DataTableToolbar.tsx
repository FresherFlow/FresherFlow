"use client"

import { Table } from "@tanstack/react-table"
import { X } from "lucide-react"

import { Button } from "@/ui/Button"
import { Input } from "@/ui/Input"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  searchColumn?: string
  searchPlaceholder?: string
}

export function DataTableToolbar<TData>({
  table,
  searchColumn,
  searchPlaceholder,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        {searchColumn && (
          <Input
            placeholder={searchPlaceholder ?? 'Search...'}
            value={(table.getColumn(searchColumn)?.getFilterValue() as string) ?? ''}
            onChange={(e) => table.getColumn(searchColumn)?.setFilterValue(e.target.value)}
            className="h-9 w-[200px] lg:w-[280px] text-sm"
          />
        )}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-10 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
