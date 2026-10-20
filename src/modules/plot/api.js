"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import api, { http } from "@/lib/api-client";
import { createResource } from "@/lib/resource";

export const plots = createResource("/plots");

/** POST /plots/import — dryRun previews, otherwise creates. */
export function useImportPlots() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, file, dryRun }) => {
      const form = new FormData();
      form.append("file", file);
      return http
        .upload(`/plots/import?projectId=${projectId}&dryRun=${dryRun}`, form)
        .then((res) => res.data);
    },
    onSuccess: (_data, { dryRun }) => !dryRun && queryClient.invalidateQueries(),
  });
}

/** Downloads the CSV template (needs the auth header, so it can't be a plain link). */
export async function downloadImportTemplate() {
  const res = await api.get("/plots/import-template", { responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const link = Object.assign(document.createElement("a"), {
    href: url,
    download: "plots-import-template.csv",
  });
  link.click();
  URL.revokeObjectURL(url);
}
