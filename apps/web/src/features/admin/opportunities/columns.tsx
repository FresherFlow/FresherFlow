"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  CheckCircleIcon,
  ClockIcon,
  DocumentDuplicateIcon,
  EllipsisHorizontalIcon,
  EyeIcon,
  MapPinIcon,
  PencilSquareIcon,
  TrashIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/ui/DropdownMenu";
import { Badge } from "@/ui/Badge";
import CompanyLogo from "@/features/companies/components/CompanyLogo";
import { DataGridColumn } from "@/ui/data-grid/DataGrid";
import { STICKY_AFTER_SELECT } from "@/ui/data-grid/sticky";
import { selectionColumn } from "@/features/admin/discovery/selectionColumn";
import { AdminOpportunityRow, getStatusLabel } from "./listUtils";
import { MetaPill, OpportunityStatusCell } from "./statuses";
import { isGovernmentOpportunity, kindFromOpportunity, type OpportunityKind } from "./formUtils";

/** Operator-facing type label; `GOVERNMENT` is a sector, not a card type. */
export const TYPE_LABELS: Record<OpportunityKind, string> = {
  JOB: "Job",
  INTERNSHIP: "Internship",
  WALKIN: "Walk-in",
  GOVERNMENT: "Govt Job",
};

export const OPPORTUNITY_TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "JOB", label: "Jobs" },
  { value: "INTERNSHIP", label: "Internships" },
  { value: "WALKIN", label: "Walk-ins" },
  { value: "GOVERNMENT", label: "Govt Jobs" },
];

export const OPPORTUNITY_SORT_OPTIONS = [
  { value: "postedAt_desc", label: "Newest first" },
  { value: "postedAt_asc", label: "Oldest first" },
  { value: "company_asc", label: "Company A–Z" },
  { value: "company_desc", label: "Company Z–A" },
];

/**
 * Applicant Tracking System behind an apply / source link. Display-only
 * attribution: parse the hostname with `URL` and match exact hosts or
 * sub-domains — never a substring of the full URL.
 */
const ATS_HOSTS: Array<{ label: string; hosts: string[] }> = [
  { label: "Greenhouse", hosts: ["greenhouse.io"] },
  { label: "Lever", hosts: ["lever.co"] },
  { label: "Workday", hosts: ["myworkdayjobs.com", "workday.com"] },
  { label: "Ashby", hosts: ["ashbyhq.com"] },
  { label: "BambooHR", hosts: ["bamboohr.com"] },
  { label: "BreezyHR", hosts: ["breezy.hr"] },
  { label: "SmartRecruiters", hosts: ["smartrecruiters.com"] },
  { label: "Workable", hosts: ["workable.com"] },
  { label: "iCIMS", hosts: ["icims.com"] },
  { label: "Jobvite", hosts: ["jobvite.com"] },
  { label: "Recruitee", hosts: ["recruitee.com"] },
  {
    label: "Phenom",
    hosts: ["phenompro.com", "phenompeople.com", "phenom.com"],
  },
  { label: "Taleo", hosts: ["taleo.net"] },
  {
    label: "SuccessFactors",
    hosts: ["successfactors.com", "successfactors.eu"],
  },
  { label: "Darwinbox", hosts: ["darwinbox.in", "darwinbox.com"] },
  { label: "Eightfold", hosts: ["eightfold.ai"] },
  { label: "Freshteam", hosts: ["freshteam.com"] },
  { label: "Mercor", hosts: ["mercor.com"] },
];

export function getAtsName(link?: string | null): string | null {
  if (!link) return null;
  let host: string;
  try {
    host = new URL(link).hostname.toLowerCase();
  } catch {
    return null;
  }
  for (const entry of ATS_HOSTS) {
    if (
      entry.hosts.some(
        (candidate) => host === candidate || host.endsWith(`.${candidate}`),
      )
    ) {
      return entry.label;
    }
  }
  if (host.split(".").some((part) => part === "careers" || part === "jobs"))
    return "Careers";
  const parts = host.split(".");
  if (parts.length >= 2) {
    const domain = parts[parts.length - 2];
    if (domain) return domain.charAt(0).toUpperCase() + domain.slice(1);
  }
  return null;
}

/**
 * Operator label for an admin row. The kind is derived from the independent
 * taxonomy dimensions (category / recruitmentMethod / sector / employmentTypes)
 * — `opp.type` no longer exists on the model.
 */
