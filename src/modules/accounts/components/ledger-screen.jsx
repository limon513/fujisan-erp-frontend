"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { formatBDT, formatDateOnly } from "@/lib/format";
import { useLedger } from "../api";
import { ACCOUNT_TYPES } from "../constants";

const amount = (value) => (Number(value) ? formatBDT(value) : "");

export default function LedgerScreen() {
  const { id } = useParams();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data, isLoading, error } = useLedger(id, { from, to });

  return (
    <RequirePermission permission="account.view">
      <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
        <Link href="/accounts">
          <ArrowLeft /> Chart of accounts
        </Link>
      </Button>
      {error ? (
        <p className="text-destructive text-sm">{error.message}</p>
      ) : isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <>
          <PageHeader
            title={`${data.account.code} ${data.account.name}`}
            description={`${ACCOUNT_TYPES[data.account.type]} · balance ${formatBDT(data.closingBalance)}${to ? ` on ${formatDateOnly(data.to)}` : " today"}`}
          />
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <label htmlFor="from" className="text-muted-foreground">
                From
              </label>
              <Input
                id="from"
                type="date"
                className="w-44"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <label htmlFor="to" className="text-muted-foreground">
                to
              </label>
              <Input
                id="to"
                type="date"
                className="w-44"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Date</TableHead>
                    <TableHead>Entry</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {from && (
                    <TableRow className="bg-muted/30">
                      <TableCell>{formatDateOnly(`${from}T00:00:00.000Z`)}</TableCell>
                      <TableCell className="font-medium">Opening balance</TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatBDT(data.openingBalance)}
                      </TableCell>
                    </TableRow>
                  )}
                  {data.lines.length ? (
                    data.lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell className="whitespace-nowrap">
                          {formatDateOnly(line.entry.date)}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/accounts/journals/${line.entry.id}`}
                            className="font-medium hover:underline"
                          >
                            {line.entry.entryNo}
                          </Link>
                          <p className="text-muted-foreground line-clamp-1 text-xs">
                            {line.description ?? line.entry.narration}
                          </p>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {amount(line.debit)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {amount(line.credit)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatBDT(line.balance)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground h-20 text-center">
                        No postings in this period.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2}>Totals and closing balance</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBDT(data.totalDebit)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBDT(data.totalCredit)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBDT(data.closingBalance)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </div>
        </>
      )}
    </RequirePermission>
  );
}
