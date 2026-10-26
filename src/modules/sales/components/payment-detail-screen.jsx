"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BadgeCheck, Printer, Undo2, X } from "lucide-react";
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
import FormDialog from "@/components/common/form-dialog";
import PageHeader from "@/components/common/page-header";
import RequirePermission from "@/components/common/require-permission";
import StatusBadge from "@/components/common/status-badge";
import { formatBDT, formatDateOnly, formatDateTime, formatMobile } from "@/lib/format";
import { toastError } from "@/lib/notify";
import { useAuth, useCan } from "@/modules/auth/auth-provider";
import { useMoneyAccounts } from "@/modules/accounts/api";
import { collections } from "../api";
import { installmentLabel, PAYMENT_METHODS, PAYMENT_STATUS } from "../constants";

function ReasonDialog({ title, description, label, action, payment, onDone }) {
  const run = collections.usePostAction(action);
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);
  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onDone()}
      title={title}
      description={description}
      error={error}
      submitting={run.isPending}
      submitLabel={label}
      onSubmit={async (event) => {
        event.preventDefault();
        if (reason.trim().length < 3) {
          setError("Give a reason");
          return;
        }
        try {
          await run.mutateAsync({ id: payment.id, reason });
          toast.success(
            `${payment.receiptNo ?? payment.paymentNo} ${action === "reverse" ? "reversed" : "rejected"}`,
          );
          onDone();
        } catch (apiError) {
          setError(apiError.message);
        }
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="reason">Why?</Label>
        <Input
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={
            action === "reverse"
              ? "Cheque bounced, entered twice, …"
              : "Amount doesn't match the bank, …"
          }
        />
      </div>
    </FormDialog>
  );
}

/** Verify: choose where the money went (cash in hand, a bank or a mobile account). */
function VerifyDialog({ payment, onDone }) {
  const verify = collections.usePostAction("verify");
  const { options, fallback } = useMoneyAccounts(payment.method);
  const [chosen, setChosen] = useState("");
  const depositAccountId = chosen || fallback;
  const [error, setError] = useState(null);
  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onDone()}
      title={`Verify ${formatBDT(payment.amount)}?`}
      description="Only when the money has arrived. A money receipt number is issued, the amount is applied to the schedule and posted to the accounts."
      error={error}
      submitting={verify.isPending}
      submitLabel="Verify"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          const result = await verify.mutateAsync({
            id: payment.id,
            ...(depositAccountId && { depositAccountId }),
          });
          toast.success(`Verified — money receipt ${result.receiptNo}`);
          onDone();
        } catch (apiError) {
          setError(apiError.message);
        }
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="depositAccountId">Deposited to</Label>
        <Select value={depositAccountId} onValueChange={setChosen}>
          <SelectTrigger id="depositAccountId" className="w-full">
            <SelectValue placeholder="Loading accounts…" />
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
    </FormDialog>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

