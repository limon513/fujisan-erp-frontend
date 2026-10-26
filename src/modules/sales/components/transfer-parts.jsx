"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Banknote, ClipboardCheck, Undo2 } from "lucide-react";
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
import ResourceSelect from "@/components/common/resource-select";
import StatusBadge from "@/components/common/status-badge";
import { formatBDT, formatDateOnly, toDateInput } from "@/lib/format";
import { useCan } from "@/modules/auth/auth-provider";
import { useMoneyAccounts } from "@/modules/accounts/api";
import { customers } from "@/modules/customer/api";
import { transfers, useTransferQuote } from "../api";
import { PAYMENT_METHODS, TRANSFER_STATUS } from "../constants";

function Row({ label, children, strong }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "border-t pt-2 font-medium" : ""}`}>
      <dt className={strong ? undefined : "text-muted-foreground"}>{label}</dt>
      <dd className="text-right tabular-nums">{children}</dd>
    </div>
  );
}

/** Ask to move a confirmed booking to another customer. */
export function TransferBookingDialog({ booking, onDone }) {
  const create = transfers.useCreate();
  const { data: quote, isLoading, error: quoteError } = useTransferQuote(booking.id);
  const [toCustomerId, setToCustomerId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);
  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onDone()}
      title={`Transfer ${booking.bookingNo} to another customer`}
      description="The Sales Manager and Accounts Manager approve it; either may change the fee. The booking moves once the fee is received."
      error={error}
      submitting={create.isPending}
      submitLabel="Send for approval"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!toCustomerId) {
          setError("Choose the new owner");
          return;
        }
        if (reason.trim().length < 3) {
          setError("Say why the booking is transferred");
          return;
        }
        try {
          const result = await create.mutateAsync({ bookingId: booking.id, toCustomerId, reason });
          toast.success(`${result.transferNo} sent for approval`);
          onDone();
        } catch (apiError) {
          setError(apiError.message);
        }
      }}
    >
      {quoteError ? (
        <p className="text-destructive text-sm">{quoteError.message}</p>
      ) : isLoading ? (
        <Skeleton className="h-20" />
      ) : (
        <dl className="space-y-2 rounded-lg border p-3 text-sm">
          <Row label="Current owner">{booking.customer.fullName}</Row>
          <Row label="Paid so far (moves with the booking)">{formatBDT(quote.amountPaid)}</Row>
          <Row label={`Transfer fee · ${quote.feePolicy.text}`} strong>
            {formatBDT(quote.feeAmount)}
          </Row>
        </dl>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="toCustomerId">New owner</Label>
        <ResourceSelect
          id="toCustomerId"
          resource={customers}
          params={{ sortBy: "fullName", sortOrder: "asc" }}
          value={toCustomerId}
          onChange={setToCustomerId}
          getLabel={(c) =>
            c.id === booking.customer.id
              ? `${c.fullName} (current owner)`
              : `${c.fullName} (${c.customerCode})`
          }
        />
        <p className="text-muted-foreground text-xs">
          Add the new owner under Customers first if they aren&apos;t there yet.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reason">Why?</Label>
        <Textarea
          id="reason"
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Sold to a relative, moving abroad, …"
        />
      </div>
    </FormDialog>
  );
}

const FEE_METHODS = ["CASH", "BANK_TRANSFER", "CHEQUE", "BKASH", "NAGAD"];

/** Accounts record the fee received; the booking then belongs to the new owner. */
export function CompleteTransferDialog({ transfer, onDone }) {
  const complete = transfers.usePostAction("complete");
  const [method, setMethod] = useState("CASH");
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
      title={`Receive the ${formatBDT(transfer.feeAmount)} transfer fee`}
      description={`${transfer.transferNo} · ${transfer.fromCustomer.fullName} → ${transfer.toCustomer.fullName}. Recording it hands the booking over.`}
      error={error}
      submitting={complete.isPending}
      submitLabel="Record fee and transfer"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          await complete.mutateAsync({
            id: transfer.id,
            method,
            reference,
            paidOn,
            ...(accountId && { accountId }),
          });
          toast.success(`The booking now belongs to ${transfer.toCustomer.fullName}`);
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
              {FEE_METHODS.map((m) => (
                <SelectItem key={m} value={m}>
                  {PAYMENT_METHODS[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="paidOn">Received on</Label>
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
          <Label htmlFor="accountId">Into account</Label>
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

/** The booking's latest transfer, with its actions. */
export function TransferCard({ transfer }) {
  const can = useCan();
  const withdraw = transfers.usePostAction("withdraw");
  const [completing, setCompleting] = useState(false);
  const status = TRANSFER_STATUS[transfer.status];
  return (
    <Card className={transfer.status === "PENDING_APPROVAL" ? "border-amber-500/40" : undefined}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          Ownership transfer <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        </CardTitle>
        <CardDescription>
          {transfer.transferNo} · “{transfer.reason}”
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="flex flex-wrap items-center gap-1.5 text-sm">
          <Link href={`/customers/${transfer.fromCustomer.id}`} className="underline">
            {transfer.fromCustomer.fullName}
          </Link>
          <ArrowRight className="text-muted-foreground size-4" />
          <Link href={`/customers/${transfer.toCustomer.id}`} className="underline">
            {transfer.toCustomer.fullName}
          </Link>
        </p>
        <dl className="space-y-2 text-sm">
          {transfer.amountPaid != null && (
            <Row label="Paid, moves with it">{formatBDT(transfer.amountPaid)}</Row>
          )}
          <Row label="Transfer fee" strong>
            {formatBDT(transfer.feeAmount)}
          </Row>
        </dl>
        {transfer.completedOn && (
          <p className="text-muted-foreground text-xs">
            Completed {formatDateOnly(transfer.completedOn)}
          </p>
        )}
        {transfer.closeReason && (
          <p className="text-muted-foreground text-xs">“{transfer.closeReason}”</p>
        )}
        <div className="flex flex-wrap gap-2">
          {transfer.approvalRequestId && (
            <Button size="sm" variant="outline" asChild>
              <Link href={`/approvals/${transfer.approvalRequestId}`}>
                <ClipboardCheck /> Approval
              </Link>
            </Button>
          )}
          {transfer.status === "APPROVED" && can("transfer.complete") && (
            <Button size="sm" onClick={() => setCompleting(true)}>
              <Banknote /> Receive fee
            </Button>
          )}
          {transfer.status === "PENDING_APPROVAL" && can("transfer.create") && (
            <Button
              size="sm"
              variant="ghost"
              disabled={withdraw.isPending}
              onClick={async () => {
                try {
                  await withdraw.mutateAsync({ id: transfer.id });
                  toast.success("Transfer withdrawn");
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
      {completing && (
        <CompleteTransferDialog transfer={transfer} onDone={() => setCompleting(false)} />
      )}
    </Card>
  );
}
