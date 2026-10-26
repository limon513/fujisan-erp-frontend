"use client";

import { useParams } from "next/navigation";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBDT, formatDateOnly, formatMobile, formatNumber } from "@/lib/format";
import { useCompany } from "@/modules/setting/api";
import { BOOKING_STATUS, installmentLabel } from "@/modules/sales/constants";
import { useCustomerStatement } from "../api";

const KIND = {
  RECEIPT: "Received",
  REVERSAL: "Reversed",
  REFUND: "Refunded",
  TRANSFER_IN: "Transfer in",
  TRANSFER_OUT: "Transfer out",
};
const INSTALLMENT_TEXT = { DUE: "Due", PARTIAL: "Part paid", PAID: "Paid", WAIVED: "Waived" };
const money = (v) => (Number(v) ? formatBDT(v) : "");

/** Printable statement of everything between the company and one customer. */
export default function CustomerStatement() {
  const { id } = useParams();
  const { data, isLoading, error } = useCustomerStatement(id);
  const { data: company } = useCompany();

  if (error) return <p className="p-8 text-sm text-red-600">{error.message}</p>;
  if (isLoading) return <Skeleton className="m-8 h-96" />;
  const { customer, totals } = data;

  return (
    // Always black on white, whatever the screen theme
    <div className="min-h-svh bg-neutral-100 py-8 text-neutral-900 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-4xl justify-end px-4 print:hidden">
        <Button onClick={() => window.print()}>
          <Printer /> Print
        </Button>
      </div>
      <article className="mx-auto max-w-4xl space-y-6 bg-white p-10 text-sm shadow-sm print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between border-b-2 border-neutral-900 pb-4">
          <div>
            <h1 className="text-2xl font-bold">{company?.legalName ?? company?.name}</h1>
            {company?.address && <p className="text-neutral-600">{company.address}</p>}
            <p className="text-neutral-600">
              {[company?.phone, company?.email].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold tracking-wide">CUSTOMER STATEMENT</p>
            <p className="text-neutral-600">As of {formatDateOnly(data.asOf)}</p>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-base font-semibold">{customer.fullName}</p>
            <p className="text-neutral-600">
              {customer.customerCode}
              {customer.fatherName && ` · s/o, d/o ${customer.fatherName}`}
            </p>
            <p className="text-neutral-600">
              {formatMobile(customer.mobile)}
              {customer.email && ` · ${customer.email}`}
            </p>
            {customer.presentAddress && (
              <p className="text-neutral-600">{customer.presentAddress}</p>
            )}
          </div>
          <dl className="space-y-1 self-end text-right">
            <div className="flex justify-end gap-4">
              <dt className="text-neutral-500">Total received</dt>
              <dd className="w-32 font-medium tabular-nums">{formatBDT(totals.received)}</dd>
            </div>
            <div className="flex justify-end gap-4">
              <dt className="text-neutral-500">Refunded / moved out</dt>
              <dd className="w-32 font-medium tabular-nums">{formatBDT(totals.paidOut)}</dd>
            </div>
            <div className="flex justify-end gap-4 border-t border-neutral-900 pt-1">
              <dt className="font-semibold">Held for the customer</dt>
              <dd className="w-32 font-semibold tabular-nums">{formatBDT(totals.held)}</dd>
            </div>
          </dl>
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold">Bookings</h2>
          {data.bookings.length ? (
            <table className="w-full tabular-nums">
              <thead className="border-b border-neutral-900 text-left text-xs text-neutral-500">
                <tr>
                  <th className="py-1 font-normal">Booking</th>
                  <th className="py-1 font-normal">Plot</th>
                  <th className="py-1 font-normal">Status</th>
                  <th className="py-1 text-right font-normal">Total payable</th>
                  <th className="py-1 text-right font-normal">Paid</th>
                  <th className="py-1 text-right font-normal">Still owed</th>
                  <th className="py-1 text-right font-normal">Overdue</th>
                </tr>
              </thead>
              <tbody>
                {data.bookings.map((b) => (
                  <tr key={b.id} className="border-b border-neutral-200">
                    <td className="py-1.5">
                      {b.bookingNo}
                      <p className="text-xs text-neutral-500">
                        {formatDateOnly(b.bookingDate)} · {b.planName}
                      </p>
                    </td>
                    <td className="py-1.5">
                      {b.plot.code} · {b.project.name}
                      <p className="text-xs text-neutral-500">
                        {formatNumber(b.plot.areaSqft)} sqft
                      </p>
                    </td>
                    <td className="py-1.5">{BOOKING_STATUS[b.status].label}</td>
                    <td className="py-1.5 text-right">{formatBDT(b.totalPayable)}</td>
                    <td className="py-1.5 text-right">
                      {b.balance ? formatBDT(b.balance.paid) : "—"}
                    </td>
                    <td className="py-1.5 text-right">
                      {b.balance ? formatBDT(b.balance.outstanding) : "—"}
                    </td>
                    <td className="py-1.5 text-right font-medium">
                      {b.balance && Number(b.balance.overdue) ? formatBDT(b.balance.overdue) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-neutral-500">No bookings in this customer&apos;s name now.</p>
          )}
        </section>

        <section className="space-y-2">
          <h2 className="font-semibold">Transactions</h2>
          {data.lines.length ? (
            <table className="w-full tabular-nums">
              <thead className="border-b border-neutral-900 text-left text-xs text-neutral-500">
                <tr>
                  <th className="py-1 font-normal">Date</th>
                  <th className="py-1 font-normal">Reference</th>
                  <th className="py-1 font-normal">Particulars</th>
                  <th className="py-1 text-right font-normal">In</th>
                  <th className="py-1 text-right font-normal">Out</th>
                  <th className="py-1 text-right font-normal">Balance</th>
                </tr>
              </thead>
              <tbody>
                {data.lines.map((line, index) => (
                  <tr
                    key={`${line.ref}-${line.kind}-${index}`}
                    className="border-b border-neutral-200"
                  >
                    <td className="py-1.5 whitespace-nowrap">{formatDateOnly(line.date)}</td>
                    <td className="py-1.5 whitespace-nowrap">{line.ref}</td>
                    <td className="py-1.5">
                      <span className="text-neutral-500">{KIND[line.kind]} · </span>
                      {line.text}
                    </td>
                    <td className="py-1.5 text-right">{money(line.in)}</td>
                    <td className="py-1.5 text-right">{money(line.out)}</td>
                    <td className="py-1.5 text-right font-medium">{formatBDT(line.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-neutral-500">No money received yet.</p>
          )}
        </section>

        {data.bookings
          .filter((b) => b.installments.length)
          .map((b) => (
            <section key={b.id} className="break-inside-avoid-page space-y-2">
              <h2 className="font-semibold">
                Schedule · {b.bookingNo} (plot {b.plot.code})
              </h2>
              <table className="w-full tabular-nums">
                <thead className="border-b border-neutral-900 text-left text-xs text-neutral-500">
                  <tr>
                    <th className="py-1 font-normal">Installment</th>
                    <th className="py-1 font-normal">Due</th>
                    <th className="py-1 text-right font-normal">Amount</th>
                    <th className="py-1 text-right font-normal">Late fee</th>
                    <th className="py-1 text-right font-normal">Paid</th>
                    <th className="py-1 text-right font-normal">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {b.installments.map((i) => (
                    <tr key={i.number} className="border-b border-neutral-200">
                      <td className="py-1">{installmentLabel(i)}</td>
                      <td className="py-1">{formatDateOnly(i.dueDate)}</td>
                      <td className="py-1 text-right">{formatBDT(i.amount)}</td>
                      <td className="py-1 text-right">{money(i.lateFee)}</td>
                      <td className="py-1 text-right">{money(i.paidAmount)}</td>
                      <td className="py-1 text-right">
                        {i.status !== "PAID" &&
                        i.status !== "WAIVED" &&
                        new Date(i.dueDate) < new Date(data.asOf)
                          ? "Overdue"
                          : INSTALLMENT_TEXT[i.status]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}

        <footer className="border-t pt-3 text-xs text-neutral-500">
          Computer-generated statement. Please contact the accounts office about any difference.
        </footer>
      </article>
    </div>
  );
}
