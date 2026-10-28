"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/common/page-header";
import RequirePermission from "@/components/common/require-permission";
import StatusBadge from "@/components/common/status-badge";
import { formatDateOnly, toDateInput } from "@/lib/format";
import { useStatement } from "../api";
import { PrintButton, PrintHeading, StatementRows, TotalLine } from "./statement-parts";

export default function BalanceSheetScreen() {
  const [asOf, setAsOf] = useState(() => toDateInput(new Date().toISOString()));
  const { data, isLoading, error } = useStatement("balance-sheet", { asOf });

  return (
    <RequirePermission permission="account.view">
      <PageHeader
        title="Balance sheet"
        description="What the company owns, owes and is worth on a date."
        actions={<PrintButton />}
      />
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <label htmlFor="asOf" className="text-muted-foreground text-sm">
            As of
          </label>
          <Input
            id="asOf"
            type="date"
            className="w-44"
            value={asOf}
            onChange={(e) => e.target.value && setAsOf(e.target.value)}
          />
          {data && (
            <StatusBadge tone={data.balanced ? "green" : "red"}>
              {data.balanced ? "Balanced" : "Does not balance"}
            </StatusBadge>
          )}
        </div>
        {error ? (
          <p className="text-destructive text-sm">{error.message}</p>
        ) : isLoading ? (
          <Skeleton className="h-96" />
        ) : (
          <>
            <PrintHeading title="Balance sheet" period={`as of ${formatDateOnly(data.asOf)}`} />
            <div className="grid items-start gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Assets</CardTitle>
                </CardHeader>
                <CardContent>
                  <StatementRows rows={data.assets.rows} />
                  <TotalLine label="Total assets" amount={data.assets.total} double />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Liabilities and equity</CardTitle>
                </CardHeader>
                <CardContent>
                  <StatementRows rows={data.liabilities.rows} />
                  <TotalLine label="Total liabilities" amount={data.liabilities.total} />
                  <div className="pt-4" />
                  <StatementRows rows={data.equity.rows} />
                  <TotalLine label="Total equity" amount={data.equity.total} />
                  <div className="pt-2" />
                  <TotalLine
                    label="Total liabilities and equity"
                    amount={data.liabilitiesAndEquity}
                    double
                  />
                  <p className="text-muted-foreground mt-3 text-xs">
                    Profit stays in equity as earned (fiscal years are locked, not closed into
                    retained earnings). Customer installments before registration are a liability:
                    customer advances.
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </RequirePermission>
  );
}
