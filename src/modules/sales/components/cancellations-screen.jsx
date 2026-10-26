"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Search } from "lucide-react";
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
import { cancellations } from "../api";
import { CANCELLATION_STATUS } from "../constants";
import { RefundDialog } from "./cancellation-parts";

const TABS = {
  PENDING_APPROVAL: "Waiting for approval",
  APPROVED: "Refund due",
  REFUNDED: "Refunded",
  all: "All",
};

export default function CancellationsScreen() {
  const router = useRouter();
  const can = useCan();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [paying, setPaying] = useState(null);
  const debouncedSearch = useDebouncedValue(search);
  const { data, isLoading, isFetching, error } = cancellations.useList({
    status: tab,
    search: debouncedSearch,
    page,
    limit: 25,
  });

  const columns = useMemo(
    () => [
      {
        accessorKey: "cancellationNo",
        header: "Cancellation",
        cell: ({ row }) => (
          <div className="leading-tight">
            <p className="font-medium">{row.original.cancellationNo}</p>
            <p className="text-muted-foreground text-xs">
              {formatDateOnly(row.original.requestedOn)}
            </p>
          </div>
        ),
      },
      {
        id: "customer",
        header: "Customer",
        cell: ({ row }) => (
          <div className="leading-tight">
            <p>{row.original.booking.customer.fullName}</p>
            <p className="text-muted-foreground text-xs">
              {row.original.booking.bookingNo} · {row.original.booking.plot.code}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "totalPaid",
        header: "Paid",
        meta: { className: "hidden md:table-cell text-right whitespace-nowrap" },
        cell: ({ getValue }) => <span className="tabular-nums">{formatBDT(getValue())}</span>,
      },
      {
        accessorKey: "refundAmount",
        header: "Refund",
        meta: { className: "text-right whitespace-nowrap" },
        cell: ({ row }) => (
          <div className="leading-tight tabular-nums">
            <p className="font-medium">{formatBDT(row.original.refundAmount)}</p>
            {row.original.status === "APPROVED" && Number(row.original.refundPaid) > 0 ? (
              <p className="text-muted-foreground text-xs">
                {formatBDT(row.original.refundDue)} still to pay
              </p>
            ) : row.original.nextRefund ? (
              <p className="text-muted-foreground text-xs">
                next {formatDateOnly(row.original.nextRefund.dueDate)}
              </p>
            ) : (
              Number(row.original.chargeAmount) > 0 && (
                <p className="text-muted-foreground text-xs">
                  −{formatBDT(row.original.chargeAmount)} charge
                </p>
              )
            )}
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        meta: { className: "hidden sm:table-cell" },
        cell: ({ getValue }) => (
          <StatusBadge tone={CANCELLATION_STATUS[getValue()].tone}>
            {CANCELLATION_STATUS[getValue()].label}
          </StatusBadge>
        ),
      },
      ...(can("cancellation.refund")
        ? [
            {
              id: "actions",
              header: "",
              meta: { className: "w-32" },
              cell: ({ row }) =>
                row.original.status === "APPROVED" && (
                  <CellActions>
                    <Button size="sm" variant="outline" onClick={() => setPaying(row.original)}>
                      <Banknote /> Pay refund
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
        title="Cancellations"
        description="Cancelled bookings and their refunds. Start a cancellation from the booking."
      />
      <RequirePermission permission="cancellation.view">
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
              emptyMessage="No cancellations."
            />
          )}
        </div>
      </RequirePermission>
      {paying && <RefundDialog cancellation={paying} onDone={() => setPaying(null)} />}
    </>
  );
}
