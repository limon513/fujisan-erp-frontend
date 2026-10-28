"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/common/page-header";
import RequirePermission from "@/components/common/require-permission";
import { formatBDT, formatNumber } from "@/lib/format";
import { useStatement } from "../api";
import {
  PeriodPicker,
  PrintButton,
  PrintHeading,
  StatementRows,
  TotalLine,
  periodText,
} from "./statement-parts";

export default function ProfitLossScreen() {
  const [period, setPeriod] = useState({ preset: "fiscal-year", from: "", to: "" });
  const { data, isLoading, error } = useStatement("profit-and-loss", {
    from: period.from,
    to: period.to,
  });

  return (
    <RequirePermission permission="account.view">
      <PageHeader
        title="Profit and loss"
        description={data ? periodText(data) : "Income and expenses for a period."}
        actions={<PrintButton />}
      />
      <div className="space-y-4">
        <PeriodPicker value={period} onChange={setPeriod} shown={data} />
        {error ? (
          <p className="text-destructive text-sm">{error.message}</p>
        ) : isLoading ? (
          <Skeleton className="h-96" />
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <Card>
              <CardContent className="space-y-1">
                <PrintHeading title="Profit and loss" period={periodText(data)} />
                <StatementRows rows={data.income.rows} />
                <TotalLine label="Total income" amount={data.income.total} />
                <div className="pt-4" />
                <StatementRows rows={data.expenses.rows} />
                <TotalLine label="Total expenses" amount={data.expenses.total} />
                <div className="pt-2" />
                <TotalLine
                  label={Number(data.netProfit) < 0 ? "Net loss" : "Net profit"}
                  amount={data.netProfit}
                  double
                  tone="auto"
                />
                {!data.income.rows.length && !data.expenses.rows.length && (
                  <p className="text-muted-foreground py-6 text-center text-sm">
                    Nothing posted to income or expenses in this period.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className="print:hidden">
              <CardHeader>
                <CardTitle>From plot sales</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Plot sales (registered)</dt>
                    <dd className="tabular-nums">{formatBDT(data.grossProfit.sales)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">Cost of plots sold</dt>
                    <dd className="tabular-nums">−{formatBDT(data.grossProfit.costOfSales)}</dd>
                  </div>
                  <div className="flex justify-between gap-3 border-t pt-2 font-medium">
                    <dt>Gross profit</dt>
                    <dd className="tabular-nums">{formatBDT(data.grossProfit.amount)}</dd>
                  </div>
                  <div className="text-muted-foreground flex justify-between gap-3 text-xs">
                    <dt>Net profit margin</dt>
                    <dd>{data.margin == null ? "—" : `${formatNumber(data.margin)}% of income`}</dd>
                  </div>
                </dl>
                <p className="text-muted-foreground mt-4 text-xs">
                  Sales count at registration; installments before that are customer advances.
                  Interest, late fees, cancellation and transfer fees are income when received.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </RequirePermission>
  );
}
