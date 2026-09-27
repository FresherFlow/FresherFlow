"use client";

import React, { useCallback, useMemo } from "react";
import { SortingState } from "@tanstack/react-table";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { Archive, CircleCheck, Clock, Trash2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/ui/Tooltip";
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

/** Rows-per-page choices, server-owned: both footers read the same list. */
const PAGE_SIZE_OPTIONS = [20, 50, 100];

/**
 * Icon-only bulk action, exactly the shadcn-admin `DataTableBulkActions`
 * pattern: a `size-8` icon button with no visible label, plus a tooltip and an
 * `sr-only` name so the action stays discoverable and screen-reader safe. The
 * selected count already lives in the bar's badge.
 */
function BulkIconAction({
  icon: Icon,
  label,
  variant = "outline",
  disabled,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  variant?: "outline" | "destructive";
  disabled?: boolean;
  onClick: () => void;
}) {
  const description = `${label} selected listings`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={variant}
          size="icon"
          className="size-8"
          disabled={disabled}
          onClick={onClick}
          aria-label={description}
          title={description}
        >
          <Icon className="size-4" />
          <span className="sr-only">{description}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{description}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export interface AdminOpportunitiesTableProps {
  opportunities: AdminOpportunityRow[];
  isLoading: boolean;
  /** Server-side total; may exceed the rows on this page. */
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Rows-per-page is server-owned, so changing it must re-query. */
  onPageSizeChange?: (pageSize: number) => void;

  /** Server sort, expressed as the existing `sort` URL param. */
  sort: string;
  onSortChange: (value: string) => void;
  sortOptions?: { value: string; label: string }[];
  /** Drives the server query, since this grid is server-paginated. */
  searchValue?: string;
  onSearchChange?: (value: string) => void;

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
  /**
   * Canonical selection, owned by the caller (the admin actions hook) because
   * bulk actions run off it. The grid reports TanStack's own selection back
   * through `onSelectedRowsChange`.
   */
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
  onPageSizeChange,
  sort,
  onSortChange,
  sortOptions = [],
  searchValue,
  onSearchChange,
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
        {showTypeFilter && onTypeChange && (
          <Select
            value={typeFilter || ALL}
            onValueChange={(v) => onTypeChange(v === ALL ? "" : v)}
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
                  key={option.value || ALL}
                  value={option.value || ALL}
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={sort} onValueChange={onSortChange}>
          <SelectTrigger
            className="w-auto min-w-28 cursor-pointer"
            aria-label="Sort listings"
          >
            <SelectValue placeholder="Newest" />
          </SelectTrigger>
          <SelectContent>
            {sortOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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

      </div>
    ),
    [
      showTypeFilter,
      typeFilter,
      typeOptions,
      onTypeChange,
      atsFilter,
      atsOptions,
      onAtsFilterChange,
      onRefresh,
      isLoading,
    ],
  );

  /**
   * Selection-dependent buttons. These render in the floating bulk bar (see
   * `bulkActions` on DataGrid) instead of the header, so they stay reachable
   * on mobile without overflowing the toolbar. Labels stay visible — the bar
   * scrolls horizontally when the viewport is narrow.
   */
  const bulkToolbar = useCallback(
    (_ctx: DataGridActionsContext<AdminOpportunityRow>) => (
      <>
        {bulkActionPending && (
          <span className="text-xs text-muted-foreground flex items-center gap-1 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {bulkActionLabel || "working"}...
          </span>
        )}
        <BulkIconAction
          icon={CircleCheck}
          label="Publish"
          disabled={bulkActionPending}
          onClick={() => onBulkAction?.("PUBLISH")}
        />
        <BulkIconAction
          icon={Clock}
          label="Expire"
          disabled={bulkActionPending}
          onClick={() => onBulkAction?.("EXPIRE")}
        />
        <BulkIconAction
          icon={Archive}
          label="Archive"
          disabled={bulkActionPending}
          onClick={() => onBulkAction?.("ARCHIVE")}
        />
        <BulkIconAction
          icon={Trash2}
          label="Delete"
          variant="destructive"
          disabled={bulkActionPending}
          onClick={() => onBulkAction?.("DELETE")}
        />
      </>
    ),
    [bulkActionPending, bulkActionLabel, onBulkAction],
  );

  const emptyState = (
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
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-2">
      {/* search, faceting, selection and sorting all live in the grid */}
      {/* flex-col is load-bearing: the Card below sizes with flex-1, which
          only engages inside a flex parent. As a plain block div the Card
          grew to full content height, pushing the footer off-screen with
          nowhere to scroll. */}
      <div className="flex min-h-0 flex-1 flex-col">
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
          noResults={emptyState}
          statusValue={statusFilter || ALL}
          onStatusChange={(value) => onStatusChange(value === ALL ? "" : value)}
          statusOptions={[{ value: ALL, label: "All status" }, ...statusOptions]}
          onClear={onClearFilters}
          actions={toolbar}
          bulkActions={enableSelection ? bulkToolbar : undefined}
          bulkBarEntityName="listing"
          onSelectedRowsChange={
            enableSelection ? onSelectedRowsChange : undefined
          }
          className="min-h-0 flex-1"
          /* Server-paginated source: the grid shows every row it was
           * given and the footer is driven by the server page count. */
          defaultPageSize={pageSize}
          sorting={sorting}
          onSortingChange={handleSortingChange}
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          serverPagination={{
            pageIndex: page - 1,
            pageCount: Math.max(totalPages, 1),
            // DataGrid speaks zero-based, this component's page prop is one-based.
            // Passing `onPageChange` straight through meant clicking page 2 sent
            // pageIndex 1, which set the page to 1 and the grid never moved.
            onPageChange: (pageIndex) => onPageChange(pageIndex + 1),
            defaultPageSize: pageSize,
            pageSize,
            onPageSizeChange,
            pageSizeOptions: PAGE_SIZE_OPTIONS,
          }}
        />
      </div>
    </div>
  );
};
