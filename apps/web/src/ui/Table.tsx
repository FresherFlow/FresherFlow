import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/ui/cn"

const tableHeaderVariants = cva(
  "border-b border-border [&_tr]:border-b-0 [&_tr]:hover:bg-transparent",
  {
    variants: {
      variant: {
        default: "bg-muted/40",
        // Opaque surface for headers pinned with `sticky` — rows scrolling
        // underneath must not show through.
        sticky: "bg-muted",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const tableRowVariants = cva(
  "border-b border-border/40 transition-colors hover:bg-muted/30 data-[state=selected]:bg-muted/50",
  {
    variants: {
      variant: {
        default: "",
        // Lift + fade for the row being dragged in a sortable table. Pair with
        // `data-dragging` on the row.
        dragging: "relative z-10 data-[dragging=true]:opacity-80",
        // Keyboard-operable row: the focus ring and pointer affordance belong
        // to the primitive, not to every call site that makes a row clickable.
        interactive:
          "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        // Secondary detail row under an expanded parent.
        subtle: "bg-muted/30 hover:bg-muted/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Table = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full">
    <table
      ref={ref}
      className={cn("w-full caption-bottom text-sm", className)}
      {...props}
    />
  </div>
))
Table.displayName = "Table"

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement> &
    VariantProps<typeof tableHeaderVariants>
>(({ className, variant, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(tableHeaderVariants({ variant }), className)}
    {...props}
  />
))
TableHeader.displayName = "TableHeader"

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
))
TableBody.displayName = "TableBody"

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    )}
    {...props}
  />
))
TableFooter.displayName = "TableFooter"

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement> &
    VariantProps<typeof tableRowVariants>
>(({ className, variant, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(tableRowVariants({ variant }), className)}
    {...props}
  />
))
TableRow.displayName = "TableRow"

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-10 px-2 text-left align-middle font-medium text-muted-foreground text-xs font-semibold uppercase tracking-wide [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
      className
    )}
    {...props}
  />
))
TableHead.displayName = "TableHead"

const tableCellVariants = cva(
  "px-4 py-3 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
  {
    variants: {
      variant: {
        default: "",
        // Dense number columns read as a column, not a jumble of widths.
        numeric: "tabular-nums",
        // De-emphasised metadata such as last-run timestamps.
        muted: "text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement> &
    VariantProps<typeof tableCellVariants>
>(({ className, variant, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(tableCellVariants({ variant }), className)}
    {...props}
  />
))
TableCell.displayName = "TableCell"

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-muted-foreground", className)}
    {...props}
  />
))
TableCaption.displayName = "TableCaption"

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
