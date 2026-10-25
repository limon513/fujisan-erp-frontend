"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ClipboardCheck, Landmark, Undo2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import FormDialog from "@/components/common/form-dialog";
import PageHeader from "@/components/common/page-header";
import RequirePermission from "@/components/common/require-permission";
import StatusBadge from "@/components/common/status-badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  formatBDT,
  formatDateOnly,
  formatDateTime,
  formatMobile,
  formatNumber,
} from "@/lib/format";
import { toastError } from "@/lib/notify";
import { useAuth, useCan } from "@/modules/auth/auth-provider";
import { bookings } from "../api";
import {
  BOOKING_STATUS,
  INSTALLMENT_STATUS,
  PAYMENT_METHODS,
  PAYMENT_STATUS,
  planTerms,
} from "../constants";
import PaymentDialog from "./payment-dialog";

const APPROVAL_TEXT = {
  PENDING: "Waiting for the Sales Manager",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Withdrawn",
};

function Row({ label, children, strong }) {
  return (
    <div className={`flex justify-between gap-4 ${strong ? "border-t pt-2 font-medium" : ""}`}>
      <dt className={strong ? undefined : "text-muted-foreground"}>{label}</dt>
      <dd className="text-right tabular-nums">{children}</dd>
    </div>
  );
}

function Prices({ booking }) {
  const asked = Number(booking.discountRequested);
  const final = Number(booking.discountAmount);
  const changed = booking.status !== "PENDING_APPROVAL" && asked !== final;
  return (
    <dl className="space-y-2 text-sm">
      <Row label="List price">{formatBDT(booking.listPrice)}</Row>
      <Row label="Discount asked">
        {asked ? `−${formatBDT(booking.discountRequested)}` : "None"}
      </Row>
      {booking.discountReason && (
        <p className="text-muted-foreground text-xs">“{booking.discountReason}”</p>
      )}
      {changed && (
        <Row label="Discount approved">
          {final ? `−${formatBDT(booking.discountAmount)}` : "None"}
        </Row>
      )}
      <Row label="Price" strong>
        {formatBDT(booking.netPrice)}
      </Row>
      {Number(booking.interestAmount) > 0 && (
        <Row label="Interest">{formatBDT(booking.interestAmount)}</Row>
      )}
      <Row label="Total payable" strong>
        {formatBDT(booking.totalPayable)}
      </Row>
    </dl>
  );
}

function Schedule({ booking }) {
  if (!booking.installments.length) {
    return (
      <p className="text-muted-foreground text-sm">
        {booking.status === "PENDING_APPROVAL"
          ? "The payment schedule is created when the booking is approved, with the approved discount."
          : "No payment schedule: the booking didn't go ahead."}
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">#</TableHead>
            <TableHead>Due</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="hidden text-right sm:table-cell">Paid</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {booking.installments.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="text-muted-foreground tabular-nums">
                {item.kind === "DOWN_PAYMENT" ? "Down" : item.number}
              </TableCell>
              <TableCell>{formatDateOnly(item.dueDate)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatBDT(item.amount)}</TableCell>
              <TableCell className="hidden text-right tabular-nums sm:table-cell">
                {Number(item.paidAmount) ? formatBDT(item.paidAmount) : "—"}
              </TableCell>
              <TableCell className="text-right">
                <StatusBadge tone={INSTALLMENT_STATUS[item.status].tone}>
                  {INSTALLMENT_STATUS[item.status].label}
                </StatusBadge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function WithdrawDialog({ booking, onDone }) {
  const withdraw = bookings.usePostAction("withdraw");
  const [reason, setReason] = useState("");
  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onDone()}
      title={`Withdraw ${booking.bookingNo}?`}
      description={`Plot ${booking.plot.code} becomes available again.`}
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          await withdraw.mutateAsync({ id: booking.id, reason });
          toast.success("Booking withdrawn");
          onDone();
        } catch (apiError) {
          toastError(apiError);
        }
      }}
      submitting={withdraw.isPending}
      submitLabel="Withdraw"
    >
      <div className="space-y-1.5">
        <Label htmlFor="reason">Why?</Label>
        <Input
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Optional"
        />
      </div>
    </FormDialog>
  );
}

