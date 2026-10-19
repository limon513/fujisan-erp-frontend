"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@/lib/api-client";
import { createResource } from "@/lib/resource";

export const roles = createResource("/roles");

export const usePermissionCatalog = () =>
  useQuery({
    queryKey: ["roles", "permission-catalog"],
    queryFn: () => http.get("/roles/permission-catalog").then((res) => res.data),
    staleTime: 10 * 60_000,
  });

/** PUT /roles/:id/permissions with the complete [{ key, scope }] set. */
export function useSetRolePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, permissions }) =>
      http.put(`/roles/${id}/permissions`, { permissions }).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries(),
  });
}
