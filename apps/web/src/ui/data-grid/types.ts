import type { CellData, RowData, TableFeatures } from "@tanstack/react-table"

declare module "@tanstack/react-table" {
  // v9 puts TFeatures first on every core type; this augmentation must mirror
  // the shipped `ColumnMeta` parameters exactly or TS rejects the merge.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<
    TFeatures extends TableFeatures,
    TData extends RowData,
    TValue extends CellData,
  > {
    headerTitle?: string
    cellClassName?: string
    headerClassName?: string
    /** Per-column skeleton placeholder rendered while `isLoading` is true. */
    skeleton?: React.ReactNode
    /**
     * Pin this column to the left edge on small screens so the table scrolls
     * horizontally instead of squeezing. Pair with `stickyOffsetClass` when
     * the column is not the first one (e.g. a select checkbox column sits
     * before it). The grid applies `max-md:sticky` + an opaque background
     * automatically — this flag only marks intent.
     */
    sticky?: 'left'
    /**
     * Tailwind `left-*` offset for a sticky column that follows another
     * sticky column, e.g. `left-10` after the 40px select column. Ignored
     * unless `sticky` is set.
     */
    stickyOffsetClass?: string
  }
}

export {}
