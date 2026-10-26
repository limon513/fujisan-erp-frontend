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
import StatusBadge from "@/components/common/status-badge";
import { formatBDT, formatBDTShort, formatDateOnly, formatNumber } from "@/lib/format";
import { BOOKING_STATUS } from "@/modules/sales/constants";
import { useSalesReport } from "../api";
import Stat from "./stat";

export default function SalesReport({ params }) {
  const { data, isLoading, error } = useSalesReport(params);
  if (error) return <p className="text-destructive text-sm">{error.message}</p>;
  if (isLoading) return <Skeleton className="h-96" />;
  const t = data.totals;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat
          label="Bookings"
          value={formatNumber(t.bookings)}
          sub={`${formatNumber(t.areaSqft)} sqft`}
        />
        <Stat label="Sold for" value={formatBDTShort(t.netPrice)} sub="After discounts" />
        <Stat
          label="Discounts given"
          value={formatBDTShort(t.discount)}
          sub={
            Number(t.listPrice) > 0
              ? `${formatNumber((Number(t.discount) / Number(t.listPrice)) * 100)}% of list price`
              : "—"
          }
        />
        <Stat
          label="Registered"
          value={formatNumber(t.registrations)}
          sub={formatBDTShort(t.registeredValue)}
        />
        <Stat
          label="Cancelled"
          value={formatNumber(t.cancellations)}
          sub={`${formatBDTShort(t.cancellationCharges)} charges kept`}
        />
        <Stat
          label="Transferred"
          value={formatNumber(t.transfers)}
          sub={`${formatBDTShort(t.transferFees)} fees`}
        />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>By project</CardTitle>
            <CardDescription>Value of bookings confirmed in the period</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList rows={data.byProject} format={formatBDTShort} countLabel="bookings" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>By salesperson</CardTitle>
            <CardDescription>Who booked them</CardDescription>
          </CardHeader>
          <CardContent>
            <BarList rows={data.bySalesperson} format={formatBDTShort} countLabel="bookings" />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Bookings</CardTitle>
          <CardDescription>
            {formatDateOnly(data.from)} – {formatDateOnly(data.to)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden md:table-cell">Salesperson</TableHead>
                  <TableHead className="text-right">List price</TableHead>
                  <TableHead className="text-right">Discount</TableHead>
                  <TableHead className="text-right">Sold for</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.bookings.length ? (
                  data.bookings.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>
                        <Link href={`/bookings/${b.id}`} className="font-medium hover:underline">
                          {b.bookingNo}
                        </Link>
                        <p className="text-muted-foreground text-xs">
                          {formatDateOnly(b.bookingDate)} · {b.plot.code} · {b.project.name}
                        </p>
                      </TableCell>
                      <TableCell>{b.customer.fullName}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {b.owner?.fullName ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatBDT(b.listPrice)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {Number(b.discountAmount) ? formatBDT(b.discountAmount) : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatBDT(b.netPrice)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <StatusBadge tone={BOOKING_STATUS[b.status].tone}>
                          {BOOKING_STATUS[b.status].label}
                        </StatusBadge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-muted-foreground h-20 text-center">
                      No bookings confirmed in this period.
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
