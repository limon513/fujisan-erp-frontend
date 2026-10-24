"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Ellipsis, Search, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CellActions from "@/components/common/cell-actions";
import DataTable from "@/components/common/data-table";
import FormDialog from "@/components/common/form-dialog";
import PageHeader from "@/components/common/page-header";
import RequirePermission from "@/components/common/require-permission";
import StatusBadge from "@/components/common/status-badge";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  formatBDT,
  formatBDTShort,
  formatDateOnly,
  formatMobile,
  formatNumber,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCan } from "@/modules/auth/auth-provider";
import { installments, useEmiSummary } from "../api";
import { INSTALLMENT_STATUS, installmentLabel } from "../constants";
import PaymentDialog from "./payment-dialog";

const plural = (n, word) => `${formatNumber(n)} ${word}${n === 1 ? "" : "s"}`;

const TABS = { overdue: "Overdue", month: "Due this month", upcoming: "Later", paid: "Paid" };

function Figure({ label, value, sub, tone }) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="space-y-1 px-4">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className={cn("text-2xl font-semibold tabular-nums", tone)}>{value}</p>
        {sub && <p className="text-muted-foreground text-xs">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function WaiveDialog({ installment, onDone }) {
  const waive = installments.usePostAction("waive-late-fee");
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);
  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onDone()}
      title={`Waive the ${formatBDT(installment.lateFee)} late fee?`}
      description={`${installmentLabel(installment)} of ${installment.booking.bookingNo} · ${installment.booking.customer.fullName}`}
      error={error}
      submitting={waive.isPending}
      submitLabel="Waive"
      onSubmit={async (event) => {
        event.preventDefault();
        if (reason.trim().length < 3) {
          setError("Give a reason");
          return;
        }
        try {
          await waive.mutateAsync({ id: installment.id, reason });
          toast.success("Late fee waived");
          onDone();
        } catch (apiError) {
          setError(apiError.message);
        }
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="reason">Why?</Label>
        <Input
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Bank holiday, management decision, …"
        />
      </div>
    </FormDialog>
  );
}

export default function EmiScreen() {
  const router = useRouter();
  const can = useCan();
  const [tab, setTab] = useState("overdue");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [paying, setPaying] = useState(null);
  const [waiving, setWaiving] = useState(null);
  const debouncedSearch = useDebouncedValue(search);
  const { data: summary } = useEmiSummary();
  const { data, isLoading, isFetching, error } = installments.useList({
    when: tab,
    search: debouncedSearch,
    page,
    limit: 25,
  });

  const columns = useMemo(
    () => [
      {
        accessorKey: "dueDate",
        header: "Due",
        meta: { className: "whitespace-nowrap" },
        cell: ({ row }) => (
          <div className="leading-tight">
            <p className={cn(tab === "overdue" && "text-destructive font-medium")}>
              {formatDateOnly(row.original.dueDate)}
            </p>
            <p className="text-muted-foreground text-xs">{installmentLabel(row.original)}</p>
          </div>
        ),
      },
      {
        id: "customer",
        header: "Customer",
        cell: ({ row }) => (
          <div className="leading-tight">
            <p className="font-medium">{row.original.booking.customer.fullName}</p>
            <p className="text-muted-foreground text-xs">
              {row.original.booking.bookingNo} · {row.original.booking.plot.code} ·{" "}
              {formatMobile(row.original.booking.customer.mobile)}
            </p>
          </div>
        ),
      },
      {
        id: "owner",
        header: "Sales",
        meta: { className: "hidden xl:table-cell" },
        cell: ({ row }) => row.original.booking.owner?.fullName ?? "—",
      },
      {
        accessorKey: "amount",
        header: "Amount",
        meta: { className: "hidden md:table-cell text-right whitespace-nowrap" },
        cell: ({ row }) => (
          <div className="leading-tight tabular-nums">
            <p>{formatBDT(row.original.amount)}</p>
            {Number(row.original.lateFee) > 0 && (
              <p className="text-destructive text-xs">
                +{formatBDT(row.original.lateFee)} late fee
              </p>
            )}
          </div>
        ),
      },
      {
        accessorKey: "outstanding",
        header: tab === "paid" ? "Paid" : "Owed",
        meta: { className: "text-right whitespace-nowrap" },
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">
            {formatBDT(tab === "paid" ? row.original.paidAmount : row.original.outstanding)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        meta: { className: "hidden sm:table-cell" },
        cell: ({ getValue }) => (
          <StatusBadge tone={INSTALLMENT_STATUS[getValue()].tone}>
            {INSTALLMENT_STATUS[getValue()].label}
          </StatusBadge>
        ),
      },
      ...(tab !== "paid" && (can("collection.create") || can("emi.waive"))
        ? [
            {
              id: "actions",
              header: "",
              meta: { className: "w-36" },
              cell: ({ row }) => (
                <CellActions>
                  {can("collection.create") && (
                    <Button size="sm" variant="outline" onClick={() => setPaying(row.original)}>
                      <Wallet /> Payment
                    </Button>
                  )}
                  {can("emi.waive") && Number(row.original.lateFee) > 0 && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon-sm" variant="ghost" aria-label="More">
                          <Ellipsis />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => setWaiving(row.original)}>
                          Waive late fee
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </CellActions>
              ),
            },
          ]
        : []),
    ],
    [tab, can],
  );

  return (
    <>
      <PageHeader
        title="EMI"
        description="Installments of all confirmed bookings. A late fee is added once an installment passes its grace period."
      />
      <RequirePermission permission="emi.view">
        <div className="space-y-4">
          {summary && (
            <div className="grid gap-3 sm:grid-cols-3">
              <Figure
                label="Overdue"
                value={formatBDTShort(summary.overdue.amount)}
                sub={`${plural(summary.overdue.count, "installment")} · ${plural(summary.overdue.bookings, "booking")}`}
                tone={Number(summary.overdue.amount) > 0 ? "text-destructive" : undefined}
              />
              <Figure
                label="Due this month"
                value={formatBDTShort(summary.dueThisMonth.amount)}
                sub={plural(summary.dueThisMonth.count, "installment")}
              />
              <Figure
                label="Collected this month"
                value={formatBDTShort(summary.collectedThisMonth.amount)}
                sub={plural(summary.collectedThisMonth.count, "verified payment")}
              />
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs
              value={tab}
              onValueChange={(value) => {
                setTab(value);
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
                placeholder="Customer, booking or plot"
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
              onRowClick={(i) => router.push(`/bookings/${i.booking.id}`)}
              emptyMessage={tab === "overdue" ? "Nothing overdue." : "No installments here."}
            />
          )}
        </div>
      </RequirePermission>
      <PaymentDialog
        open={Boolean(paying)}
        onOpenChange={(open) => !open && setPaying(null)}
        booking={paying?.booking}
        amount={paying?.outstanding}
      />
      {waiving && <WaiveDialog installment={waiving} onDone={() => setWaiving(null)} />}
    </>
  );
}
