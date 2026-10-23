"use client";

import { useQuery } from "@tanstack/react-query";
import { http } from "@/lib/api-client";
import { createResource } from "@/lib/resource";

export const leadSources = createResource("/lead-sources");
export const campaigns = createResource("/campaigns");
export const leads = createResource("/leads");

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
