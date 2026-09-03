"use client";

// Dev playground for the shared DataGrid: 1000 mock rows to verify
// pagination, search, sorting, selection and scroll performance.
// Only mounted under /dev — no auth, no SEO.

import { useMemo, useState } from "react";
import {
  DataGrid,
  DataGridColumn,
  DataGridActionsContext,
} from "@/ui/data-grid/DataGrid";
import { Badge } from "@/ui/Badge";

interface GridTestRow {
  id: string;
  name: string;
  email: string;
  company: string;
  status: "Active" | "Pending" | "Inactive";
  balance: number;
}

const NAMES = ["Alex Johnson", "Sarah Chen", "Michael Rodriguez", "Emma Wilson", "David Kim", "Maria Garcia", "James Brown", "Nick Johnson"];
const COMPANIES = ["Apple", "OpenAI", "Meta", "Tesla", "SAP", "BBVA", "Sony", "LVMH"];
const STATUSES: GridTestRow["status"][] = ["Active", "Pending", "Inactive"];

const ROWS: GridTestRow[] = Array.from({ length: 1000 }, (_, i) => {
  const name = NAMES[i % NAMES.length];
  return {
    id: String(i + 1),
    name: `${name} ${i + 1}`,
    email: `${name.toLowerCase().replace(" ", ".")}${i + 1}@company.com`,
    company: COMPANIES[(i * 3) % COMPANIES.length],
    status: STATUSES[i % STATUSES.length],
    balance: Math.round((1000 + ((i * 137.17) % 9000)) * 100) / 100,
  };
});

export default function GridTestPage() {
  const [selectedCount, setSelectedCount] = useState(0);

  const columns = useMemo<DataGridColumn<GridTestRow>[]>(
    () => [
      {
        id: "user",
        accessorFn: (row) => row.name,
        header: "User",
        enableSorting: true,
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span className="text-foreground font-medium">{row.original.name}</span>
            <span className="text-muted-foreground text-xs">{row.original.email}</span>
          </div>
        ),
      },
      {
        id: "company",
        accessorFn: (row) => row.company,
        header: "Company",
        enableSorting: true,
        cell: ({ row }) => <span className="text-foreground">{row.original.company}</span>,
      },
      {
        id: "status",
        accessorFn: (row) => row.status,
        header: "Status",
        enableSorting: true,
        cell: ({ row }) => {
          const s = row.original.status;
          return (
            <Badge
              variant="outline"
              className={
                s === "Active"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : s === "Pending"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-purple-600 dark:text-purple-400"
              }
            >
              {s}
            </Badge>
          );
        },
      },
      {
        id: "balance",
        accessorFn: (row) => row.balance,
        header: "Balance",
        enableSorting: true,
        meta: { cellClassName: "text-right" },
        cell: ({ row }) => (
          <span className="tabular-nums">
            ${row.original.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </span>
        ),
      },
    ],
    []
  );

  const handleSelectedRowsChange = (rows: GridTestRow[]) =>
    setSelectedCount(rows.length);

  const renderActions = (_ctx: DataGridActionsContext<GridTestRow>) => (
    <span className="text-xs text-muted-foreground px-1">
      {selectedCount} selected
    </span>
  );

  return (
    <div className="p-6 h-screen flex flex-col">
      <DataGrid<GridTestRow>
        data={ROWS}
        getRowId={(row) => row.id}
        columns={columns}
        enableSelection
        title="Grid Test"
        count={ROWS.length}
        countLabel="rows"
        isLoading={false}
        searchPlaceholder="Search name, email, company..."
        onSelectedRowsChange={handleSelectedRowsChange}
        actions={renderActions}
      />
    </div>
  );
}
