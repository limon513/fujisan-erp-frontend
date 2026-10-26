"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import AgingBar from "@/components/charts/aging-bar";
import ColumnChart from "@/components/charts/column-chart";
import { formatBDT, formatBDTShort, formatNumber } from "@/lib/format";
import { useOverview } from "@/modules/report/api";

const monthLabel = (key, withYear) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    month: "short",
    ...(withYear && { year: "numeric" }),
  }).format(new Date(`${key}-01T00:00:00Z`));

function Tile({ label, value, sub, href }) {
  return (
    <Link href={href} className="block">
      <Card className="h-full gap-1 py-4 transition-shadow hover:shadow-sm">
        <CardContent className="space-y-1 px-4">
          <p className="text-muted-foreground text-xs">{label}</p>
          <p className="text-2xl font-semibold tabular-nums">{value}</p>
          {sub && <p className="text-muted-foreground text-xs">{sub}</p>}
        </CardContent>
      </Card>
    </Link>
  );
}

/** Sales, collections and receivables for people with report access. */
export default function BusinessOverview() {
  const { data, isLoading, error } = useOverview();
  if (error) return <p className="text-destructive text-sm">{error.message}</p>;
  if (isLoading) return <Skeleton className="h-72" />;
  const { thisMonth: m, receivables: r } = data;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <Tile
          label="Booked this month"
          value={formatBDTShort(m.booked)}
          sub={`${formatNumber(m.bookings)} booking${m.bookings === 1 ? "" : "s"}`}
          href="/reports"
        />
        <Tile
          label="Collected this month"
          value={formatBDTShort(m.collected)}
          sub={
            m.pendingPayments.count
              ? `${formatBDTShort(m.pendingPayments.amount)} waiting to verify`
              : "Nothing waiting to verify"
          }
          href="/collections"
        />
        <Tile
          label="Customers still owe"
          value={formatBDTShort(r.outstanding)}
          sub="On live bookings"
          href="/reports"
        />
        <Tile
          label="Overdue"
          value={formatBDTShort(r.overdue)}
          sub="Past the due date"
          href="/emi"
        />
        <Tile
          label="Due in 30 days"
          value={formatBDTShort(r.dueNext30)}
          sub="Coming installments"
          href="/emi"
        />
        <Tile
          label="Registered · cancelled"
          value={`${formatNumber(m.registrations)} · ${formatNumber(m.cancellations)}`}
          sub="This month"
          href="/bookings"
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Booked vs collected</CardTitle>
            <CardDescription>Last 12 months, by booking date and payment date</CardDescription>
          </CardHeader>
          <CardContent>
            <ColumnChart
              label="Booked vs collected, last 12 months"
              data={data.trend.map((t) => ({
                label: monthLabel(t.month),
                tooltipLabel: `${monthLabel(t.month, true)} · ${t.bookings} booking${t.bookings === 1 ? "" : "s"}`,
                values: { booked: t.booked, collected: t.collected },
              }))}
              series={[
                { key: "booked", label: "Booked (sold for)", color: "var(--chart-1)" },
                { key: "collected", label: "Collected", color: "var(--chart-2)" },
              ]}
              format={formatBDTShort}
              formatFull={formatBDT}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>What customers owe, by lateness</CardTitle>
            <CardDescription>
              {formatBDTShort(r.overdue)} of {formatBDTShort(r.outstanding)} is past due
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AgingBar aging={r.aging} format={formatBDTShort} />
            <Button variant="outline" size="sm" asChild>
              <Link href="/reports">
                Outstanding report <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
