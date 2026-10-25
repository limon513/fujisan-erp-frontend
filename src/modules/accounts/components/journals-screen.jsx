"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import DataTable from "@/components/common/data-table";
import PageHeader from "@/components/common/page-header";
import RequirePermission from "@/components/common/require-permission";
import StatusBadge from "@/components/common/status-badge";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatBDT, formatDateOnly, toDateInput } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCan } from "@/modules/auth/auth-provider";
import { journals, useAccounts } from "../api";
import { JOURNAL_KINDS } from "../constants";

const columns = [
  {
    accessorKey: "entryNo",
    header: "Entry",
    cell: ({ row }) => (
      <div className="leading-tight">
        <p className="font-medium">{row.original.entryNo}</p>
        <p className="text-muted-foreground text-xs">{formatDateOnly(row.original.date)}</p>
      </div>
    ),
  },
  {
    accessorKey: "narration",
    header: "Narration",
    cell: ({ row }) => (
      <div className="leading-tight">
        <p className="line-clamp-1">{row.original.narration}</p>
        <p className="text-muted-foreground line-clamp-1 text-xs">
          {row.original.lines.map((l) => `${l.account.code} ${l.account.name}`).join(" · ")}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "kind",
    header: "Kind",
    meta: { className: "hidden md:table-cell" },
    cell: ({ getValue }) => (
      <StatusBadge tone={JOURNAL_KINDS[getValue()].tone}>
        {JOURNAL_KINDS[getValue()].label}
      </StatusBadge>
    ),
  },
  {
    accessorKey: "total",
    header: "Amount",
    meta: { className: "text-right whitespace-nowrap" },
    cell: ({ getValue }) => <span className="tabular-nums">{formatBDT(getValue())}</span>,
  },
];

const EMPTY_LINE = { accountId: "", debit: "", credit: "", description: "" };
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

function JournalSheet({ open, onOpenChange, onSaved }) {
  const create = journals.useCreate();
  const { data: postable = [] } = useAccounts({ postable: true }, { enabled: open });
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(null);
  const form = useForm({
    values: {
      date: toDateInput(new Date().toISOString()),
      narration: "",
      lines: [EMPTY_LINE, EMPTY_LINE],
    },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "lines" });
  const lines = useWatch({ control: form.control, name: "lines" }) ?? [];
  const debit = lines.reduce((s, l) => s + num(l.debit), 0);
  const credit = lines.reduce((s, l) => s + num(l.credit), 0);
  const balanced = debit > 0 && Math.round(debit * 100) === Math.round(credit * 100);

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const body = {
      date: values.date,
      narration: values.narration,
      lines: values.lines
        .filter((l) => l.accountId && (num(l.debit) || num(l.credit)))
        .map((l) => ({
          accountId: l.accountId,
          debit: num(l.debit),
          credit: num(l.credit),
          description: l.description,
        })),
    };
    try {
      const entry = await create.mutateAsync(body);
      toast.success(`${entry.entryNo} posted`);
      setSaved(entry);
      onOpenChange(false);
    } catch (apiError) {
      setError(apiError.message);
    }
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-3xl"
        onCloseAutoFocus={(event) => {
          if (!saved) return;
          event.preventDefault();
          onSaved(saved);
          setSaved(null);
        }}
      >
        <form onSubmit={onSubmit} noValidate className="flex h-full flex-col">
          <SheetHeader className="border-b">
            <SheetTitle>New journal entry</SheetTitle>
          </SheetHeader>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
              <div className="space-y-1.5">
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" {...form.register("date")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="narration">Narration</Label>
                <Input
                  id="narration"
                  placeholder="October office rent paid by bank"
                  {...form.register("narration")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-muted-foreground hidden grid-cols-[minmax(0,1fr)_8rem_8rem_2rem] gap-2 px-1 text-xs sm:grid">
                <span>Account</span>
                <span className="text-right">Debit (৳)</span>
                <span className="text-right">Credit (৳)</span>
              </div>
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="grid grid-cols-2 gap-2 rounded-lg border p-2 sm:grid-cols-[minmax(0,1fr)_8rem_8rem_2rem] sm:border-0 sm:p-0"
                >
                  <div className="col-span-2 sm:col-span-1">
                    <Select
                      value={lines[index]?.accountId ?? ""}
                      onValueChange={(v) => form.setValue(`lines.${index}.accountId`, v)}
                    >
                      <SelectTrigger className="w-full" aria-label={`Line ${index + 1} account`}>
                        <SelectValue placeholder="Account…" />
                      </SelectTrigger>
                      <SelectContent>
                        {postable.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.code} {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    inputMode="decimal"
                    className="text-right"
                    aria-label={`Line ${index + 1} debit`}
                    placeholder="0"
                    {...form.register(`lines.${index}.debit`, {
                      onChange: (e) => e.target.value && form.setValue(`lines.${index}.credit`, ""),
                    })}
                  />
                  <Input
                    inputMode="decimal"
                    className="text-right"
                    aria-label={`Line ${index + 1} credit`}
                    placeholder="0"
                    {...form.register(`lines.${index}.credit`, {
                      onChange: (e) => e.target.value && form.setValue(`lines.${index}.debit`, ""),
                    })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove line ${index + 1}`}
                    disabled={fields.length <= 2}
                    onClick={() => remove(index)}
                    className="justify-self-end"
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => append(EMPTY_LINE)}>
                <Plus /> Add line
              </Button>
            </div>
            <div
              className={cn(
                "flex justify-end gap-6 rounded-lg border p-3 text-sm tabular-nums",
                balanced ? "border-emerald-500/40" : "border-amber-500/40",
              )}
            >
              <span>Debit {formatBDT(debit)}</span>
              <span>Credit {formatBDT(credit)}</span>
              <span
                className={
                  balanced
                    ? "text-emerald-700 dark:text-emerald-400"
                    : "text-amber-700 dark:text-amber-400"
                }
              >
                {balanced ? "Balanced" : `Difference ${formatBDT(Math.abs(debit - credit))}`}
              </span>
            </div>
          </div>
          <SheetFooter className="flex-row justify-end border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!balanced || form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Spinner />}
              Post entry
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default function JournalsScreen() {
  const router = useRouter();
  const can = useCan();
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const debouncedSearch = useDebouncedValue(search);
  const { data, isLoading, isFetching, error } = journals.useList({
    search: debouncedSearch,
    kind,
    page,
    limit: 25,
  });

  return (
    <>
      <PageHeader
        title="Journal"
        description="Every posting, newest first. Payments and registrations post automatically; nothing is edited, only reversed."
        actions={
          can("journal.create") && (
            <Button onClick={() => setAdding(true)}>
              <Plus /> New journal entry
            </Button>
          )
        }
      />
      <RequirePermission permission="journal.view">
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative sm:w-72">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                placeholder="Entry number or narration"
                className="pl-8"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Select
              value={kind}
              onValueChange={(v) => {
                setKind(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="sm:w-44" aria-label="Kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All entries</SelectItem>
                {Object.entries(JOURNAL_KINDS).map(([value, { label }]) => (
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
              onRowClick={(entry) => router.push(`/accounts/journals/${entry.id}`)}
              emptyMessage="No entries yet."
            />
          )}
        </div>
      </RequirePermission>
      <JournalSheet
        open={adding}
        onOpenChange={setAdding}
        onSaved={(entry) => router.push(`/accounts/journals/${entry.id}`)}
      />
    </>
  );
}
