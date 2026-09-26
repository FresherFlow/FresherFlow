"use client";

import React, { useCallback, useMemo } from "react";
import { SortingState } from "@tanstack/react-table";
import {
  ArrowPathIcon,
  ArchiveBoxIcon,
  ClockIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { DataGrid, DataGridActionsContext } from "@/ui/data-grid/DataGrid";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/Select";
import { Button } from "@/ui/Button";
import { EmptyState } from "@/ui/EmptyState";
import { cn } from "@/ui/cn";
import {
  AdminOpportunityRow,
  SocialOpportunity,
} from "@/features/admin/opportunities/listUtils";
import {
  getAtsName,
  useOpportunityColumns,
} from "@/features/admin/opportunities/columns";

const ALL = "ALL";

export interface AdminOpportunitiesTableProps {
  opportunities: AdminOpportunityRow[];
  isLoading: boolean;
  /** Server-side total; may exceed the rows on this page. */
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;

  /** Server sort, expressed as the existing `sort` URL param. */
  sort: string;
  onSortChange: (value: string) => void;

  statusFilter: string;
  onStatusChange: (value: string) => void;
  statusOptions: { value: string; label: string }[];

  /** Client-side source/ATS facet, same as the discovery tabs. */
  atsFilter: string;
  onAtsFilterChange: (value: string) => void;

  showTypeFilter?: boolean;
  typeFilter?: string;
  onTypeChange?: (value: string) => void;
  typeOptions?: { value: string; label: string }[];

  onRefresh: () => void;
  onClearFilters: () => void;

  enableSelection?: boolean;
  onSelectedRowsChange?: (rows: AdminOpportunityRow[]) => void;

  onPreview: (id: string) => void;
  onCopyCaption: (opp: SocialOpportunity) => void;
  onStatusUpdate: (id: string, status: string) => void;
  onRejectDraft: (id: string, title: string) => void;
  onExpire: (id: string, title: string, status?: string) => void;
  onDelete: (id: string, title: string) => void;
  onHardDelete: (id: string, title: string) => void;
  onRestore: (id: string) => void;

  bulkActionPending?: boolean;
  bulkActionLabel?: string;
  onBulkAction?: (action: "DELETE" | "ARCHIVE" | "PUBLISH" | "EXPIRE") => void;

  title?: string;
  description?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
}

/**
 * Opportunity listings grid.
 *
 * One component serves every admin opportunity queue (all listings, the draft
 * review queue, the archived/deleted queue). It is built on the same `DataGrid`
 * the discovery workspace uses, so search, sorting, row selection, pagination,
 * loading and empty states behave identically across admin surfaces.
 *
 * Filtering and paging are owned by the parent because the admin opportunities
 * API is server-paginated; search and sort run client-side over the loaded page
 * — the same split the discovery tabs use. `totalCount` drives the count badge
 * so operators never mistake a page size for the corpus size.
 */
export const AdminOpportunitiesTable = ({
  opportunities,
  isLoading,
  totalCount,
  page,
  pageSize,
  totalPages,
  onPageChange,
  sort,
  onSortChange,
  statusFilter,
  onStatusChange,
  statusOptions,
  atsFilter,
  onAtsFilterChange,
  showTypeFilter = false,
  typeFilter = "",
  onTypeChange,
  typeOptions = [],
  onRefresh,
  onClearFilters,
  enableSelection = true,
  onSelectedRowsChange,
  onPreview,
  onCopyCaption,
  onStatusUpdate,
  onRejectDraft,
  onExpire,
  onDelete,
  onHardDelete,
  onRestore,
  bulkActionPending = false,
  bulkActionLabel = "",
  onBulkAction,
  title = "Listings",
  description,
  searchPlaceholder = "Search title, company, location…",
  emptyMessage,
}: AdminOpportunitiesTableProps) => {
  const columns = useOpportunityColumns(
    {
      onPreview,
      onCopyCaption,
      onStatusUpdate,
      onRejectDraft,
      onExpire,
      onDelete,
      onHardDelete,
      onRestore,
    },
    { enableSelection },
  );

  /** Source facet options are derived from the rows currently loaded. */
  const atsOptions = useMemo(
    () =>
      Array.from(
        new Set(
          opportunities
            .map((opp) => getAtsName(opp.applyLink || opp.sourceLink))
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort(),
    [opportunities],
  );

  const filteredRows = useMemo(() => {
    if (atsFilter === ALL) return opportunities;
    return opportunities.filter(
      (opp) => getAtsName(opp.applyLink || opp.sourceLink) === atsFilter,
    );
  }, [opportunities, atsFilter]);

  /**
   * Server sort param -> TanStack sorting state, so column-header clicks and
   * the "Sort" dropdown stay in sync (both write through `onSortChange`).
   */
  const sorting = useMemo<SortingState>(() => {
    const [key, dir] = sort.split("_");
    return [
      {
        id: key === "company" ? "opportunity" : "postedAt",
        desc: dir !== "asc",
      },
    ];
  }, [sort]);

  const handleSortingChange = useCallback(
    (updater: React.SetStateAction<SortingState>) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      const first = next[0];
      if (!first) return;
      const key = first.id === "opportunity" ? "company" : "postedAt";
      onSortChange(`${key}_${first.desc ? "desc" : "asc"}`);
    },
    [onSortChange, sorting],
  );

  const toolbar = useCallback(
    (ctx: DataGridActionsContext<AdminOpportunityRow>) => (
      <div className="flex items-center gap-2 flex-wrap justify-end">
        <Select value={atsFilter} onValueChange={onAtsFilterChange}>
          <SelectTrigger
            className="w-auto min-w-30 cursor-pointer"
            aria-label="Filter by source"
          >
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All sources</SelectItem>
            {atsOptions.map((ats) => (
              <SelectItem key={ats} value={ats}>
                {ats}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant="admin"
          size="sm"
          onClick={onRefresh}
          title="Refresh data"
        >
          <ArrowPathIcon
            className={cn("w-3.5 h-3.5 sm:mr-1.5", isLoading && "animate-spin")}
          />
          <span className="hidden sm:inline">Refresh</span>
        </Button>

        {enableSelection && ctx.selectedCount > 0 && (
          <>
            {bulkActionPending && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                {bulkActionLabel || "working"}...
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBulkAction?.("PUBLISH")}
              disabled={bulkActionPending}
            >

              Publish ({ctx.selectedCount})
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBulkAction?.("EXPIRE")}
              disabled={bulkActionPending}
            >
              <ClockIcon className="w-3.5 h-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">
                Expire ({ctx.selectedCount})
              </span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBulkAction?.("ARCHIVE")}
              disabled={bulkActionPending}
            >
              <ArchiveBoxIcon className="w-3.5 h-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">
                Archive ({ctx.selectedCount})
              </span>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onBulkAction?.("DELETE")}
              disabled={bulkActionPending}
            >
              <TrashIcon className="w-3.5 h-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">
                Delete ({ctx.selectedCount})
              </span>
            </Button>
          </>

        )}
      </div>
    ),
    [
      atsFilter,
      atsOptions,
      onAtsFilterChange,
      onRefresh,
      isLoading,
      enableSelection,
      bulkActionPending,
      bulkActionLabel,
      onBulkAction,
    ],
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-2">
      {showTypeFilter && onTypeChange && (
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={typeFilter || "ALL"}
            onValueChange={(v) => onTypeChange(v === "ALL" ? "" : v)}
          >
            <SelectTrigger
              className="w-auto min-w-28 cursor-pointer"
              aria-label="Filter by type"
            >
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              {typeOptions.map((option) => (
                <SelectItem
                  key={option.value || "ALL"}
                  value={option.value || "ALL"}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <DataGrid<AdminOpportunityRow>
        data={filteredRows}
        columns={columns}
        getRowId={(row) => row.id}
        enableSelection={enableSelection}
        title={title}
        description={description}
        count={totalCount || filteredRows.length}
        countLabel={totalCount === 1 ? "listing" : "listings"}
        isLoading={isLoading}
        searchPlaceholder={searchPlaceholder}
        noResults={
          <EmptyState
            title="No listings found"
            description={
              emptyMessage ?? "Try clearing the filters, or create a new listing."
            }
            icon="search"
            size="md"
            variant="ghost"
            action={
              <Button type="button" size="sm" variant="outline" onClick={onClearFilters}>
                Clear filters
              </Button>
            }
          />
        }
        statusValue={statusFilter || ALL}
        onStatusChange={(value) => onStatusChange(value === ALL ? "" : value)}
        statusOptions={[{ value: ALL, label: "All status" }, ...statusOptions]}
        onClear={onClearFilters}
        actions={toolbar}
        onSelectedRowsChange={
          enableSelection ? onSelectedRowsChange : undefined
        }
        className="min-h-0 flex-1"
        /* Server-paginated source: the grid shows every row it was
         * given and the footer is driven by the server page count. */
        defaultPageSize={pageSize}
        pageSizeOptions={[pageSize]}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        serverPagination={{
          pageIndex: page - 1,
          pageCount: Math.max(totalPages, 1),
          onPageChange,
        }}
      />
    </div>
  );
};