export function getOpportunityKindLabel(
  opp: AdminOpportunityRow,
): string {
  return TYPE_LABELS[kindFromOpportunity(opp)];
}

function formatCount(value: number | undefined | null) {
  if (!value && value !== 0) return "0";
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export interface OpportunityColumnActions {
  onPreview: (id: string) => void;
  onCopyCaption: (opp: AdminOpportunityRow) => void;
  onStatusUpdate: (id: string, status: string) => void;
  onRejectDraft: (id: string, title: string) => void;
  onExpire: (id: string, title: string, status?: string) => void;
  onDelete: (id: string, title: string) => void;
  onHardDelete: (id: string, title: string) => void;
  onRestore: (id: string) => void;
}

/**
 * The canonical opportunity column set, shared by the listings grid and the
 * review queues. Same shape as the discovery tabs: `selectionColumn` first,
 * typed accessor columns (so DataGrid's search + sort work), a derived status
 * cell and a single actions menu.
 */
export function useOpportunityColumns(
  actions: OpportunityColumnActions,
  options: { enableSelection?: boolean } = {},
) {
  const { enableSelection = true } = options;

  return useMemo<DataGridColumn<AdminOpportunityRow>[]>(() => {
    const columns: DataGridColumn<AdminOpportunityRow>[] = [
      {
        id: "opportunity",
        accessorFn: (row) => `${row.title} ${row.company}`,
        header: "Opportunity",
        enableSorting: true,
        // Pinned on mobile next to the select checkbox so operators keep
        // row identity while scrolling (see ui/data-grid/sticky). The offset
        // only applies when a select column is actually rendered — without one
        // it would leave a 40px hole at the left edge.
        meta: {
          sticky: "left",
          stickyOffsetClass: enableSelection ? STICKY_AFTER_SELECT : undefined,
        },
        cell: ({ row }) => {
          const opp = row.original;
          return (
            <div className="flex min-w-0 max-w-44 items-center gap-3 sm:max-w-72">
              <CompanyLogo
                companyName={opp.company}
                companyWebsite={opp.companyWebsite}
                companyLogoUrl={opp.companyLogoUrl}
                applyLink={opp.applyLink}
                isGovernment={isGovernmentOpportunity(opp)}
                className="w-8 h-8 shrink-0"
              />
              {/* Title and company are capped narrower on mobile: this is the
                  pinned column, and at the desktop cap it filled the whole
                  phone viewport, so the columns beside it never appeared. */}
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => actions.onPreview(opp.id)}
                  className="block max-w-36 truncate text-left font-semibold leading-snug text-foreground hover:text-primary hover:underline sm:max-w-60"
                  title={opp.title}
                >
                  {opp.title}
                </button>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span
                    className="max-w-32 truncate text-sm text-muted-foreground sm:max-w-40"
                    title={opp.company}
                  >
                    {opp.company}
                  </span>
                </div>
              </div>
            </div>
          );
        },
      },
      {
        id: "type",
        accessorFn: (row) => getOpportunityKindLabel(row),
        header: "Type",
        enableSorting: true,
        cell: ({ row }) => (
          <MetaPill>{getOpportunityKindLabel(row.original)}</MetaPill>
        ),
      },
      {
        id: "location",
        accessorFn: (row) => (row.locations || []).join(", "),
        header: "Location",
        enableSorting: false,
        cell: ({ row }) => {
          const locations = row.original.locations || [];
          return (
            <div className="flex max-w-44 items-center gap-1 text-sm text-muted-foreground sm:max-w-56">
              <MapPinIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {locations.length ? locations.join(", ") : "Not specified"}
              </span>
            </div>
          );
        },
      },
      {
        id: "postedAt",
        accessorFn: (row) => {
          const value = row.postedAt;
          return value ? new Date(value).getTime() : 0;
        },
        header: "Posted",
        enableSorting: true,
        meta: { cellClassName: "text-muted-foreground" },
        cell: ({ row }) => {
          const postedAt = row.original.postedAt;
          if (!postedAt) return "-";
          const date = new Date(postedAt);
          return Number.isNaN(date.getTime())
            ? "-"
            : date.toLocaleString([], {
                dateStyle: "short",
                timeStyle: "short",
              });
        },
      },
      {
        id: "status",
        accessorFn: (row) => getStatusLabel(row),
        header: "Status",
        enableSorting: true,
        meta: { cellClassName: "text-center" },
        cell: ({ row }) => <OpportunityStatusCell opportunity={row.original} />,
      },
      {
        id: "source",
        accessorFn: (row) => getAtsName(row.applyLink || row.sourceLink) ?? "",
        header: "Source",
        enableSorting: true,
        cell: ({ row }) => {
          const ats = getAtsName(
            row.original.applyLink || row.original.sourceLink,
          );
          if (!ats)
            return <span className="text-muted-foreground">-</span>;
          /* `Badge` instead of the hand-rolled chip this used to be, so the
             source label picks up the primitive's own padding, type and
             border rather than a second set of local classes. */
          return (
            <Badge variant="muted" size="sm">
              {ats}
            </Badge>
          );
        },
      },
      {
        id: "engagement",
        accessorFn: (row) =>
          (row.clicksCount ?? 0) + (row.savesCount ?? 0),
        header: "Clicks / Saves",
        enableSorting: true,
        meta: {
          cellClassName: "text-right text-muted-foreground tabular-nums",
        },
        cell: ({ row }) => (
          <span>
            <span className="font-semibold text-foreground">
              {formatCount(row.original.clicksCount)}
            </span>
            {" / "}
            <span className="font-semibold text-foreground">
              {formatCount(row.original.savesCount)}
            </span>
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        meta: { cellClassName: "text-right" },
        cell: ({ row }) => {
          const opp = row.original;
          const label: string = getStatusLabel(opp);
          const isDraft = label === "DRAFT";
          const isDeleted = label === "DELETED";
          const canChangeStatus = label === "LIVE" || label === "EXPIRED";
          const link = opp.applyLink || opp.sourceLink;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors cursor-pointer outline-none focus-visible:bg-muted/60 focus-visible:text-foreground"
                  aria-label={`Actions for ${opp.title}`}
                >
                  <EllipsisHorizontalIcon className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {link && (
                  <DropdownMenuItem asChild>
                    <a
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center cursor-pointer w-full"
                    >
                      <ArrowTopRightOnSquareIcon className="w-4 h-4 mr-2" />{" "}
                      Open link
                    </a>
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem
                  onClick={() => actions.onCopyCaption(opp)}
                  className="cursor-pointer"
                >
                  <DocumentDuplicateIcon className="w-4 h-4 mr-2" /> Copy
                  caption
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => actions.onPreview(opp.id)}
                  className="cursor-pointer"
                >
                  <EyeIcon className="w-4 h-4 mr-2" /> Preview
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                  <Link
                    href={`/admin/opportunities/edit/${opp.slug || opp.id}`}
                    className="flex items-center cursor-pointer w-full"
                  >
                    <PencilSquareIcon className="w-4 h-4 mr-2" /> Edit
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {isDraft && (
                  <>
                    <DropdownMenuItem
                      onClick={() =>
                        actions.onStatusUpdate(opp.id, "PUBLISHED")
                      }
                      className="cursor-pointer"
                    >
                      <CheckCircleIcon className="w-4 h-4 mr-2" /> Publish
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => actions.onRejectDraft(opp.id, opp.title)}
                      className="cursor-pointer"
                    >
                      <XCircleIcon className="w-4 h-4 mr-2" /> Reject
                    </DropdownMenuItem>
                  </>
                )}

                {canChangeStatus && (
                  <DropdownMenuItem
                    onClick={() =>
                      actions.onExpire(opp.id, opp.title, opp.status)
                    }
                    className="cursor-pointer"
                  >
                    <ClockIcon className="w-4 h-4 mr-2" /> Change status
                  </DropdownMenuItem>
                )}

                {isDeleted && (
                  <DropdownMenuItem
                    onClick={() => actions.onRestore(opp.id)}
                    className="cursor-pointer"
                  >
                    <ArrowPathIcon className="w-4 h-4 mr-2" /> Restore
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={() => actions.onDelete(opp.id, opp.title)}
                  className="cursor-pointer"
                >
                  <TrashIcon className="w-4 h-4 mr-2" /> Archive
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => actions.onHardDelete(opp.id, opp.title)}
                  className="cursor-pointer"
                >
                  <XCircleIcon className="w-4 h-4 mr-2" /> Delete permanently
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ];

    return enableSelection
      ? [selectionColumn<AdminOpportunityRow>(), ...columns]
      : columns;
  }, [actions, enableSelection]);
}
