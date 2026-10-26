"use client";

import { useState } from "react";
import Link from "next/link";
import { Banknote, ClipboardCheck, Undo2 } from "lucide-react";
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
import { formatBDT, formatDateOnly, toDateInput } from "@/lib/format";
import { useCan } from "@/modules/auth/auth-provider";
import { useMoneyAccounts } from "@/modules/accounts/api";
import { cancellations, useCancellationQuote } from "../api";
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
  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onDone()}
      title={`Pay the ${formatBDT(cancellation.refundAmount)} refund`}
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
          toast.success("Refund recorded and posted");
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

/** The booking's latest cancellation, with its actions. */
export function CancellationCard({ cancellation, booking }) {
  const can = useCan();
  const withdraw = cancellations.usePostAction("withdraw");
  const [paying, setPaying] = useState(false);
  const status = CANCELLATION_STATUS[cancellation.status];
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
        {cancellation.refundPaidOn && (
          <p className="text-muted-foreground text-xs">
            Refund paid {formatDateOnly(cancellation.refundPaidOn)}
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
            <Button size="sm" onClick={() => setPaying(true)}>
              <Banknote /> Pay refund
            </Button>
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
      {paying && (
        <RefundDialog
          cancellation={{ ...cancellation, booking: { customer: booking.customer } }}
          onDone={() => setPaying(false)}
        />
      )}
    </Card>
  );
}
