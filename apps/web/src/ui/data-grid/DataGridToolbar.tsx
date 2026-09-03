"use client"

import * as React from "react"
import {
  ArrowPathIcon,
  CheckIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ViewColumnsIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline"
import type { RowData, StockFeatures, Table as ReactTable } from "@tanstack/react-table"

import { Popover, PopoverContent, PopoverTrigger } from "@/ui/Popover"
import { cn } from "@/lib/utils/utils"

const TOOLBAR_TRIGGER_STYLES =
  "h-9 px-3 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary cursor-pointer"

/** Search input matching the grid toolbar kit. Controlled by the consumer. */
export function DataGridSearch({
  value,
  onChange,
  placeholder = "Search...",
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={cn("relative", className)}>
      <MagnifyingGlassIcon className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full h-9 pl-9 pr-8 rounded-lg border border-border/80 bg-card text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus-visible:bg-muted/60 focus-visible:text-foreground"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <XMarkIcon className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}

export interface DataGridFacetOption {
  value: string
  label: string
  count?: number
}

/**
 * ReUI-style faceted filter: a compact trigger that opens a multi-select
 * list with per-option counts. Fully controlled — the consumer owns the
 * `selected` values and decides whether filtering happens in the table or
 * against an API.
 */
export function DataGridFacetFilter({
  label,
  options,
  selected,
  onChange,
  icon: Icon = FunnelIcon,
  className,
}: {
  label: string
  options: DataGridFacetOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>
  className?: string
}) {
  const active = selected.length > 0

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            TOOLBAR_TRIGGER_STYLES,
            active
              ? "border-primary/40 bg-primary/5 text-primary"
              : "border-border/80 bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            className
          )}
        >
          <Icon className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">{label}</span>
          {active && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {selected.length}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2">
        <div className="max-h-64 overflow-y-auto custom-scrollbar">
          {options.length === 0 && (
            <p className="px-2 py-3 text-xs text-muted-foreground text-center">
              No options available
            </p>
          )}
          {options.map((option) => {
            const isSelected = selected.includes(option.value)
            return (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  onChange(
                    isSelected
                      ? selected.filter((value) => value !== option.value)
                      : [...selected, option.value]
                  )
                }
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-foreground hover:bg-muted/60 transition-colors cursor-pointer text-left"
              >
                <span
                  className={cn(
                    "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors",
                    isSelected
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-border"
                  )}
                >
                  {isSelected && <CheckIcon className="w-2.5 h-2.5" />}
                </span>
                <span className="truncate flex-1">{option.label}</span>
                {typeof option.count === "number" && (
                  <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">
                    {option.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        {active && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="w-full mt-1 px-2 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 flex items-center gap-1.5 justify-center transition-colors cursor-pointer"
          >
            <XMarkIcon className="w-3.5 h-3.5" />
            Clear filter
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}

/**
 * Column visibility toggle for a TanStack table instance. Lists every
 * hideable column with a checkbox row, plus a "Show all" reset while any
 * column is hidden.
 */
export function DataGridColumnVisibility<TData extends RowData>({
  table,
  className,
}: {
  table: ReactTable<StockFeatures, TData>
  className?: string
}) {
  const hideableColumns = table
    .getAllLeafColumns()
    .filter((column) => column.getCanHide())

  if (hideableColumns.length === 0) return null

  const visibleCount = hideableColumns.filter((column) =>
    column.getIsVisible()
  ).length
  const hasHidden = visibleCount < hideableColumns.length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            TOOLBAR_TRIGGER_STYLES,
            "border-border/80 bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            className
          )}
        >
          <ViewColumnsIcon className="w-4 h-4 shrink-0" />
          <span className="hidden sm:inline">Columns</span>
          {hasHidden && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/10 px-1 text-[10px] font-bold text-primary">
              {visibleCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52 p-2">
        <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
          Toggle columns
        </p>
        <div className="max-h-64 overflow-y-auto custom-scrollbar">
          {hideableColumns.map((column) => {
            const label =
              column.columnDef.meta?.headerTitle ??
              (typeof column.columnDef.header === "string"
                ? column.columnDef.header
                : column.id)
            const isVisible = column.getIsVisible()
            return (
              <button
                key={column.id}
                type="button"
                onClick={() => column.toggleVisibility(!isVisible)}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-foreground hover:bg-muted/60 transition-colors cursor-pointer text-left"
              >
                <span
                  className={cn(
                    "w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors",
                    isVisible
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-border"
                  )}
                >
                  {isVisible && <CheckIcon className="w-2.5 h-2.5" />}
                </span>
                <span className="truncate">{label}</span>
              </button>
            )
          })}
        </div>
        {hasHidden && (
          <button
            type="button"
            onClick={() =>
              hideableColumns.forEach((column) => column.toggleVisibility(true))
            }
            className="w-full mt-1 px-2 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 flex items-center gap-1.5 justify-center transition-colors cursor-pointer"
          >
            <ArrowPathIcon className="w-3.5 h-3.5" />
            Show all
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}
