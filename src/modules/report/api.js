"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { http } from "@/lib/api-client";

const useReport = (name, params, options = {}) =>
  useQuery({
    queryKey: ["reports", name, params],
    queryFn: () => http.get(`/reports/${name}`, params),
    placeholderData: keepPreviousData,
    ...options,
  });

/** This month, 12-month booked vs collected, receivables aging (dashboard). */
export const useOverview = ({ enabled = true } = {}) =>
  useQuery({
    queryKey: ["reports", "overview"],
    queryFn: () => http.get("/reports/overview").then((res) => res.data),
    enabled,
    refetchInterval: 60_000,
  });

export const useSalesReport = (params) => useReport("sales", params, { select: (res) => res.data });
export const useCollectionReport = (params) =>
  useReport("collections", params, { select: (res) => res.data });
/** { data: { rows, totals }, meta } */
export const useOutstandingReport = (params) => useReport("outstanding", params);

export const useCustomerStatement = (id) =>
  useQuery({
    queryKey: ["reports", "statement", id],
    queryFn: () => http.get(`/reports/customers/${id}/statement`).then((res) => res.data),
    enabled: Boolean(id),
  });
