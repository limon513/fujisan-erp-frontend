import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { http } from "@/lib/api-client";

const clean = (params) =>
  Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== "" && v != null && v !== "all"),
  );

export const auditLogKeys = {
  list: (params) => ["audit-logs", "list", params],
  detail: (id) => ["audit-logs", "detail", id],
  options: ["audit-logs", "filter-options"],
};

export const useAuditLogs = (params) =>
  useQuery({
    queryKey: auditLogKeys.list(params),
    queryFn: () => http.get("/audit-logs", clean(params)),
    placeholderData: keepPreviousData,
  });

export const useAuditEntry = (id) =>
  useQuery({
    queryKey: auditLogKeys.detail(id),
    queryFn: () => http.get(`/audit-logs/${id}`).then((res) => res.data),
    enabled: Boolean(id),
  });

export const useAuditFilterOptions = () =>
  useQuery({
    queryKey: auditLogKeys.options,
    queryFn: () => http.get("/audit-logs/filter-options").then((res) => res.data),
    staleTime: 5 * 60_000,
  });
