"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@/lib/api-client";

export const useMySessions = () =>
  useQuery({
    queryKey: ["me", "sessions"],
    queryFn: () => http.get("/auth/sessions").then((res) => res.data),
  });

export const useMyLoginHistory = (page) =>
  useQuery({
    queryKey: ["me", "login-history", page],
    queryFn: () => http.get("/auth/login-history", { page, limit: 10 }),
    placeholderData: keepPreviousData,
  });

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => http.delete(`/auth/sessions/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });
}