export default function PaymentDetailScreen() {
  const { id } = useParams();
  const can = useCan();
  const { user: me } = useAuth();
  const { data: payment, isLoading, error } = collections.useItem(id);
  const [dialog, setDialog] = useState(null); // verify | reject | reverse

  const enteredByMe = payment?.enteredBy?.id === me.id;
  const canVerify =
    payment?.status === "PENDING" && can("collection.verify") && (!enteredByMe || me.isSuperAdmin);

  return (
    <RequirePermission permission="collection.view">
      <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
        <Link href="/collections">
          <ArrowLeft /> All collections
        </Link>
      </Button>
      {error ? (
        <p className="text-destructive text-sm">
          {error.status === 404
            ? "This payment doesn't exist or isn't in your access scope."
            : error.message}
        </p>
      ) : isLoading ? (
        <Skeleton className="h-80" />
      ) : (
        <>
          <PageHeader
            title={`${formatBDT(payment.amount)} from ${payment.customer.fullName}`}
            description={`${payment.receiptNo ? `${payment.receiptNo} · ` : ""}${payment.paymentNo} · paid ${formatDateOnly(payment.paidOn)} by ${PAYMENT_METHODS[payment.method].toLowerCase()}`}
            actions={
              <>
                <StatusBadge tone={PAYMENT_STATUS[payment.status].tone}>
                  {PAYMENT_STATUS[payment.status].label}
                </StatusBadge>
                {payment.status === "VERIFIED" && (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/receipts/${payment.id}`} target="_blank">
                      <Printer /> Money receipt
                    </Link>
                  </Button>
                )}
              </>
            }
          />
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="space-y-6">
              {payment.status === "PENDING" && can("collection.verify") && (
                <Card className="border-amber-500/40">
                  <CardHeader>
                    <CardTitle>Check and verify</CardTitle>
                    <CardDescription>
                      {enteredByMe && !me.isSuperAdmin
                        ? "You entered this payment, so someone else in accounts must verify it."
                        : "Verify once the money is in the cash box or bank account. This issues the money receipt and applies it to the schedule."}
                    </CardDescription>
                  </CardHeader>
                  {canVerify && (
                    <CardContent className="flex flex-wrap gap-2">
                      <Button onClick={() => setDialog("verify")}>
                        <BadgeCheck /> Verify
                      </Button>
                      <Button variant="outline" onClick={() => setDialog("reject")}>
                        <X /> Reject
                      </Button>
                    </CardContent>
                  )}
                </Card>
              )}
              <Card>
                <CardHeader>
                  <CardTitle>Amount</CardTitle>
                  <CardDescription>{payment.amountInWords}</CardDescription>
                </CardHeader>
                <CardContent>
                  {payment.allocations.length ? (
                    <dl className="space-y-2 text-sm">
                      {payment.allocations.map((a) => (
                        <Row
                          key={a.installment.number}
                          label={`${installmentLabel(a.installment)} · due ${formatDateOnly(a.installment.dueDate)}`}
                        >
                          <span className="tabular-nums">{formatBDT(a.amount)}</span>
                        </Row>
                      ))}
                    </dl>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      {payment.status === "PENDING"
                        ? "Applied to the schedule (oldest first) when verified."
                        : "Not applied to the schedule."}
                    </p>
                  )}
                  {payment.status === "REVERSED" && (
                    <p className="text-destructive mt-3 text-sm">
                      Reversed {formatDateTime(payment.reversedAt)}: “{payment.reverseReason}”. The
                      installments owe this money again.
                    </p>
                  )}
                  {payment.status === "REJECTED" && (
                    <p className="text-destructive mt-3 text-sm">
                      Rejected: “{payment.rejectReason}”
                    </p>
                  )}
                </CardContent>
              </Card>
              {payment.status === "VERIFIED" && can("collection.reverse") && (
                <Button variant="outline" onClick={() => setDialog("reverse")}>
                  <Undo2 /> Reverse (bounced cheque, mistake)
                </Button>
              )}
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2 text-sm">
                  <Row label="Customer">
                    <Link href={`/customers/${payment.customer.id}`} className="underline">
                      {payment.customer.fullName}
                    </Link>
                  </Row>
                  <Row label="Mobile">{formatMobile(payment.customer.mobile)}</Row>
                  <Row label="Booking">
                    <Link href={`/bookings/${payment.booking.id}`} className="underline">
                      {payment.booking.bookingNo}
                    </Link>
                  </Row>
                  <Row label="Plot">
                    {payment.booking.plot.code} · {payment.booking.project.name}
                  </Row>
                  <Row label="Paid by">{PAYMENT_METHODS[payment.method]}</Row>
                  {payment.reference && <Row label="Reference">{payment.reference}</Row>}
                  {payment.bankName && <Row label="Bank">{payment.bankName}</Row>}
                  {payment.chequeDate && (
                    <Row label="Cheque date">{formatDateOnly(payment.chequeDate)}</Row>
                  )}
                  {payment.note && <Row label="Note">{payment.note}</Row>}
                  {payment.depositAccount && (
                    <Row label="Deposited to">
                      {payment.depositAccount.code} {payment.depositAccount.name}
                    </Row>
                  )}
                  {payment.journal.length > 0 && (
                    <Row label="Posted as">
                      {payment.journal.map((j, i) => (
                        <span key={j.id}>
                          {i > 0 && ", "}
                          <Link href={`/accounts/journals/${j.id}`} className="underline">
                            {j.entryNo}
                          </Link>
                          {j.kind === "REVERSAL" && " (reversal)"}
                        </span>
                      ))}
                    </Row>
                  )}
                  <Row label="Entered by">{payment.enteredBy?.name ?? "—"}</Row>
                  {payment.verifiedBy && (
                    <Row label={payment.status === "REJECTED" ? "Rejected by" : "Verified by"}>
                      {payment.verifiedBy.name} · {formatDateTime(payment.verifiedAt)}
                    </Row>
                  )}
                </dl>
              </CardContent>
            </Card>
          </div>
          {dialog === "verify" && <VerifyDialog payment={payment} onDone={() => setDialog(null)} />}
          {dialog === "reject" && (
            <ReasonDialog
              title="Reject this entry?"
              description="It won't count. Enter it again with the right details if needed."
              label="Reject"
              action="reject"
              payment={payment}
              onDone={() => setDialog(null)}
            />
          )}
          {dialog === "reverse" && (
            <ReasonDialog
              title={`Reverse ${payment.receiptNo}?`}
              description="The money comes off the installments it paid; they are owed again."
              label="Reverse"
              action="reverse"
              payment={payment}
              onDone={() => setDialog(null)}
            />
          )}
        </>
      )}
    </RequirePermission>
  );
}
