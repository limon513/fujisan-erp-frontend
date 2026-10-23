"use client";

import { useQuery } from "@tanstack/react-query";
import { http } from "@/lib/api-client";

export const useDashboard = () =>
  useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => http.get("/dashboard/summary").then((res) => res.data),
    refetchInterval: 60_000,
  });
