"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
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
import StatusBadge from "@/components/common/status-badge";
import { formatBDT, toDateInput } from "@/lib/format";
import { useTrialBalance } from "../api";
import { ACCOUNT_TYPES } from "../constants";

const amount = (value) => (Number(value) ? formatBDT(value) : "");

export default function TrialBalanceScreen() {
  const [asOf, setAsOf] = useState(() => toDateInput(new Date().toISOString()));
  const { data, isLoading, error } = useTrialBalance({ asOf });

  return (
    <>
      <PageHeader
        title="Trial balance"
        description="Every account with postings, as a debit or credit balance. The two columns must agree."
      />
      <RequirePermission permission="account.view">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="asOf" className="text-muted-foreground text-sm">
              As of
            </label>
            <Input
              id="asOf"
              type="date"
              className="w-44"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
            />
            {data && (
              <StatusBadge tone={data.balanced ? "green" : "red"}>
                {data.balanced ? "Balanced" : "Not balanced"}
              </StatusBadge>
            )}
          </div>
          {error ? (
            <p className="text-destructive text-sm">{error.message}</p>
          ) : isLoading ? (
            <Skeleton className="h-80" />
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="hidden sm:table-cell">Type</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.length ? (
                    data.rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Link href={`/accounts/${row.id}`} className="hover:underline">
                            <span className="text-muted-foreground font-mono text-xs">
                              {row.code}
                            </span>{" "}
                            {row.name}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden sm:table-cell">
                          {ACCOUNT_TYPES[row.type]}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {amount(row.debit)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {amount(row.credit)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-muted-foreground h-20 text-center">
                        Nothing posted yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell className="sm:col-span-2" colSpan={2}>
                      Total
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBDT(data.totalDebit)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBDT(data.totalCredit)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          )}
        </div>
      </RequirePermission>
    </>
  );
}
