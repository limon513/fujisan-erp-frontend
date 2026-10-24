"use client";

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { http } from "@/lib/api-client";
import { createResource } from "@/lib/resource";

export const paymentPlans = createResource("/payment-plans");

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
