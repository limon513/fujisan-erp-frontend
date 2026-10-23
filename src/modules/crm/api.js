"use client";

import { useQuery } from "@tanstack/react-query";
import { http } from "@/lib/api-client";
import { createResource } from "@/lib/resource";

export const leadSources = createResource("/lead-sources");
export const campaigns = createResource("/campaigns");
export const leads = createResource("/leads");
export const followUps = createResource("/follow-ups");
export const siteVisits = createResource("/site-visits");

/** { overdue, today, upcoming } follow-ups (mine = assigned to me). */
export const useFollowUpCounts = ({ mine = false, enabled = true } = {}) =>
  useQuery({
    queryKey: ["follow-ups", "counts", mine],
    queryFn: () => http.get("/follow-ups/counts", mine ? { mine: true } : {}).then((r) => r.data),
    enabled,
    refetchInterval: 60_000,
  });

/** { today, upcoming, missed } site visits. */
export const useVisitCounts = ({ mine = false, enabled = true } = {}) =>
  useQuery({
    queryKey: ["site-visits", "counts", mine],
    queryFn: () => http.get("/site-visits/counts", mine ? { mine: true } : {}).then((r) => r.data),
    enabled,
    refetchInterval: 60_000,
  });

/** Live duplicate check while typing: other leads and customers with this mobile/email. */
export function useLeadDuplicates({ mobile, email, excludeId }) {
  const validMobile = /^(?:\+?88)?01[3-9]\d{8}$/.test((mobile ?? "").replace(/[\s-]/g, ""));
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email ?? "");
  return useQuery({
    queryKey: [
      "leads",
      "duplicates",
      validMobile ? mobile : null,
      validEmail ? email : null,
      excludeId,
    ],
    queryFn: () =>
      http
        .get("/leads/duplicates", {
          ...(validMobile && { mobile }),
          ...(validEmail && { email }),
          ...(excludeId && { excludeId }),
        })
        .then((res) => res.data),
    enabled: validMobile || validEmail,
    staleTime: 30_000,
  });
}

/** Employees I may assign leads to (needs lead.assign). */
export const useAssignees = (enabled = true) =>
  useQuery({
    queryKey: ["leads", "assignees"],
    queryFn: () => http.get("/leads/assignees").then((res) => res.data),
    enabled,
    staleTime: 5 * 60_000,
  });
