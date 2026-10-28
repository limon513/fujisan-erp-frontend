"use client";

import Link from "next/link";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBDT, formatDateOnly } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCompany } from "@/modules/setting/api";

const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Preset → { from, to }; the fiscal year preset leaves `from` to the API (company setting). */
export function rangeOf(preset, now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (preset) {
    case "this-month":
      return { from: ymd(new Date(y, m, 1)), to: ymd(now) };
    case "last-month":
      return { from: ymd(new Date(y, m - 1, 1)), to: ymd(new Date(y, m, 0)) };
    case "this-year":
      return { from: ymd(new Date(y, 0, 1)), to: ymd(now) };
    default:
      return { from: "", to: "" };
  }
}

const PRESETS = {
  "fiscal-year": "Fiscal year to date",
  "this-month": "This month",
  "last-month": "Last month",
  "this-year": "Calendar year to date",
  custom: "Custom dates",
};

/** Period row: preset and from/to; `shown` is the period the API used. */
export function PeriodPicker({ value, onChange, shown }) {
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Select
        value={value.preset}
        onValueChange={(preset) =>
          onChange(
            preset === "custom"
              ? { ...value, preset, from: shown?.from ?? "", to: shown?.to ?? "" }
              : { preset, ...rangeOf(preset) },
          )
        }
      >
        <SelectTrigger className="w-48" aria-label="Period">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(PRESETS).map(([key, label]) => (
            <SelectItem key={key} value={key}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value.preset === "custom" && (
        <>
          <Input
            type="date"
            aria-label="From"
            className="w-40"
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
          />
          <span className="text-muted-foreground text-sm">to</span>
          <Input
            type="date"
            aria-label="To"
            className="w-40"
            value={value.to}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
          />
        </>
      )}
    </div>
  );
}

export function PrintButton() {
  return (
    <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
      <Printer /> Print
    </Button>
  );
}

/** Company name and the statement's period, shown on paper only. */
export function PrintHeading({ title, period }) {
  const { data: company } = useCompany();
  return (
    <div className="hidden border-b pb-3 print:block">
      <p className="text-lg font-semibold">{company?.legalName ?? company?.name}</p>
      <p>
        {title} · {period}
      </p>
    </div>
  );
}

export const periodText = (data) =>
  data ? `${formatDateOnly(data.from)} – ${formatDateOnly(data.to)}` : "";

/** Indented account rows of a statement: groups in bold with their sums, accounts linked. */
export function StatementRows({ rows, negate = false }) {
  return rows.map((r) => (
    <div
      key={r.id}
      className={cn(
        "flex items-baseline justify-between gap-4 py-1.5 text-sm",
        r.isGroup && r.depth === 0 && "border-t pt-2 font-semibold",
        r.isGroup && r.depth > 0 && "font-medium",
      )}
      style={{ paddingLeft: `${r.depth * 1.25}rem` }}
    >
      <span className="min-w-0">
        {r.code && <span className="text-muted-foreground mr-2 font-mono text-xs">{r.code}</span>}
        {r.isGroup || !r.code ? (
          r.name
        ) : (
          <Link href={`/accounts/${r.id}`} className="hover:underline">
            {r.name}
          </Link>
        )}
      </span>
      <span className="shrink-0 tabular-nums">
        {formatBDT(negate ? -Number(r.amount) : r.amount)}
      </span>
    </div>
  ));
}

/** A bold total line; `double` underlines it like the bottom line of a statement. */
export function TotalLine({ label, amount, double, tone }) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4 border-t py-2 text-sm font-semibold",
        double && "border-b-4 border-double",
      )}
    >
      <span>{label}</span>
      <span
        className={cn("tabular-nums", tone === "auto" && Number(amount) < 0 && "text-destructive")}
      >
        {formatBDT(amount)}
      </span>
    </div>
  );
}