function Balance({ booking }) {
  const b = booking.balance;
  return (
    <dl className="grid grid-cols-2 gap-3 text-sm">
      <div>
        <dt className="text-muted-foreground text-xs">Paid</dt>
        <dd className="text-lg font-semibold tabular-nums">{formatBDT(b.paid)}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground text-xs">Still owed</dt>
        <dd className="text-lg font-semibold tabular-nums">{formatBDT(b.outstanding)}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground text-xs">Overdue</dt>
        <dd
          className={`font-medium tabular-nums ${Number(b.overdue) > 0 ? "text-destructive" : ""}`}
        >
          {Number(b.overdue) > 0 ? `${formatBDT(b.overdue)} (${b.overdueCount})` : "Nothing"}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground text-xs">Late fees</dt>
        <dd className="font-medium tabular-nums">
          {Number(b.lateFees) > 0 ? formatBDT(b.lateFees) : "None"}
        </dd>
      </div>
    </dl>
  );
}

function Payments({ payments }) {
  if (!payments.length) return <p className="text-muted-foreground text-sm">No payments yet.</p>;
  return (
    <ul className="divide-y rounded-lg border text-sm">
      {payments.map((p) => (
        <li key={p.id}>
          <Link
            href={`/collections/${p.id}`}
            className="hover:bg-muted/50 flex items-center gap-3 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium tabular-nums">{formatBDT(p.amount)}</p>
              <p className="text-muted-foreground text-xs">
                {p.receiptNo ?? p.paymentNo} · {formatDateOnly(p.paidOn)} ·{" "}
                {PAYMENT_METHODS[p.method]}
              </p>
            </div>
            <StatusBadge tone={PAYMENT_STATUS[p.status].tone}>
              {PAYMENT_STATUS[p.status].label}
            </StatusBadge>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function RegisterDialog({ booking, onDone }) {
  const register = bookings.usePostAction("register");
  const [deedNo, setDeedNo] = useState("");
  const [registeredOn, setRegisteredOn] = useState(() => new Date().toISOString().slice(0, 10));
  const owed = Number(booking.balance.outstanding);
  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onDone()}
      title={`Register ${booking.bookingNo}?`}
      description={`Plot ${booking.plot.code} becomes Sold.${owed > 0 ? ` ${formatBDT(booking.balance.outstanding)} is still owed; payments continue after registration.` : ""}`}
      submitting={register.isPending}
      submitLabel="Register"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          await register.mutateAsync({ id: booking.id, deedNo, registeredOn });
          toast.success(`${booking.bookingNo} registered — plot ${booking.plot.code} sold`);
          onDone();
        } catch (apiError) {
          toastError(apiError);
        }
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="deedNo">Deed number</Label>
          <Input
            id="deedNo"
            value={deedNo}
            onChange={(e) => setDeedNo(e.target.value)}
            placeholder="1234/2026"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="registeredOn">Registered on</Label>
          <Input
            id="registeredOn"
            type="date"
            value={registeredOn}
            onChange={(e) => setRegisteredOn(e.target.value)}
          />
        </div>
      </div>
    </FormDialog>
  );
}

export default function BookingDetailScreen() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const { data: booking, isLoading, error } = bookings.useItem(id);
  const [withdrawing, setWithdrawing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [registering, setRegistering] = useState(false);
  const can = useCan();

  return (
    <RequirePermission permission="booking.view">
      <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
        <Link href="/bookings">
          <ArrowLeft /> All bookings
        </Link>
      </Button>
      {error ? (
        <p className="text-destructive text-sm">
          {error.status === 404
            ? "This booking doesn't exist or isn't in your access scope."
            : error.message}
        </p>
      ) : isLoading ? (
        <Skeleton className="h-96" />
      ) : (
        <>
          <PageHeader
            title={`${booking.bookingNo} · Plot ${booking.plot.code}`}
            description={`${booking.customer.fullName} · ${booking.project.name} · booked ${formatDateOnly(booking.bookingDate)}${booking.owner ? ` by ${booking.owner.fullName}` : ""}`}
            actions={
              <>
                <StatusBadge tone={BOOKING_STATUS[booking.status].tone}>
                  {BOOKING_STATUS[booking.status].label}
                </StatusBadge>
                {["CONFIRMED", "REGISTERED"].includes(booking.status) &&
                  can("collection.create") &&
                  Number(booking.balance.outstanding) > 0 && (
                    <Button size="sm" onClick={() => setPaying(true)}>
                      <Wallet /> Record payment
                    </Button>
                  )}
                {booking.status === "CONFIRMED" && can("booking.register") && (
                  <Button size="sm" variant="outline" onClick={() => setRegistering(true)}>
                    <Landmark /> Register
                  </Button>
                )}
                {booking.status === "PENDING_APPROVAL" &&
                  (me.isSuperAdmin || me.employee?.id === booking.owner?.id) && (
                    <Button size="sm" variant="outline" onClick={() => setWithdrawing(true)}>
                      <Undo2 /> Withdraw
                    </Button>
                  )}
              </>
            }
          />
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Payment schedule</CardTitle>
                  <CardDescription>
                    {booking.planName} · {planTerms(booking.planTerms).payment}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Schedule booking={booking} />
                </CardContent>
              </Card>
            </div>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Price</CardTitle>
                </CardHeader>
                <CardContent>
                  <Prices booking={booking} />
                </CardContent>
              </Card>
              {booking.installments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Payments</CardTitle>
                    {booking.status === "REGISTERED" && (
                      <CardDescription>
                        Registered {formatDateOnly(booking.registeredOn)}
                        {booking.deedNo && ` · deed ${booking.deedNo}`}
                        {booking.journal.map((j) => (
                          <span key={j.id}>
                            {" · sale posted as "}
                            <Link href={`/accounts/journals/${j.id}`} className="underline">
                              {j.entryNo}
                            </Link>
                          </span>
                        ))}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Balance booking={booking} />
                    <Payments payments={booking.payments} />
                  </CardContent>
                </Card>
              )}
              {booking.approval && (
                <Card>
                  <CardHeader>
                    <CardTitle>Approval</CardTitle>
                    <CardDescription>
                      {booking.approval.requestNo} · {APPROVAL_TEXT[booking.approval.status]}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {booking.confirmedAt && <p>Confirmed {formatDateTime(booking.confirmedAt)}</p>}
                    {booking.closeReason && (
                      <p className="text-muted-foreground">“{booking.closeReason}”</p>
                    )}
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/approvals/${booking.approval.id}`}>
                        <ClipboardCheck /> Open the approval
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}
              <Card>
                <CardHeader>
                  <CardTitle>Customer and plot</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2 text-sm">
                    <Row label="Customer">
                      <Link href={`/customers/${booking.customer.id}`} className="underline">
                        {booking.customer.fullName}
                      </Link>
                    </Row>
                    <Row label="Mobile">{formatMobile(booking.customer.mobile)}</Row>
                    <Row label="Plot">
                      {booking.plot.code}
                      {booking.plot.block && ` · ${booking.plot.block.name}`}
                    </Row>
                    <Row label="Size">{formatNumber(booking.plot.areaSqft)} sqft</Row>
                    {booking.lead && (
                      <Row label="From lead">
                        <Link href={`/crm/leads/${booking.lead.id}`} className="underline">
                          {booking.lead.leadCode}
                        </Link>
                      </Row>
                    )}
                  </dl>
                  <div className="text-muted-foreground mt-4 space-y-1 border-t pt-3 text-xs">
                    <p>{planTerms(booking.planTerms).interest}</p>
                    <p>{planTerms(booking.planTerms).lateFee}</p>
                    <p>{planTerms(booking.planTerms).cancellation}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          {withdrawing && <WithdrawDialog booking={booking} onDone={() => setWithdrawing(false)} />}
          <PaymentDialog open={paying} onOpenChange={setPaying} booking={booking} />
          {registering && <RegisterDialog booking={booking} onDone={() => setRegistering(false)} />}
        </>
      )}
    </RequirePermission>
  );
}
