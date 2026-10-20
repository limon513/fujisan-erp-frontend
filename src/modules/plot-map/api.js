"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@/lib/api-client";

export const usePlotMap = (projectId) =>
  useQuery({
    queryKey: ["plots", "map", projectId],
    queryFn: () => http.get("/plots/map", { projectId }).then((res) => res.data),
    enabled: Boolean(projectId),
    // keep holds and statuses fresh while the map is open
    refetchInterval: 60_000,
  });

/** PUT /plots/:id/shape — points: [[x, y], ...] in layout pixels, or null to remove. */
export function useSetPlotShape() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, points }) =>
      http.put(`/plots/${id}/shape`, { points }).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plots"] }),
  });
}
