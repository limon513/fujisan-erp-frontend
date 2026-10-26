"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@/lib/api-client";
import { createResource } from "@/lib/resource";

export const paymentPlans = createResource("/payment-plans");
export const bookings = createResource("/bookings");
export const collections = createResource("/collections");
export const installments = createResource("/installments");
export const cancellations = createResource("/cancellations");
export const transfers = createResource("/transfers");

/** Replaces the unpaid parts of an approved refund: [{ dueDate, amount }]. */
export function useRefundSchedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, parts }) =>
      http.put(`/cancellations/${id}/refund-schedule`, { parts }).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

/** Paid so far, still to pay and the next part, for a cancellation with its refund parts. */
export function refundTotals(c) {
  const parts = c.refundParts ?? [];
  const paid = parts.filter((p) => p.status === "PAID").reduce((t, p) => t + Number(p.amount), 0);
  return {
    paid,
    due: c.status === "APPROVED" ? Number(c.refundAmount) - paid : 0,
    next: parts.find((p) => p.status === "DUE") ?? null,
    count: parts.length,
  };
}

/** Uploads a signed transfer agreement (image or PDF); returns the file id. */
export async function uploadAgreement(file) {
  const form = new FormData();
  form.append("file", file);
  form.append("category", "AGREEMENT");
  return (await http.upload("/files", form)).data.id;
}

/** Swaps the agreement of a transfer that still waits for approval. */
export function useReplaceAgreement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file }) =>
      http.put(`/transfers/${id}/agreement`, { fileId: await uploadAgreement(file) }),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

/** The plan's transfer fee for a booking and what has been paid on it. */
export const useTransferQuote = (bookingId, { enabled = true } = {}) =>
  useQuery({
    queryKey: ["transfers", "quote", bookingId],
    queryFn: () => http.get("/transfers/quote", { bookingId }).then((res) => res.data),
    enabled: Boolean(bookingId) && enabled,
    retry: false,
  });

/** What cancelling a booking would refund (paid − the plan's cancellation charge). */
export const useCancellationQuote = (bookingId, { enabled = true } = {}) =>
  useQuery({
    queryKey: ["cancellations", "quote", bookingId],
    queryFn: () => http.get("/cancellations/quote", { bookingId }).then((res) => res.data),
    enabled: Boolean(bookingId) && enabled,
    retry: false,
  });

/** Overdue, due this month and collected this month. */
export const useEmiSummary = ({ enabled = true } = {}) =>
  useQuery({
    queryKey: ["installments", "summary"],
    queryFn: () => http.get("/installments/summary").then((res) => res.data),
    enabled,
  });

/** Price after discount and the schedule, for the booking form (nothing saved). */
export const useBookingQuote = (input) =>
  useQuery({
    queryKey: ["bookings", "quote", input],
    queryFn: () => http.post("/bookings/quote", input).then((res) => res.data),
    enabled: Boolean(input.customerId && input.plotId && input.paymentPlanId),
    placeholderData: keepPreviousData,
    retry: false,
  });

/** Schedule of a saved plan for a price. */
export const usePlanSchedule = (planId, { price, startDate }) =>
  useQuery({
    queryKey: ["payment-plans", "schedule", planId, price, startDate],
    queryFn: () =>
      http.post(`/payment-plans/${planId}/schedule`, { price, startDate }).then((res) => res.data),
    enabled: Boolean(planId && Number(price) > 0),
    placeholderData: keepPreviousData,
    retry: false,
  });

/** Live preview for terms being edited (not saved yet). */
export const usePreviewSchedule = () =>
  useMutation({
    mutationFn: (body) => http.post("/payment-plans/preview", body).then((res) => res.data),
  });
