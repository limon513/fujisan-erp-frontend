"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@/lib/api-client";

const KEY = ["notifications"];

/** Unread count for the bell, refreshed every 30 seconds. */
export const useUnreadCount = () =>
  useQuery({
    queryKey: [...KEY, "unread"],
    queryFn: () => http.get("/notifications/unread-count").then((res) => res.data.count),
    refetchInterval: 30_000,
  });

export const useNotifications = (params, { enabled = true } = {}) =>
  useQuery({
    queryKey: [...KEY, "list", params],
    queryFn: () => http.get("/notifications", params),
    placeholderData: keepPreviousData,
    enabled,
  });

const useNotificationMutation = (mutationFn) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
};

export const useMarkRead = () =>
  useNotificationMutation((id) => http.post(`/notifications/${id}/read`));

export const useMarkAllRead = () =>
  useNotificationMutation(() => http.post("/notifications/read-all"));
