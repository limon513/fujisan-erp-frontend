"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@/lib/api-client";
import { createResource } from "@/lib/resource";

export const projects = createResource("/projects");

/** Nested blocks / roads of a project: kind = "blocks" | "roads" */
export function useProjectChildren(projectId, kind) {
  return useQuery({
    queryKey: ["projects", projectId, kind],
    queryFn: () => http.get(`/projects/${projectId}/${kind}`).then((res) => res.data),
    enabled: Boolean(projectId),
  });
}

export function useSaveProjectChild(projectId, kind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }) =>
      (id
        ? http.patch(`/projects/${projectId}/${kind}/${id}`, body)
        : http.post(`/projects/${projectId}/${kind}`, body)
      ).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}

export function useRemoveProjectChild(projectId, kind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => http.delete(`/projects/${projectId}/${kind}/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}

/** Uploads an image and sets it as the project's layout. */
export function useSetLayout(projectId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, onProgress }) => {
      const form = new FormData();
      form.append("file", file);
      form.append("category", "LAYOUT");
      form.append("entityType", "Project");
      form.append("entityId", projectId);
      const uploaded = await http.upload("/files", form, onProgress);
      return http
        .put(`/projects/${projectId}/layout`, { fileId: uploaded.data.id })
        .then((res) => res.data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  });
}
