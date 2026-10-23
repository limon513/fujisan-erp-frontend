"use client";

import { useQuery } from "@tanstack/react-query";
import { http } from "@/lib/api-client";
import { createResource } from "@/lib/resource";

/** All requests in scope (approval.view); also detail + approve/reject/cancel actions. */
export const approvals = createResource("/approvals");
export const inbox = createResource("/approvals/inbox");
export const myRequests = createResource("/approvals/mine");
export const workflows = createResource("/approvals/workflows");

/** Requests waiting for me, for the sidebar badge and the dashboard. */
export const useInboxCount = () =>
  useQuery({
    queryKey: ["approvals", "inbox-count"],
    queryFn: () => http.get("/approvals/inbox/count").then((res) => res.data.count),
    refetchInterval: 60_000,
  });

/** Workflows aren't paginated: GET returns a plain array. */
export const useWorkflows = () =>
  useQuery({
    queryKey: ["approvals/workflows", "all"],
    queryFn: () => http.get("/approvals/workflows").then((res) => res.data),
  });
