"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@/lib/api-client";

/** Drops empty filter values ("", null, "all") before sending query params. */
export const cleanParams = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== "" && v != null && v !== "all"),
  );

/**
 * React Query hooks for a REST resource with the standard API shape.
 *
 *   export const branches = createResource("/branches");
 *   const { data } = branches.useList({ page: 1 });       // { data: [...], meta }
 *   const create = branches.useCreate(); create.mutateAsync(body)
 *
 * Mutations refresh every cached query: org data is interlinked (counts, names in other lists),
 * and an ERP screen is cheap to refetch.
 */
export function createResource(path) {
  const key = path.replace(/^\//, "");
  const keys = {
    all: [key],
    list: (params) => [key, "list", params],
    detail: (id) => [key, "detail", id],
  };

  const useList = (params = {}, options = {}) =>
    useQuery({
      queryKey: keys.list(params),
      queryFn: () => http.get(path, cleanParams(params)),
      placeholderData: keepPreviousData,
      ...options,
    });

  const useItem = (id, options = {}) =>
    useQuery({
      queryKey: keys.detail(id),
      queryFn: () => http.get(`${path}/${id}`).then((res) => res.data),
      enabled: Boolean(id),
      ...options,
    });

  const useAction = (mutationFn) => {
    const queryClient = useQueryClient();
    return useMutation({ mutationFn, onSuccess: () => queryClient.invalidateQueries() });
  };

  return {
    path,
    keys,
    useList,
    useItem,
    useCreate: () => useAction((body) => http.post(path, body).then((res) => res.data)),
    useUpdate: () =>
      useAction(({ id, ...body }) => http.patch(`${path}/${id}`, body).then((res) => res.data)),
    useRemove: () => useAction((id) => http.delete(`${path}/${id}`)),
    /** Custom POST action, e.g. useAction("reset-password") → POST /users/:id/reset-password */
    usePostAction: (action) =>
      useAction(({ id, ...body }) =>
        http.post(`${path}/${id}/${action}`, body).then((res) => res.data),
      ),
  };
}
