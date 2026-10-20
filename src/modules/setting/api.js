"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@/lib/api-client";

export const settingKeys = { company: ["settings", "company"], branding: ["settings", "branding"] };

/** Public: app + company name for the sign-in page. */
export const useBranding = () =>
  useQuery({
    queryKey: settingKeys.branding,
    queryFn: () => http.get("/settings/branding").then((res) => res.data),
    staleTime: 30 * 60_000,
  });

export const useCompany = (options = {}) =>
  useQuery({
    queryKey: settingKeys.company,
    queryFn: () => http.get("/settings/company").then((res) => res.data),
    staleTime: 10 * 60_000,
    ...options,
  });

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body) => http.patch("/settings/company", body).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });
}
