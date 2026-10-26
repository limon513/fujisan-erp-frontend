"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@/lib/api-client";
import { cleanParams, createResource } from "@/lib/resource";

export const accounts = createResource("/accounts");
export const journals = createResource("/journals");

/** The chart (plain array, by code). `balances` adds each account's balance. */
export const useAccounts = (params = {}, options = {}) =>
  useQuery({
    queryKey: ["accounts", "chart", params],
    queryFn: () => http.get("/accounts", cleanParams(params)).then((res) => res.data),
    placeholderData: keepPreviousData,
    ...options,
  });

export const useLedger = (id, params) =>
  useQuery({
    queryKey: ["accounts", "ledger", id, params],
    queryFn: () => http.get(`/accounts/${id}/ledger`, cleanParams(params)).then((res) => res.data),
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
  });

export const useTrialBalance = (params) =>
  useQuery({
    queryKey: ["accounts", "trial-balance", params],
    queryFn: () => http.get("/accounts/trial-balance", cleanParams(params)).then((res) => res.data),
    placeholderData: keepPreviousData,
  });

export const useFiscalYears = () =>
  useQuery({
    queryKey: ["fiscal-years"],
    queryFn: () => http.get("/fiscal-years").then((res) => res.data),
  });

export function useFiscalYearAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }) =>
      http.post(`/fiscal-years/${id}/${action}`).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}

/** Where money of each method lands by default (mirrors the backend). */
export const DEPOSIT_KEYS = {
  CASH: "CASH",
  BANK_TRANSFER: "BANK",
  CHEQUE: "BANK",
  CARD: "BANK",
  BKASH: "BKASH",
  NAGAD: "NAGAD",
};

/**
 * Cash, bank and mobile accounts (those under the same groups as the seeded money accounts),
 * and the default one for a payment method.
 */
export function useMoneyAccounts(method) {
  const { data: assets = [] } = useAccounts({ postable: true, type: "ASSET" });
  const parents = new Set(
    assets
      .filter((a) => ["CASH", "BANK", "BKASH", "NAGAD"].includes(a.systemKey))
      .map((a) => a.parentId),
  );
  const options = assets.filter((a) => parents.has(a.parentId));
  const fallback = options.find((a) => a.systemKey === DEPOSIT_KEYS[method])?.id ?? "";
  return { options, fallback };
}
