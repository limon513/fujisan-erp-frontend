"use client";

import { useParams } from "next/navigation";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatBDT, formatDateOnly, formatMobile } from "@/lib/format";
import { useCompany } from "@/modules/setting/api";
import { collections } from "../api";
import { installmentLabel, PAYMENT_METHODS } from "../constants";

function Line({ label, children }) {
  return (
    <div className="flex gap-3 border-b border-dashed border-neutral-300 py-1.5">
      <span className="w-40 shrink-0 text-neutral-500">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  );
}

/** Printable money receipt (A5/A4), issued once a payment is verified. */
export default function MoneyReceipt() {
  const { id } = useParams();
  const { data: payment, isLoading, error } = collections.useItem(id);
  const { data: company } = useCompany();

  if (error) return <p className="p-8 text-sm text-red-600">{error.message}</p>;
  if (isLoading) return <Skeleton className="m-8 h-96" />;
  if (payment.status !== "VERIFIED") {
    return <p className="p-8 text-sm">A money receipt is issued only for a verified payment.</p>;
  }

  return (
    // Always printed in black on white, whatever the screen theme
    <div className="min-h-svh bg-neutral-100 py-8 text-neutral-900 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-3xl justify-end px-4 print:hidden">
        <Button onClick={() => window.print()}>
          <Printer /> Print
        </Button>
      </div>
      <article className="mx-auto max-w-3xl bg-white p-10 shadow-sm print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between border-b-2 border-neutral-900 pb-4">
          <div>
            <h1 className="text-2xl font-bold">{company?.legalName ?? company?.name}</h1>
            {company?.address && <p className="text-sm text-neutral-600">{company.address}</p>}
            <p className="text-sm text-neutral-600">
              {[company?.phone, company?.email, company?.website].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold tracking-wide">MONEY RECEIPT</p>
            <p className="font-mono text-sm">{payment.receiptNo}</p>
            <p className="text-sm text-neutral-600">{formatDateOnly(payment.paidOn)}</p>
          </div>
        </header>

        <section className="mt-6 space-y-1 text-sm">
          <Line label="Received with thanks from">
            {payment.customer.fullName} ({payment.customer.customerCode})
          </Line>
          <Line label="Mobile">{formatMobile(payment.customer.mobile)}</Line>
          {payment.customer.presentAddress && (
            <Line label="Address">{payment.customer.presentAddress}</Line>
          )}
          <Line label="The sum of">{payment.amountInWords}</Line>
          <Line label="By">
            {PAYMENT_METHODS[payment.method]}
            {payment.reference && ` · ${payment.reference}`}
            {payment.bankName && ` · ${payment.bankName}`}
            {payment.chequeDate && ` · dated ${formatDateOnly(payment.chequeDate)}`}
          </Line>
          <Line label="Against">
            Booking {payment.booking.bookingNo} · Plot {payment.booking.plot.code}
            {payment.booking.plot.block && `, ${payment.booking.plot.block.name}`} ·{" "}
            {payment.booking.project.name}
          </Line>
          <Line label="Towards">
            {payment.allocations
              .map((a) => `${installmentLabel(a.installment)} (${formatBDT(a.amount)})`)
              .join(", ")}
          </Line>
        </section>

        <div className="mt-6 flex items-center justify-between">
          <div className="rounded border-2 border-neutral-900 px-5 py-3 text-xl font-bold tabular-nums">
            {formatBDT(payment.amount)}
          </div>
          <p className="max-w-xs text-right text-xs text-neutral-500">
            {payment.paymentNo} · verified by {payment.verifiedBy?.name}. Cheque payments are
            subject to clearance.
          </p>
        </div>

        <footer className="mt-16 grid grid-cols-2 gap-16 text-center text-sm">
          <div className="border-t border-neutral-400 pt-2">Customer&apos;s signature</div>
          <div className="border-t border-neutral-400 pt-2">Authorised signature</div>
        </footer>
      </article>
    </div>
  );
}
