"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import AgingBar from "@/components/charts/aging-bar";
import CellActions from "@/components/common/cell-actions";
import DataTable from "@/components/common/data-table";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  formatBDT,
  formatBDTShort,
  formatDateOnly,
  formatMobile,
  formatNumber,
} from "@/lib/format";
import { useOutstandingReport } from "../api";

const columns = [
  {
    accessorKey: "bookingNo",
    header: "Booking",
    cell: ({ row }) => (
      <div className="leading-tight">
        <p className="font-medium">{row.original.bookingNo}</p>
        <p className="text-muted-foreground text-xs">
          {row.original.plot.code} · {row.original.project.name}
        </p>
      </div>
    ),
  },
  {
    id: "customer",
    header: "Customer",
    cell: ({ row }) => (
      <div className="leading-tight">
        <p>{row.original.customer.fullName}</p>
        <p className="text-muted-foreground text-xs">
          {formatMobile(row.original.customer.mobile)}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "outstanding",
    header: "Still owed",
    meta: { className: "hidden md:table-cell text-right whitespace-nowrap" },
    cell: ({ getValue }) => <span className="tabular-nums">{formatBDT(getValue())}</span>,
  },
  {
    accessorKey: "overdue",
    header: "Overdue",
    meta: { className: "text-right whitespace-nowrap" },
    cell: ({ row }) =>
      Number(row.original.overdue) > 0 ? (
        <div className="leading-tight tabular-nums">
          <p className="font-medium">{formatBDT(row.original.overdue)}</p>
          <p className="text-muted-foreground text-xs">
            {row.original.overdueCount} installment{row.original.overdueCount === 1 ? "" : "s"} ·{" "}
            {row.original.daysLate} days late
          </p>
        </div>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: "next",
    header: "Next due",
    meta: { className: "hidden lg:table-cell whitespace-nowrap" },
    cell: ({ row }) =>
      row.original.nextDue ? (
        <div className="leading-tight tabular-nums">
          <p>{formatBDT(row.original.nextDue.amount)}</p>
          <p className="text-muted-foreground text-xs">
            {formatDateOnly(row.original.nextDue.dueDate)}
          </p>
        </div>
      ) : (
        "—"
      ),
  },
  {
    accessorKey: "owner",
    header: "Salesperson",
    meta: { className: "hidden xl:table-cell" },
    cell: ({ row }) => row.original.owner?.fullName ?? "—",
  },
  {
    id: "actions",
    header: "",
    meta: { className: "w-28" },
    cell: ({ row }) => (
      <CellActions>
        <Button size="sm" variant="ghost" asChild>
          <Link href={`/statements/${row.original.customer.id}`} target="_blank">
            <FileText /> Statement
          </Link>
        </Button>
      </CellActions>
    ),
  },
];

export default function OutstandingReport({ projectId }) {
  const router = useRouter();
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);
  const { data, isLoading, isFetching, error } = useOutstandingReport({
    projectId: projectId || undefined,
    overdueOnly,
    search: debouncedSearch || undefined,
    page,
    limit: 25,
  });
  if (error) return <p className="text-destructive text-sm">{error.message}</p>;
  if (isLoading) return <Skeleton className="h-96" />;
  const totals = data.data.totals;
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Receivables aging</CardTitle>
          <CardDescription>
            {formatBDTShort(totals.outstanding)} still owed on {formatNumber(totals.bookings)}{" "}
            bookings, {formatBDTShort(totals.overdue)} of it overdue. Grouped by how many days past
            the due date.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AgingBar aging={totals.aging} format={formatBDTShort} />
        </CardContent>
      </Card>
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative w-full sm:w-72">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            placeholder="Booking, customer, mobile or plot"
            className="pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="overdueOnly"
            checked={overdueOnly}
            onCheckedChange={(v) => {
              setOverdueOnly(v);
              setPage(1);
            }}
          />
          <Label htmlFor="overdueOnly">Overdue only</Label>
        </div>
      </div>
      <DataTable
        columns={columns}
        data={data.data.rows}
        meta={data.meta}
        isLoading={isLoading}
        isFetching={isFetching}
        onPageChange={setPage}
        onRowClick={(row) => router.push(`/bookings/${row.id}`)}
        emptyMessage={overdueOnly ? "Nothing is overdue." : "Nothing is owed."}
      />
    </div>
  );
}
