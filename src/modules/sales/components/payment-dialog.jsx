"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FormDialog from "@/components/common/form-dialog";
import FormField, { applyApiErrors } from "@/components/common/form-field";
import ResourceSelect from "@/components/common/resource-select";
import { formatBDT, toDateInput } from "@/lib/format";
import { bookings, collections } from "../api";
import { BOOKING_STATUS, PAYMENT_METHODS } from "../constants";

const NEEDS_REFERENCE = {
  CHEQUE: "Cheque number",
  BKASH: "Transaction id",
  NAGAD: "Transaction id",
  BANK_TRANSFER: "Transaction / reference",
  CARD: "Approval code",
};

const schema = z
  .object({
    bookingId: z.string().min(1, "Choose the booking"),
    amount: z
      .string()
      .trim()
      .refine((v) => /^\d+(\.\d{1,2})?$/.test(v) && Number(v) > 0, "Enter the amount"),
    method: z.enum(Object.keys(PAYMENT_METHODS)),
    reference: z.string().max(80),
    bankName: z.string().max(80),
    chequeDate: z.string(),
    paidOn: z.string().min(1, "When was it paid?"),
    note: z.string().max(500),
  })
  .refine((v) => v.method === "CASH" || v.method === "CARD" || v.reference.trim(), {
    message: "Enter the reference",
    path: ["reference"],
  });

const FIELDS = [
  "bookingId",
  "amount",
  "method",
  "reference",
  "bankName",
  "chequeDate",
  "paidOn",
  "note",
];

/**
 * Enter a payment (it waits for verification by accounts).
 * `booking` fixes the booking ({ id, bookingNo, customer }); `amount` suggests what is owed.
 */
export default function PaymentDialog({ booking, amount, open, onOpenChange, onSaved }) {
  const create = collections.useCreate();
  const [error, setError] = useState(null);
  // Handed to onSaved after the close animation (navigating mid-close blocks the page)
  const [saved, setSaved] = useState(null);
  const form = useForm({
    resolver: zodResolver(schema),
    values: {
      bookingId: booking?.id ?? "",
      amount: amount ? String(Number(amount)) : "",
      method: "CASH",
      reference: "",
      bankName: "",
      chequeDate: "",
      paidOn: toDateInput(new Date().toISOString()),
      note: "",
    },
  });
  const method = useWatch({ control: form.control, name: "method" });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const payment = await create.mutateAsync({ ...values, amount: Number(values.amount) });
      toast.success(
        `${payment.paymentNo}: ${formatBDT(payment.amount)} entered — waiting for verification`,
      );
      setSaved(payment);
      onOpenChange(false);
    } catch (apiError) {
      if (!applyApiErrors(apiError, form.setError, FIELDS)) setError(apiError.message);
    }
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Record a payment"
      description={
        booking
          ? `${booking.bookingNo} · ${booking.customer.fullName}. Accounts verify it before it counts.`
          : "Accounts verify it before it counts."
      }
      onSubmit={onSubmit}
      submitting={form.formState.isSubmitting}
      error={error}
      submitLabel="Enter payment"
      onClosed={
        onSaved
          ? () => {
              if (saved) onSaved(saved);
              setSaved(null);
            }
          : undefined
      }
    >
      {!booking && (
        <FormField
          control={form.control}
          name="bookingId"
          label="Booking"
          render={(field, invalid) => (
            <ResourceSelect
              id="bookingId"
              resource={bookings}
              params={{ sortBy: "createdAt", sortOrder: "desc" }}
              value={field.value}
              onChange={field.onChange}
              invalid={invalid}
              getLabel={(b) =>
                `${b.bookingNo} · ${b.customer.fullName} · ${b.plot.code} (${BOOKING_STATUS[b.status].label})`
              }
            />
          )}
        />
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField control={form.control} name="amount" label="Amount (৳)" inputMode="decimal" />
        <FormField control={form.control} name="paidOn" label="Paid on" type="date" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="method"
          label="Paid by"
          render={(field) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="method" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PAYMENT_METHODS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {method !== "CASH" && (
          <FormField control={form.control} name="reference" label={NEEDS_REFERENCE[method]} />
        )}
      </div>
      {(method === "CHEQUE" || method === "BANK_TRANSFER") && (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="bankName"
            label="Bank"
            placeholder="City Bank, Gulshan"
          />
          {method === "CHEQUE" && (
            <FormField control={form.control} name="chequeDate" label="Cheque date" type="date" />
          )}
        </div>
      )}
      <FormField control={form.control} name="note" label="Note" description="Optional" />
    </FormDialog>
  );
}
