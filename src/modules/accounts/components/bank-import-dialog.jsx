"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FormDialog from "@/components/common/form-dialog";
import { parseAmount, parseCsv, parseDate } from "@/lib/csv";
import { formatBDT, formatDateOnly } from "@/lib/format";
import { useReconAction } from "../api";

const NONE = "__none__";
const DATE_FORMATS = {
  DMY: "31/10/2026 (day first)",
  YMD: "2026-10-31",
  MDY: "10/31/2026 (month first)",
  DMONY: "31-Oct-2026",
};

/** Best guess of a column from its header. */
const guess = (headers, ...patterns) => {
  const i = headers.findIndex((h) => patterns.some((p) => p.test(h)));
  return i >= 0 ? String(i) : NONE;
};

function ColumnSelect({ id, label, headers, value, onChange, optional }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {optional && <SelectItem value={NONE}>None</SelectItem>}
          {headers.map((h, i) => (
            <SelectItem key={i} value={String(i)}>
              {h || `Column ${i + 1}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Import a bank statement CSV: map the bank's columns (one signed amount, or separate withdrawal
 * and deposit columns), check the preview, give the closing balance.
 */
export default function BankImportDialog({ account, onDone }) {
  const action = useReconAction();
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [map, setMap] = useState({});
  const [closing, setClosing] = useState("");
  const [error, setError] = useState(null);
  const headers = rows[0] ?? [];
  const body = rows.slice(1);

  const onFile = async (picked) => {
    setError(null);
    setFile(picked);
    if (!picked) return setRows([]);
    const parsed = parseCsv(await picked.text());
    if (parsed.length < 2) {
      setError("This file has no lines. Export the statement as CSV from your bank.");
      return setRows([]);
    }
    const h = parsed[0].map((x) => x.toLowerCase());
    const next = {
      date: guess(h, /date/),
      description: guess(h, /desc|narration|particular|details|remarks/),
      reference: guess(h, /ref|cheque|chq|instrument/),
      amount: guess(h, /^amount$/),
      withdrawal: guess(h, /withdraw|debit|^dr/),
      deposit: guess(h, /deposit|credit|^cr/),
      balance: guess(h, /balance/),
      dateFormat: /\d{4}-\d{2}-\d{2}/.test(parsed[1][Number(guess(h, /date/))] ?? "")
        ? "YMD"
        : /[a-z]{3}/i.test(parsed[1][Number(guess(h, /date/))] ?? "")
          ? "DMONY"
          : "DMY",
    };
    next.mode = next.amount !== NONE ? "single" : "split";
    setMap(next);
    setRows(parsed);
    // The last balance shown is usually the closing balance
    const b = Number(next.balance);
    if (next.balance !== NONE) {
      const last = parsed.slice(1).findLast((r) => Number.isFinite(parseAmount(r[b])));
      if (last) setClosing(String(Math.abs(parseAmount(last[b]))));
    }
  };

  const { lines, problems } = useMemo(() => {
    if (!body.length || map.date === undefined) return { lines: [], problems: [] };
    const out = [];
    const bad = [];
    const at = (row, key) => (map[key] === NONE ? "" : row[Number(map[key])]);
    body.forEach((row, index) => {
      const date = parseDate(at(row, "date"), map.dateFormat);
      let amount;
      if (map.mode === "single") amount = parseAmount(at(row, "amount"));
      else {
        const out_ = parseAmount(at(row, "withdrawal"));
        const in_ = parseAmount(at(row, "deposit"));
        amount = (Number.isFinite(in_) ? in_ : 0) - (Number.isFinite(out_) ? Math.abs(out_) : 0);
      }
      const description = at(row, "description") || at(row, "reference") || "Statement line";
      // Opening/closing balance rows carry no money movement
      if (!amount && !date) return;
      if (!date || !Number.isFinite(amount) || amount === 0) {
        bad.push(index + 2);
        return;
      }
      out.push({ date, description, reference: at(row, "reference") || undefined, amount });
    });
    return { lines: out, problems: bad };
  }, [body, map]);

  const set = (key) => (value) => setMap((m) => ({ ...m, [key]: value }));
  const total = lines.reduce((sum, l) => sum + l.amount, 0);

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onDone()}
      title={`Import a statement · ${account.code} ${account.name}`}
      description="Export the statement from internet banking as CSV. Lines already imported are skipped."
      error={error}
      submitting={action.isPending}
      submitLabel={lines.length ? `Import ${lines.length} lines` : "Import"}
      className="sm:max-w-2xl"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!lines.length) return setError("Choose the file and map its columns");
        if (closing === "" || !Number.isFinite(Number(closing)))
          return setError("Enter the closing balance shown on the statement");
        try {
          const result = await action.mutateAsync({
            path: "/statements",
            body: {
              accountId: account.id,
              fileName: file?.name,
              closingBalance: Number(closing),
              lines,
            },
          });
          toast.success(
            `${result.imported} lines imported, ${result.autoMatched} matched automatically${result.duplicates ? ` (${result.duplicates} already there)` : ""}`,
          );
          onDone(result);
        } catch (apiError) {
          setError(apiError.message);
        }
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="statementFile">Statement file (CSV)</Label>
        <Input
          id="statementFile"
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
      </div>
      {headers.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <ColumnSelect
              id="date"
              label="Date"
              headers={headers}
              value={map.date}
              onChange={set("date")}
            />
            <div className="space-y-1.5">
              <Label htmlFor="dateFormat">Date format</Label>
              <Select value={map.dateFormat} onValueChange={set("dateFormat")}>
                <SelectTrigger id="dateFormat" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DATE_FORMATS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mode">Amounts</Label>
              <Select value={map.mode} onValueChange={set("mode")}>
                <SelectTrigger id="mode" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="split">Withdrawal and deposit columns</SelectItem>
                  <SelectItem value="single">One column (− = withdrawal)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <ColumnSelect
              id="description"
              label="Description"
              headers={headers}
              value={map.description}
              onChange={set("description")}
              optional
            />
            <ColumnSelect
              id="reference"
              label="Reference / cheque no."
              headers={headers}
              value={map.reference}
              onChange={set("reference")}
              optional
            />
            {map.mode === "single" ? (
              <ColumnSelect
                id="amount"
                label="Amount"
                headers={headers}
                value={map.amount}
                onChange={set("amount")}
              />
            ) : (
              <>
                <ColumnSelect
                  id="withdrawal"
                  label="Withdrawal (debit)"
                  headers={headers}
                  value={map.withdrawal}
                  onChange={set("withdrawal")}
                  optional
                />
                <ColumnSelect
                  id="deposit"
                  label="Deposit (credit)"
                  headers={headers}
                  value={map.deposit}
                  onChange={set("deposit")}
                  optional
                />
              </>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="closing">Closing balance on the statement (৳)</Label>
            <Input
              id="closing"
              inputMode="decimal"
              className="text-right sm:w-56"
              value={closing}
              onChange={(e) => setClosing(e.target.value)}
            />
          </div>
          <div className="rounded-lg border text-sm">
            <div className="text-muted-foreground flex justify-between border-b px-3 py-2 text-xs">
              <span>
                {lines.length} lines
                {lines.length > 0 &&
                  ` · ${formatDateOnly(lines[0].date)} – ${formatDateOnly(lines.at(-1).date)}`}
              </span>
              <span className="tabular-nums">net {formatBDT(total)}</span>
            </div>
            {lines.slice(0, 5).map((l, i) => (
              <div key={i} className="flex justify-between gap-3 px-3 py-1.5">
                <span className="text-muted-foreground w-24 shrink-0">
                  {formatDateOnly(l.date)}
                </span>
                <span className="min-w-0 flex-1 truncate">{l.description}</span>
                <span className="shrink-0 tabular-nums">{formatBDT(l.amount)}</span>
              </div>
            ))}
            {problems.length > 0 && (
              <p className="text-destructive border-t px-3 py-2 text-xs">
                Rows {problems.slice(0, 8).join(", ")}
                {problems.length > 8 && "…"} couldn&apos;t be read; check the date format and amount
                columns.
              </p>
            )}
          </div>
        </>
      )}
    </FormDialog>
  );
}
