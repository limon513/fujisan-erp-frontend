"use client";

import { useState } from "react";
import { Plus, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import BarList from "@/components/charts/bar-list";
import CellActions from "@/components/common/cell-actions";
import DataTable from "@/components/common/data-table";
import FormDialog from "@/components/common/form-dialog";
import StatusBadge from "@/components/common/status-badge";
import { formatBDT, formatBDTShort, formatDateOnly, formatNumber, toDateInput } from "@/lib/format";
import { useCan } from "@/modules/auth/auth-provider";
import { projectCosts, useAccounts, useProjectCostSummary } from "../api";
import { bankLabel } from "../constants";

export const COST_CATEGORIES = {
  LAND_PURCHASE: "Land purchase",
  LAND_REGISTRATION: "Land registration and mutation",
  DEVELOPMENT: "Development (earth filling, roads, drainage …)",
  OTHER: "Other project cost",
};

/** Short names for lists and the chart. */
const SHORT = {
  LAND_PURCHASE: "Land purchase",
  LAND_REGISTRATION: "Registration and mutation",
  DEVELOPMENT: "Development",
  OTHER: "Other",
};

const INVENTORY_KEYS = ["LAND_COST", "DEVELOPMENT_COST"];

function Stat({ label, value, sub }) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="space-y-1 px-4">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-xl font-semibold tabular-nums">{value}</p>
        {sub && <p className="text-muted-foreground text-xs">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function CostDialog({ projectId, onDone }) {
  const create = projectCosts.useCreate();
  const { data: postable = [] } = useAccounts({ postable: true });
  const payFrom = postable.filter(
    (a) => ["ASSET", "LIABILITY"].includes(a.type) && !INVENTORY_KEYS.includes(a.systemKey),
  );
  const [form, setForm] = useState(() => ({
    category: "LAND_PURCHASE",
    date: toDateInput(new Date().toISOString()),
    description: "",
    amount: "",
    paidFromAccountId: "",
    reference: "",
  }));
  const [error, setError] = useState(null);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const fallback = postable.find((a) => a.systemKey === "BANK")?.id ?? "";
  const paidFrom = form.paidFromAccountId || fallback;
  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onDone()}
      title="Record a project cost"
      description="Posted to land inventory; each plot takes its share by area when it is registered."
      error={error}
      submitting={create.isPending}
      submitLabel="Record and post"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          await create.mutateAsync({
            projectId,
            ...form,
            amount: Number(form.amount),
            paidFromAccountId: paidFrom,
          });
          toast.success("Cost recorded and posted");
          onDone();
        } catch (apiError) {
          setError(apiError.message);
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <div className="space-y-1.5">
          <Label htmlFor="category">Kind of cost</Label>
          <Select value={form.category} onValueChange={(category) => set({ category })}>
            <SelectTrigger id="category" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(COST_CATEGORIES).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={form.date}
            onChange={(e) => set({ date: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">What for</Label>
        <Input
          id="description"
          placeholder="Mouza Purbachal, dag 112–118, 2.5 bigha"
          value={form.description}
          onChange={(e) => set({ description: e.target.value })}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="amount">Amount (৳)</Label>
          <Input
            id="amount"
            inputMode="decimal"
            className="text-right"
            value={form.amount}
            onChange={(e) => set({ amount: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reference">Reference</Label>
          <Input
            id="reference"
            placeholder="Deed, invoice or cheque no."
            value={form.reference}
            onChange={(e) => set({ reference: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="paidFrom">Paid from</Label>
        <Select value={paidFrom} onValueChange={(v) => set({ paidFromAccountId: v })}>
          <SelectTrigger id="paidFrom" className="w-full">
            <SelectValue placeholder="Loading…" />
          </SelectTrigger>
          <SelectContent>
            {payFrom.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.code} {a.name}
                {bankLabel(a) && ` · ${bankLabel(a)}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          Cash or bank if paid; a payable (e.g. 2120 Accounts payable, 2130 Contractor payable) if
          still owed.
        </p>
      </div>
    </FormDialog>
  );
}

function ReverseDialog({ cost, onDone }) {
  const reverse = projectCosts.usePostAction("reverse");
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);
  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onDone()}
      title={`Reverse ${formatBDT(cost.amount)}?`}
      description={`${cost.description}. A mirror entry is posted; the record stays.`}
      error={error}
      submitting={reverse.isPending}
      submitLabel="Reverse"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          await reverse.mutateAsync({ id: cost.id, reason });
          toast.success("Cost reversed");
          onDone();
        } catch (apiError) {
          setError(apiError.message);
        }
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="reason">Why?</Label>
        <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
    </FormDialog>
  );
}

/** Project → Costs: land and development costs, and the gross profit on plots sold. */
export default function ProjectCostsTab({ project }) {
  const can = useCan();
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [reversing, setReversing] = useState(null);
  const { data: summary, isLoading } = useProjectCostSummary(project.id);
  const list = projectCosts.useList({ projectId: project.id, page, limit: 25 });

  const columns = [
    {
      accessorKey: "date",
      header: "Date",
      meta: { className: "w-28 whitespace-nowrap" },
      cell: ({ getValue }) => formatDateOnly(getValue()),
    },
    {
      accessorKey: "description",
      header: "Cost",
      cell: ({ row }) => (
        <div className="leading-tight">
          <p className={row.original.status === "REVERSED" ? "line-through" : undefined}>
            {row.original.description}
          </p>
          <p className="text-muted-foreground text-xs">
            {SHORT[row.original.category]}
            {row.original.reference && ` · ${row.original.reference}`}
            {row.original.reverseReason && ` · reversed: ${row.original.reverseReason}`}
          </p>
        </div>
      ),
    },
    {
      id: "paidFrom",
      header: "Paid from",
      meta: { className: "hidden md:table-cell" },
      cell: ({ row }) =>
        `${row.original.paidFromAccount.code} ${row.original.paidFromAccount.name}`,
    },
    {
      accessorKey: "amount",
      header: "Amount",
      meta: { className: "text-right whitespace-nowrap" },
      cell: ({ row }) =>
        row.original.status === "REVERSED" ? (
          <StatusBadge>reversed</StatusBadge>
        ) : (
          <span className="tabular-nums">{formatBDT(row.original.amount)}</span>
        ),
    },
    ...(can("project-cost.reverse")
      ? [
          {
            id: "actions",
            header: "",
            meta: { className: "w-12" },
            cell: ({ row }) =>
              row.original.status === "POSTED" && (
                <CellActions>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={`Reverse ${row.original.description}`}
                    title="Reverse"
                    onClick={() => setReversing(row.original)}
                  >
                    <Undo2 />
                  </Button>
                </CellActions>
              ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      {isLoading || !summary ? (
        <Skeleton className="h-28" />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <Stat
            label="Land and development cost"
            value={formatBDTShort(summary.totalCost)}
            sub={`${formatNumber(summary.area.total)} sqft in ${summary.area.plots} plots`}
          />
          <Stat
            label="Moved to cost of sales"
            value={formatBDTShort(summary.costOfSales)}
            sub={`${summary.registered.plots} plot${summary.registered.plots === 1 ? "" : "s"} registered`}
          />
          <Stat
            label="Still in land inventory"
            value={formatBDTShort(summary.inventoryLeft)}
            sub={`${formatNumber(summary.area.unsold)} sqft unsold`}
          />
          <Stat
            label="Cost per unsold sqft"
            value={summary.costPerSqftUnsold == null ? "—" : formatBDT(summary.costPerSqftUnsold)}
            sub="What the next plot sold takes per sqft"
          />
          <Stat
            label="Gross profit, plots sold"
            value={formatBDTShort(summary.registered.grossProfit)}
            sub={
              summary.registered.margin == null
                ? "No plot registered yet"
                : `${formatNumber(summary.registered.margin)}% of ${formatBDTShort(summary.registered.revenue)} sales`
            }
          />
        </div>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
            <div className="space-y-1.5">
              <CardTitle>Costs</CardTitle>
              <CardDescription>
                Each plot registered takes the cost still in inventory × its share of the area still
                unsold, so a cost added later is carried by the plots not yet sold.
              </CardDescription>
            </div>
            {can("project-cost.create") && (
              <Button size="sm" onClick={() => setAdding(true)}>
                <Plus /> Record cost
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={list.data?.data}
              meta={list.data?.meta}
              isLoading={list.isLoading}
              isFetching={list.isFetching}
              onPageChange={setPage}
              emptyMessage="No costs recorded for this project yet."
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>By kind</CardTitle>
          </CardHeader>
          <CardContent>
            {summary && (
              <BarList
                rows={summary.byCategory
                  .filter((c) => Number(c.amount) > 0)
                  .map((c) => ({ ...c, name: SHORT[c.key] }))}
                format={formatBDTShort}
                countLabel="entries"
                empty="No costs yet."
              />
            )}
          </CardContent>
        </Card>
      </div>
      {adding && <CostDialog projectId={project.id} onDone={() => setAdding(false)} />}
      {reversing && <ReverseDialog cost={reversing} onDone={() => setReversing(null)} />}
    </div>
  );
}
