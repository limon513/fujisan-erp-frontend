"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PageHeader from "@/components/common/page-header";
import RequirePermission from "@/components/common/require-permission";
import { formatBDT, formatDateOnly } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useStatement } from "../api";
import { bankLabel } from "../constants";
import { PeriodPicker, PrintButton, PrintHeading, periodText, rangeOf } from "./statement-parts";

const amount = (value) => (Number(value) ? formatBDT(value) : "");

export default function CashBookScreen() {
  const [period, setPeriod] = useState(() => ({
    preset: "this-month",
    ...rangeOf("this-month"),
  }));
  const [accountId, setAccountId] = useState("");
  const { data, isLoading, error } = useStatement("cash-book", {
    from: period.from,
    to: period.to,
    accountId,
  });
  const selected = data?.accounts.find((a) => a.id === accountId);

  return (
    <RequirePermission permission="account.view">
      <PageHeader
        title="Cash and bank book"
        description={data ? periodText(data) : "Receipts and payments of every money account."}
        actions={<PrintButton />}
      />
      <div className="space-y-4">
        <PeriodPicker value={period} onChange={setPeriod} shown={data} />
        {error ? (
          <p className="text-destructive text-sm">{error.message}</p>
        ) : isLoading ? (
          <Skeleton className="h-96" />
        ) : (
          <>
            <PrintHeading
              title={`Cash and bank book${selected ? ` · ${selected.code} ${selected.name}` : ""}`}
              period={periodText(data)}
            />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 print:hidden">
              {[{ id: "", name: "All money accounts" }, ...data.accounts].map((a) => {
                const all = !a.id;
                const closing = all
                  ? data.accounts.reduce((s, x) => s + Number(x.closing), 0)
                  : a.closing;
                return (
                  <button
                    key={a.id || "all"}
                    type="button"
                    onClick={() => setAccountId(a.id)}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-colors",
                      accountId === a.id ? "border-primary bg-muted/40" : "hover:bg-muted/30",
                    )}
                  >
                    <p className="text-muted-foreground truncate text-xs">
                      {a.code && `${a.code} `}
                      {a.name}
                      {bankLabel({ ...a, isGroup: false }) &&
                        ` · ${bankLabel({ ...a, isGroup: false })}`}
                    </p>
                    <p className="text-xl font-semibold tabular-nums">{formatBDT(closing)}</p>
                    {!all && (
                      <p className="text-muted-foreground text-xs tabular-nums">
                        +{formatBDT(a.receipts)} −{formatBDT(a.payments)}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
            <Card className="py-0">
              <CardContent className="px-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-28 pl-4">Date</TableHead>
                        <TableHead>Particulars</TableHead>
                        {!accountId && (
                          <TableHead className="hidden lg:table-cell">Account</TableHead>
                        )}
                        <TableHead className="text-right">Receipt</TableHead>
                        <TableHead className="text-right">Payment</TableHead>
                        <TableHead className="pr-4 text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="bg-muted/30">
                        <TableCell className="pl-4">{formatDateOnly(data.from)}</TableCell>
                        <TableCell className="font-medium">Opening balance</TableCell>
                        {!accountId && <TableCell className="hidden lg:table-cell" />}
                        <TableCell />
                        <TableCell />
                        <TableCell className="pr-4 text-right font-medium tabular-nums">
                          {formatBDT(data.opening)}
                        </TableCell>
                      </TableRow>
                      {data.lines.map((l) => (
                        <TableRow key={l.id}>
                          <TableCell className="pl-4 whitespace-nowrap">
                            {formatDateOnly(l.date)}
                          </TableCell>
                          <TableCell>
                            <p className="line-clamp-1">{l.contra.join(", ") || "—"}</p>
                            <p className="text-muted-foreground line-clamp-1 text-xs">
                              <Link
                                href={`/accounts/journals/${l.entryId}`}
                                className="hover:underline"
                              >
                                {l.entryNo}
                              </Link>{" "}
                              · {l.narration}
                            </p>
                          </TableCell>
                          {!accountId && (
                            <TableCell className="text-muted-foreground hidden lg:table-cell">
                              {l.account.code} {l.account.name}
                            </TableCell>
                          )}
                          <TableCell className="text-right tabular-nums">
                            {amount(l.receipt)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {amount(l.payment)}
                          </TableCell>
                          <TableCell className="pr-4 text-right tabular-nums">
                            {formatBDT(l.balance)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {!data.lines.length && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-muted-foreground h-16 text-center">
                            No receipts or payments in this period.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                    <TableFooter>
                      <TableRow>
                        <TableCell colSpan={accountId ? 4 : 5} className="pl-4">
                          Closing balance
                        </TableCell>
                        <TableCell className="pr-4 text-right tabular-nums">
                          {formatBDT(data.closing)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </RequirePermission>
  );
}
