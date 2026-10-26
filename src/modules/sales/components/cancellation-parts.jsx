"use client";

import { useState } from "react";
import Link from "next/link";
import { Banknote, CalendarRange, ClipboardCheck, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import FormDialog from "@/components/common/form-dialog";
import StatusBadge from "@/components/common/status-badge";
import { cn } from "@/lib/utils";
import { formatBDT, formatDateOnly, toDateInput } from "@/lib/format";
import { useCan } from "@/modules/auth/auth-provider";
import { useMoneyAccounts } from "@/modules/accounts/api";
import { cancellations, refundTotals, useCancellationQuote, useRefundSchedule } from "../api";
import { CANCELLATION_STATUS, PAYMENT_METHODS } from "../constants";

function Row({ label, children, strong }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "border-t pt-2 font-medium" : ""}`}>
      <dt className={strong ? undefined : "text-muted-foreground"}>{label}</dt>
      <dd className="text-right tabular-nums">{children}</dd>
    </div>
  );
}

/** Ask to cancel a confirmed booking: shows the refund the policy gives, asks why. */
export function CancelBookingDialog({ booking, onDone }) {
  const create = cancellations.useCreate();
  const { data: quote, isLoading, error: quoteError } = useCancellationQuote(booking.id);
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);
  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onDone()}
      title={`Cancel ${booking.bookingNo}?`}
      description="The Sales Manager and Accounts Manager approve it; either may change the refund. Plot and booking stay as they are until then."
      error={error}
      submitting={create.isPending}
      submitLabel="Send for approval"
      onSubmit={async (event) => {
        event.preventDefault();
        if (reason.trim().length < 3) {
          setError("Say why the booking is cancelled");
          return;
        }
        try {
          const result = await create.mutateAsync({ bookingId: booking.id, reason });
          toast.success(`${result.cancellationNo} sent for approval`);
          onDone();
        } catch (apiError) {
          setError(apiError.message);
        }
      }}
    >
      {quoteError ? (
        <p className="text-destructive text-sm">{quoteError.message}</p>
      ) : isLoading ? (
        <Skeleton className="h-24" />
      ) : (
        <dl className="space-y-2 rounded-lg border p-3 text-sm">
          <Row label="Paid so far (installments)">{formatBDT(quote.totalPaid)}</Row>
          <Row label={`Cancellation charge · ${quote.policy.text}`}>
            −{formatBDT(quote.chargeAmount)}
          </Row>
          <Row label="Refund" strong>
            {formatBDT(quote.refundAmount)}
          </Row>
        </dl>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="reason">Why?</Label>
        <Textarea
          id="reason"
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Customer moving abroad, can't continue the installments, …"
        />
      </div>
    </FormDialog>
  );
}

const REFUND_METHODS = ["CASH", "BANK_TRANSFER", "CHEQUE", "BKASH", "NAGAD"];

/** Accounts record paying the refund out (posts it from the chosen account). */
export function RefundDialog({ cancellation, onDone }) {
  const pay = cancellations.usePostAction("refund");
  const [method, setMethod] = useState("BANK_TRANSFER");
  const [reference, setReference] = useState("");
  const [paidOn, setPaidOn] = useState(() => toDateInput(new Date().toISOString()));
  const [chosen, setChosen] = useState("");
  const { options, fallback } = useMoneyAccounts(method);
  const accountId = chosen || fallback;
  const [error, setError] = useState(null);
  const totals = refundTotals(cancellation);
  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onDone()}
      title={
        totals.next
          ? `Pay refund part ${totals.next.number} of ${totals.count}: ${formatBDT(totals.next.amount)}`
          : `Pay the ${formatBDT(totals.due)} refund`
      }
      description={`${cancellation.cancellationNo} · ${cancellation.booking?.customer?.fullName ?? ""}`}
      error={error}
      submitting={pay.isPending}
      submitLabel="Record refund"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          await pay.mutateAsync({
            id: cancellation.id,
            method,
            reference,
            paidOn,
            ...(accountId && { accountId }),
          });
          toast.success(
            totals.next && totals.count > 1
              ? "Refund part paid and posted"
              : "Refund paid and posted",
          );
          onDone();
        } catch (apiError) {
          setError(apiError.message);
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="method">Paid by</Label>
          <Select
            value={method}
            onValueChange={(v) => {
              setMethod(v);
              setChosen("");
            }}
          >
            <SelectTrigger id="method" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REFUND_METHODS.map((m) => (
                <SelectItem key={m} value={m}>
                  {PAYMENT_METHODS[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="paidOn">Paid on</Label>
          <Input
            id="paidOn"
            type="date"
            value={paidOn}
            onChange={(e) => setPaidOn(e.target.value)}
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="accountId">From account</Label>
          <Select value={accountId} onValueChange={setChosen}>
            <SelectTrigger id="accountId" className="w-full">
              <SelectValue placeholder="Loading…" />
            </SelectTrigger>
            <SelectContent>
              {options.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.code} {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {method !== "CASH" && (
          <div className="space-y-1.5">
            <Label htmlFor="reference">
              {method === "CHEQUE" ? "Cheque number" : "Transaction id"}
            </Label>
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
        )}
      </div>
    </FormDialog>
  );
}

const pad = (n) => String(n).padStart(2, "0");
/** `start` (YYYY-MM-DD) plus k months, kept inside short months. */
function addMonths(start, k) {
  const [y, m, d] = start.split("-").map(Number);
  const last = new Date(Date.UTC(y, m - 1 + k + 1, 0)).getUTCDate();
  const date = new Date(Date.UTC(y, m - 1 + k, Math.min(d, last)));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}
/** `count` monthly parts of whole taka, the remainder on the last. */
function evenParts(total, count, first) {
  const each = Math.floor(total / count);
  return Array.from({ length: count }, (_, k) => ({
    dueDate: addMonths(first, k),
    amount: String(k === count - 1 ? Math.round((total - each * (count - 1)) * 100) / 100 : each),
  }));
}

/** Accounts split what is still to refund into dated parts (monthly by default, editable). */
export function RefundScheduleDialog({ cancellation, onDone }) {
  const save = useRefundSchedule();
  const { due } = refundTotals(cancellation);
  const [count, setCount] = useState("3");
  const [first, setFirst] = useState(() => toDateInput(new Date().toISOString()));
  const [parts, setParts] = useState(() =>
    evenParts(due, 3, toDateInput(new Date().toISOString())),
  );
  const [error, setError] = useState(null);
  const planned = parts.reduce((t, p) => t + (Number(p.amount) || 0), 0);
  const balanced = Math.round(planned * 100) === Math.round(due * 100);
  const regenerate = (n, date) => {
    const k = Math.min(60, Math.max(1, Number(n) || 1));
    setParts(evenParts(due, k, date));
  };
  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onDone()}
      title={`Pay the ${formatBDT(due)} refund in parts`}
      description={`${cancellation.cancellationNo}. Pay refund then pays the next part due.`}
      error={error}
      submitting={save.isPending}
      submitLabel="Save schedule"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!balanced) {
          setError(`The parts must add up to ${formatBDT(due)}`);
          return;
        }
        try {
          await save.mutateAsync({
            id: cancellation.id,
            parts: parts.map((p) => ({ dueDate: p.dueDate, amount: Number(p.amount) })),
          });
          toast.success("Refund schedule saved");
          onDone();
        } catch (apiError) {
          setError(apiError.message);
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="count">Monthly parts</Label>
          <Input
            id="count"
            inputMode="numeric"
            value={count}
            onChange={(e) => {
              setCount(e.target.value);
              if (Number(e.target.value) > 0) regenerate(e.target.value, first);
            }}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="first">First payment</Label>
          <Input
            id="first"
            type="date"
            value={first}
            onChange={(e) => {
              if (!e.target.value) return;
              setFirst(e.target.value);
              regenerate(count, e.target.value);
            }}
          />
        </div>
      </div>
      <div className="max-h-64 space-y-2 overflow-y-auto">
        {parts.map((part, index) => (
          <div key={index} className="grid grid-cols-[2rem_1fr_9rem] items-center gap-2">
            <span className="text-muted-foreground text-sm tabular-nums">{index + 1}</span>
            <Input
              type="date"
              aria-label={`Part ${index + 1} date`}
              value={part.dueDate}
              onChange={(e) =>
                setParts(parts.map((p, i) => (i === index ? { ...p, dueDate: e.target.value } : p)))
              }
            />
            <Input
              inputMode="decimal"
              className="text-right"
              aria-label={`Part ${index + 1} amount`}
              value={part.amount}
              onChange={(e) =>
                setParts(parts.map((p, i) => (i === index ? { ...p, amount: e.target.value } : p)))
              }
            />
          </div>
        ))}
      </div>
      <p
        className={cn(
          "rounded-lg border p-2.5 text-right text-sm tabular-nums",
          balanced ? "border-emerald-500/40" : "border-amber-500/40",
        )}
      >
        {formatBDT(planned)} of {formatBDT(due)}
        {!balanced &&
          ` · ${formatBDT(Math.abs(due - planned))} ${planned > due ? "too much" : "short"}`}
      </p>
    </FormDialog>
  );
}

/** The refund's parts: due or paid, with dates. */
function RefundParts({ parts }) {
  if (parts.length < 2 && parts.every((p) => p.status === "PAID")) return null;
  return (
    <ol className="divide-y rounded-md border text-sm">
      {parts.map((p) => (
        <li key={p.id} className="flex items-center justify-between gap-3 px-2.5 py-1.5">
          <span className="text-muted-foreground tabular-nums">
            {p.number}. {formatDateOnly(p.status === "PAID" ? p.paidOn : p.dueDate)}
          </span>
          <span className="flex items-center gap-2 tabular-nums">
            {formatBDT(p.amount)}
            <StatusBadge tone={p.status === "PAID" ? "green" : "gray"}>
              {p.status === "PAID" ? "Paid" : "Due"}
            </StatusBadge>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** The booking's latest cancellation, with its actions. */
export function CancellationCard({ cancellation, booking }) {
  const can = useCan();
  const withdraw = cancellations.usePostAction("withdraw");
  const [paying, setPaying] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const status = CANCELLATION_STATUS[cancellation.status];
  const totals = refundTotals(cancellation);
  return (
    <Card
      className={cancellation.status === "PENDING_APPROVAL" ? "border-amber-500/40" : undefined}
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          Cancellation <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        </CardTitle>
        <CardDescription>
          {cancellation.cancellationNo} · “{cancellation.reason}”
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="space-y-2 text-sm">
          <Row label="Paid">{formatBDT(cancellation.totalPaid)}</Row>
          <Row label="Charge">−{formatBDT(cancellation.chargeAmount)}</Row>
          <Row label="Refund" strong>
            {formatBDT(cancellation.refundAmount)}
          </Row>
        </dl>
        <RefundParts parts={cancellation.refundParts ?? []} />
        {cancellation.status === "APPROVED" && totals.paid > 0 && (
          <p className="text-muted-foreground text-xs">
            {formatBDT(totals.paid)} paid, {formatBDT(totals.due)} still to pay
          </p>
        )}
        {cancellation.status === "REFUNDED" && cancellation.refundParts?.length > 0 && (
          <p className="text-muted-foreground text-xs">
            Refund paid
            {cancellation.refundParts.length === 1
              ? ` ${formatDateOnly(cancellation.refundParts[0].paidOn)}`
              : ` in ${cancellation.refundParts.length} parts`}
          </p>
        )}
        {cancellation.closeReason && (
          <p className="text-muted-foreground text-xs">“{cancellation.closeReason}”</p>
        )}
        <div className="flex flex-wrap gap-2">
          {cancellation.approvalRequestId && (
            <Button size="sm" variant="outline" asChild>
              <Link href={`/approvals/${cancellation.approvalRequestId}`}>
                <ClipboardCheck /> Approval
              </Link>
            </Button>
          )}
          {cancellation.status === "APPROVED" && can("cancellation.refund") && (
            <>
              <Button size="sm" onClick={() => setPaying(true)}>
                <Banknote /> {totals.next ? `Pay part ${totals.next.number}` : "Pay refund"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setScheduling(true)}>
                <CalendarRange /> {totals.count > 0 ? "Re-plan parts" : "Pay in parts"}
              </Button>
            </>
          )}
          {cancellation.status === "PENDING_APPROVAL" && can("cancellation.create") && (
            <Button
              size="sm"
              variant="ghost"
              disabled={withdraw.isPending}
              onClick={async () => {
                try {
                  await withdraw.mutateAsync({ id: cancellation.id });
                  toast.success("Cancellation withdrawn");
                } catch (apiError) {
                  toast.error(apiError.message);
                }
              }}
            >
              <Undo2 /> Withdraw
            </Button>
          )}
        </div>
      </CardContent>
      {scheduling && (
        <RefundScheduleDialog cancellation={cancellation} onDone={() => setScheduling(false)} />
      )}
      {paying && (
        <RefundDialog
          cancellation={{ ...cancellation, booking: { customer: booking.customer } }}
          onDone={() => setPaying(false)}
        />
      )}
    </Card>
  );
}
