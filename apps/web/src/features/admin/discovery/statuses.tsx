"use client"

import * as React from "react"

import { Badge } from "@/ui/Badge"
import { cn } from "@/lib/utils/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/Select"

export interface StatusOption {
  value: string
  label: string
}

/** Statuses valid for processed/normalized jobs. */
export const PROCESSED_STATUS_OPTIONS: StatusOption[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_REVIEW", label: "Pending Review" },
  { value: "PUBLISHED", label: "Published" },
  { value: "REJECTED", label: "Rejected" },
  { value: "EXPIRED", label: "Expired" },
]

/** Statuses valid for raw discovered jobs. */
export const DISCOVERED_STATUS_OPTIONS: StatusOption[] = [
  { value: "APPROVED", label: "Approved" },
  { value: "PENDING", label: "Pending" },
  { value: "PROCESSED", label: "Processed" },
  { value: "REJECTED", label: "Rejected" },
  { value: "EXPIRED", label: "Expired" },
]

const STATUS_VARIANT: Record<string, string> = {
  PUBLISHED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  APPROVED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  PROCESSED: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  PROCESSING: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
  PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  PENDING_REVIEW: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  DRAFT: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30",
  EXPIRED: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30",
  DUPLICATE: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  REJECTED: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30",
}

export function StatusBadge({ status }: { status: string }) {
  const label =
    status.charAt(0).toUpperCase() + status.slice(1).toLowerCase().replace(/_/g, " ")
  const variant = STATUS_VARIANT[status] ?? STATUS_VARIANT.REJECTED
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded text-[11px] font-bold border inline-block whitespace-nowrap",
        variant
      )}
    >
      {label}
    </span>
  )
}

/**
 * An inline editable status cell: a borderless select that reads as a plain
 * badge at rest and opens on click. Composes the same Radix Select primitive
 * the rest of the admin UI uses.
 */
export function StatusCell({
  value,
  options = PROCESSED_STATUS_OPTIONS,
  onChange,
  disabled,
}: {
  value: string
  options?: StatusOption[]
  onChange: (next: string) => void
  disabled?: boolean
}) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger
        className="h-auto w-full border-0 bg-transparent p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 [&>svg]:opacity-0 hover:[&>svg]:opacity-50 cursor-pointer disabled:opacity-100"
        aria-label="Status"
      >
        <SelectValue>
          <StatusBadge status={value} />
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="start" sideOffset={8}>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            <span className="flex items-center gap-2">
              <StatusBadge status={option.value} />
              <span className="text-xs">{option.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
