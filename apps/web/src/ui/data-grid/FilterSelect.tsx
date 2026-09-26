"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/Select"

export interface FilterSelectOption {
  value: string
  label: string
}

/**
 * The admin toolbar facet control: a compact `Select` sized for table toolbars.
 *
 * Every admin table toolbar (discovery tabs and the opportunities grid) uses
 * this instead of restyling `SelectTrigger` locally, so trigger height, radius
 * and typography stay one decision in one place.
 */
export function FilterSelect({
  value,
  onChange,
  options,
  placeholder,
  ariaLabel,
  className,
  contentClassName,
}: {
  value: string
  onChange: (value: string) => void
  options: FilterSelectOption[]
  placeholder?: string
  ariaLabel?: string
  className?: string
  contentClassName?: string
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        className={className ?? "w-auto min-w-28 cursor-pointer"}
        aria-label={ariaLabel}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={contentClassName}>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}