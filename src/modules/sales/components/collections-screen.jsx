"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataTable from "@/components/common/data-table";
import PageHeader from "@/components/common/page-header";
import RequirePermission from "@/components/common/require-permission";
import StatusBadge from "@/components/common/status-badge";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatBDT, formatDateOnly } from "@/lib/format";
import { useCan } from "@/modules/auth/auth-provider";
import { collections } from "../api";
import { PAYMENT_METHODS, PAYMENT_STATUS } from "../constants";
import PaymentDialog from "./payment-dialog";

const columns = [
  {
    accessorKey: "paymentNo",
    header: "Payment",
    cell: ({ row }) => (
      <div className="leading-tight">
        <p className="font-medium">{row.original.receiptNo ?? row.original.paymentNo}</p>
        <p className="text-muted-foreground text-xs">
          {formatDateOnly(row.original.paidOn)}
          {row.original.receiptNo && ` · ${row.original.paymentNo}`}
        </p>
      </div>
    ),
  },
  {
    id: "customer",
    header: "From",
    cell: ({ row }) => (
      <div className="leading-tight">
        <p>{row.original.customer.fullName}</p>
        <p className="text-muted-foreground text-xs">
          {row.original.booking.bookingNo} · {row.original.booking.plot.code}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "method",
    header: "By",
    meta: { className: "hidden md:table-cell" },
    cell: ({ row }) => (
      <div className="leading-tight">
        <p>{PAYMENT_METHODS[row.original.method]}</p>
        {row.original.reference && (
          <p className="text-muted-foreground text-xs">{row.original.reference}</p>
        )}
      </div>
    ),
  },
  {
    accessorKey: "amount",
    header: "Amount",
    meta: { className: "text-right whitespace-nowrap" },
    cell: ({ getValue }) => <span className="tabular-nums">{formatBDT(getValue())}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    meta: { className: "hidden sm:table-cell" },
    cell: ({ getValue }) => (
      <StatusBadge tone={PAYMENT_STATUS[getValue()].tone}>
        {PAYMENT_STATUS[getValue()].label}
      </StatusBadge>
    ),
  },
];

const TABS = { PENDING: "To verify", VERIFIED: "Verified", all: "All" };

export default function CollectionsScreen() {
  const router = useRouter();
  const can = useCan();
  const [tab, setTab] = useState(can("collection.verify") ? "PENDING" : "all");
  const [search, setSearch] = useState("");
  const [method, setMethod] = useState("all");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const debouncedSearch = useDebouncedValue(search);
  const { data, isLoading, isFetching, error } = collections.useList({
    status: tab,
    method,
    search: debouncedSearch,
    page,
    limit: 25,
    sortBy: "paidOn",
    sortOrder: "desc",
  });
  const { data: pending } = collections.useList({ status: "PENDING", limit: 1 });
  const reset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Collections"
        description="Money received from customers. Accounts verify each entry, which issues the money receipt."
        actions={
          can("collection.create") && (
            <Button onClick={() => setAdding(true)}>
              <Plus /> Record payment
            </Button>
          )
        }
      />
      <RequirePermission permission="collection.view">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs value={tab} onValueChange={reset(setTab)}>
              <TabsList>
                {Object.entries(TABS).map(([value, label]) => (
                  <TabsTrigger key={value} value={value}>
                    {label}
                    {value === "PENDING" && pending?.meta.total ? ` (${pending.meta.total})` : ""}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            {data && (
              <p className="text-muted-foreground text-sm">
                Total{" "}
                <span className="text-foreground font-medium tabular-nums">
                  {formatBDT(data.meta.totalAmount)}
                </span>
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative sm:w-72">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                placeholder="Receipt, booking, customer, reference"
                className="pl-8"
                value={search}
                onChange={(e) => reset(setSearch)(e.target.value)}
              />
            </div>
            <Select value={method} onValueChange={reset(setMethod)}>
              <SelectTrigger className="sm:w-44" aria-label="Paid by">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any method</SelectItem>
                {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              onRowClick={(payment) => router.push(`/collections/${payment.id}`)}
              emptyMessage={
                tab === "PENDING" ? "Nothing waiting for verification." : "No payments yet."
              }
            />
          )}
        </div>
      </RequirePermission>
      <PaymentDialog
        open={adding}
        onOpenChange={setAdding}
        onSaved={(p) => router.push(`/collections/${p.id}`)}
      />
    </>
  );
}
