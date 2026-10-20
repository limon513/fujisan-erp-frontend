"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@/lib/api-client";
import { createResource } from "@/lib/resource";

export const customers = createResource("/customers");

/** Live duplicate check while typing (mobile normalized server-side). */
export function useDuplicateCheck({ mobile, nidNumber, excludeId }) {
  const validMobile = /^(?:\+?88)?01[3-9]\d{8}$/.test((mobile ?? "").replace(/[\s-]/g, ""));
  const validNid = /^(\d{10}|\d{13}|\d{17})$/.test(nidNumber ?? "");
  return useQuery({
    queryKey: [
      "customers",
      "duplicates",
      validMobile ? mobile : null,
      validNid ? nidNumber : null,
      excludeId,
    ],
    queryFn: () =>
      http
        .get("/customers/duplicates", {
          ...(validMobile && { mobile }),
          ...(validNid && { nidNumber }),
          ...(excludeId && { excludeId }),
        })
        .then((res) => res.data),
    enabled: validMobile || validNid,
    staleTime: 30_000,
  });
}

const useCustomerMutation = (mutationFn) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["customers"] }),
  });
};

export const useSaveNominee = (customerId) =>
  useCustomerMutation(({ id, ...body }) =>
    (id
      ? http.patch(`/customers/${customerId}/nominees/${id}`, body)
      : http.post(`/customers/${customerId}/nominees`, body)
    ).then((res) => res.data),
  );

export const useRemoveNominee = (customerId) =>
  useCustomerMutation((id) => http.delete(`/customers/${customerId}/nominees/${id}`));

/** Uploads a file and attaches it to the customer. */
export const useAddDocument = (customerId) =>
  useCustomerMutation(async ({ file, category, onProgress }) => {
    const form = new FormData();
    form.append("file", file);
    form.append(
      "category",
      category === "PHOTO" ? "PHOTO" : category === "NID" ? "NID" : "DOCUMENT",
    );
    form.append("entityType", "Customer");
    form.append("entityId", customerId);
    const uploaded = await http.upload("/files", form, onProgress);
    return http
      .post(`/customers/${customerId}/documents`, { fileId: uploaded.data.id, category })
      .then((res) => res.data);
  });

export const useRemoveDocument = (customerId) =>
  useCustomerMutation((fileId) => http.delete(`/customers/${customerId}/documents/${fileId}`));
