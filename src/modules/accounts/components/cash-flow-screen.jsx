"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/common/page-header";
import RequirePermission from "@/components/common/require-permission";
import StatusBadge from "@/components/common/status-badge";
import { formatBDT } from "@/lib/format";
import { useStatement } from "../api";
import { PeriodPicker, PrintButton, PrintHeading, TotalLine, periodText } from "./statement-parts";

export default function CashFlowScreen() {
  const [period, setPeriod] = useState({ preset: "fiscal-year", from: "", to: "" });
  const { data, isLoading, error } = useStatement("cash-flow", {
    from: period.from,
    to: period.to,
  });

  return (
    <RequirePermission permission="account.view">
      <PageHeader
        title="Cash flow"
        description={
          data ? periodText(data) : "Where cash and bank money came from and went, by activity."
        }
        actions={<PrintButton />}
      />
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <PeriodPicker value={period} onChange={setPeriod} shown={data} />
          {data && (
            <StatusBadge tone={data.reconciles ? "green" : "red"} className="print:hidden">
              {data.reconciles ? "Agrees with cash and bank balances" : "Does not agree"}
            </StatusBadge>
          )}
        </div>
        {error ? (
          <p className="text-destructive text-sm">{error.message}</p>
        ) : isLoading ? (
          <Skeleton className="h-96" />
        ) : (
          <Card className="max-w-3xl">
            <CardContent className="space-y-1">
              <PrintHeading title="Cash flow statement" period={periodText(data)} />
              <TotalLine label="Cash and bank at the start" amount={data.opening} />
              {data.sections.map((section) => (
                <div key={section.key} className="pt-3">
                  <p className="pb-1 text-sm font-semibold">{section.label}</p>
                  {section.rows.length ? (
                    section.rows.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-baseline justify-between gap-4 py-1 pl-5 text-sm"
                      >
                        <span className="min-w-0">
                          <span className="text-muted-foreground mr-2 font-mono text-xs">
                            {r.code}
                          </span>
                          <Link href={`/accounts/${r.id}`} className="hover:underline">
                            {r.name}
                          </Link>
                        </span>
                        <span className="shrink-0 tabular-nums">{formatBDT(r.amount)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-muted-foreground py-1 pl-5 text-sm">None</p>
                  )}
                  <TotalLine
                    label={`Net cash from ${section.label.toLowerCase()}`}
                    amount={section.total}
                    tone="auto"
                  />
                </div>
              ))}
              <div className="pt-3" />
              <TotalLine label="Net change in cash and bank" amount={data.netChange} tone="auto" />
              <TotalLine label="Cash and bank at the end" amount={data.closing} double />
              <p className="text-muted-foreground pt-3 text-xs">
                Direct method: each line is the account on the other side of the money movement
                (positive = money in). Transfers between cash, bank and mobile accounts are left
                out. Land and development costs are operating for a land developer.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </RequirePermission>
  );
}
