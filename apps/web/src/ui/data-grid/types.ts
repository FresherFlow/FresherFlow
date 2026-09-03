import { CellData, RowData, TableFeatures } from "@tanstack/react-table"

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TFeatures extends TableFeatures, TData extends RowData, TValue extends CellData> {
    headerTitle?: string
    cellClassName?: string
    headerClassName?: string
    /** Per-column skeleton placeholder rendered while `isLoading` is true. */
    skeleton?: React.ReactNode
  }
}

export {}
