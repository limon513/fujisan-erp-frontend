"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import BarList from "@/components/charts/bar-list";
import ColumnChart from "@/components/charts/column-chart";
import { formatBDT, formatBDTShort, formatDateOnly, formatNumber } from "@/lib/format";
import { PAYMENT_METHODS } from "@/modules/sales/constants";
import { useCollectionReport } from "../api";
import Stat from "./stat";

const label = (iso, unit, long) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    ...(unit === "day" ? { day: "numeric", month: "short" } : { month: "short" }),
    ...(long && { year: "numeric" }),
  }).format(new Date(unit === "day" ? `${iso}T00:00:00Z` : `${iso}-01T00:00:00Z`));

export default function CollectionReport({ params }) {
  const { data, isLoading, error } = useCollectionReport(params);
  if (error) return <p className="text-destructive text-sm">{error.message}</p>;
  if (isLoading) return <Skeleton className="h-96" />;
  const t = data.totals;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat
          label="Collected"
          value={formatBDTShort(t.collected)}
          sub={`${formatNumber(t.receipts)} receipts`}
        />
        <Stat label="Late fees in it" value={formatBDTShort(t.lateFees)} />
        <Stat label="Refunds paid" value={formatBDTShort(t.refundsPaid)} />
        <Stat label="Net in" value={formatBDTShort(t.net)} sub="Collected − refunds" />
        <Stat
          label="Collection rate"
          value={t.collectionRate == null ? "—" : `${formatNumber(t.collectionRate)}%`}
          sub={`${formatBDTShort(t.fellDuePaid)} of ${formatBDTShort(t.fellDue)} that fell due`}
        />
        <Stat
          label="Waiting for verification"
          value={formatBDTShort(t.pending.amount)}
          sub={`${formatNumber(t.pending.count)} payments`}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Collected per {data.trend.unit}</CardTitle>
          <CardDescription>
            Verified payments by the date the customer paid, {formatDateOnly(data.from)} –{" "}
            {formatDateOnly(data.to)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ColumnChart
            label={`Collected per ${data.trend.unit}`}
            data={data.trend.points.map((d) => ({
              label: label(d.date, data.trend.unit),
              tooltipLabel: `${label(d.date, data.trend.unit, true)} · ${d.count} receipt${d.count === 1 ? "" : "s"}`,
              values: { amount: d.amount },
            }))}
            series={[{ key: "amount", label: "Collected", color: "var(--chart-1)" }]}
            format={formatBDTShort}
            formatFull={formatBDT}
          />
        </CardContent>
      </Card>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>By payment method</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList rows={data.byMethod} format={formatBDTShort} countLabel="receipts" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Into account</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList
              rows={data.byAccount.map((a) => ({
                ...a,
                href: a.id !== "none" && `/accounts/${a.id}`,
              }))}
              format={formatBDTShort}
              countLabel="receipts"
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>By project</CardTitle>
          </CardHeader>
          <CardContent>
            <BarList rows={data.byProject} format={formatBDTShort} countLabel="receipts" />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Receipts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Method</TableHead>
                  <TableHead className="hidden lg:table-cell">Account</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.payments.length ? (
                  data.payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link href={`/collections/${p.id}`} className="font-medium hover:underline">
                          {p.receiptNo}
                        </Link>
                        <p className="text-muted-foreground text-xs">{formatDateOnly(p.paidOn)}</p>
                      </TableCell>
                      <TableCell>
                        {p.customer.fullName}
                        <p className="text-muted-foreground text-xs">
                          {p.booking.bookingNo} · {p.booking.plot.code}
                        </p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {PAYMENT_METHODS[p.method]}
                        {p.reference && (
                          <p className="text-muted-foreground text-xs">{p.reference}</p>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {p.depositAccount
                          ? `${p.depositAccount.code} ${p.depositAccount.name}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatBDT(p.amount)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground h-20 text-center">
                      No verified payments in this period.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
