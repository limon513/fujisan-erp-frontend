"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Banknote, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CellActions from "@/components/common/cell-actions";
import DataTable from "@/components/common/data-table";
import PageHeader from "@/components/common/page-header";
import RequirePermission from "@/components/common/require-permission";
import StatusBadge from "@/components/common/status-badge";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatBDT, formatDateOnly } from "@/lib/format";
import { useCan } from "@/modules/auth/auth-provider";
import { transfers } from "../api";
import { TRANSFER_STATUS } from "../constants";
import { CompleteTransferDialog } from "./transfer-parts";

const TABS = {
  PENDING_APPROVAL: "Waiting for approval",
  APPROVED: "Fee due",
  COMPLETED: "Completed",
  all: "All",
};

export default function TransfersScreen() {
  const router = useRouter();
  const can = useCan();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [paying, setPaying] = useState(null);
  const debouncedSearch = useDebouncedValue(search);
  const { data, isLoading, isFetching, error } = transfers.useList({
    status: tab,
    search: debouncedSearch,
    page,
    limit: 25,
  });

  const columns = useMemo(
    () => [
      {
        accessorKey: "transferNo",
        header: "Transfer",
        cell: ({ row }) => (
          <div className="leading-tight">
            <p className="font-medium">{row.original.transferNo}</p>
            <p className="text-muted-foreground text-xs">
              {formatDateOnly(row.original.requestedOn)}
            </p>
          </div>
        ),
      },
      {
        id: "customers",
        header: "From → to",
        cell: ({ row }) => (
          <div className="leading-tight">
            <p className="flex items-center gap-1">
              {row.original.fromCustomer.fullName}
              <ArrowRight className="text-muted-foreground size-3.5 shrink-0" />
              {row.original.toCustomer.fullName}
            </p>
            <p className="text-muted-foreground text-xs">
              {row.original.booking.bookingNo} · {row.original.booking.plot.code}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "amountPaid",
        header: "Paid",
        meta: { className: "hidden md:table-cell text-right whitespace-nowrap" },
        cell: ({ getValue }) => (
          <span className="tabular-nums">{getValue() == null ? "—" : formatBDT(getValue())}</span>
        ),
      },
      {
        accessorKey: "feeAmount",
        header: "Fee",
        meta: { className: "text-right whitespace-nowrap" },
        cell: ({ getValue }) => (
          <span className="font-medium tabular-nums">{formatBDT(getValue())}</span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        meta: { className: "hidden sm:table-cell" },
        cell: ({ getValue }) => (
          <StatusBadge tone={TRANSFER_STATUS[getValue()].tone}>
            {TRANSFER_STATUS[getValue()].label}
          </StatusBadge>
        ),
      },
      ...(can("transfer.complete")
        ? [
            {
              id: "actions",
              header: "",
              meta: { className: "w-32" },
              cell: ({ row }) =>
                row.original.status === "APPROVED" && (
                  <CellActions>
                    <Button size="sm" variant="outline" onClick={() => setPaying(row.original)}>
                      <Banknote /> Receive fee
                    </Button>
                  </CellActions>
                ),
            },
          ]
        : []),
    ],
    [can],
  );

  return (
    <>
      <PageHeader
        title="Ownership transfers"
        description="Bookings moved from one customer to another. Start a transfer from the booking."
      />
      <RequirePermission permission="transfer.view">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs
              value={tab}
              onValueChange={(v) => {
                setTab(v);
                setPage(1);
              }}
            >
              <TabsList>
                {Object.entries(TABS).map(([value, label]) => (
                  <TabsTrigger key={value} value={value}>
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="relative w-full sm:w-72">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                placeholder="Number, booking or customer"
                className="pl-8"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
          {error ? (
            <p className="text-destructive text-sm">{error.message}</p>
          ) : (
            <DataTable
              columns={columns}
              data={data?.data}
              meta={data?.meta}
              isLoading={isLoading}
              isFetching={isFetching}
              onPageChange={setPage}
              onRowClick={(c) => router.push(`/bookings/${c.booking.id}`)}
              emptyMessage="No transfers."
            />
          )}
        </div>
      </RequirePermission>
      {paying && <CompleteTransferDialog transfer={paying} onDone={() => setPaying(null)} />}
    </>
  );
}
