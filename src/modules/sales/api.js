"use client";

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { http } from "@/lib/api-client";
import { createResource } from "@/lib/resource";

export const paymentPlans = createResource("/payment-plans");
export const bookings = createResource("/bookings");
export const collections = createResource("/collections");
export const installments = createResource("/installments");
export const cancellations = createResource("/cancellations");

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
