"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import FormDialog from "@/components/common/form-dialog";
import FormField, { applyApiErrors } from "@/components/common/form-field";
import ResourceSelect from "@/components/common/resource-select";
import { formatMobile } from "@/lib/format";
import { SwitchField } from "@/modules/organization/components/fields";
import { roles, users } from "../api";

const schema = z.object({
  roleId: z.string().min(1, "Choose a role"),
  email: z.string(),
  mobile: z.string(),
  active: z.boolean(),
});

export default function EditUserDialog({ user, onClose, isSelf }) {
  const update = users.useUpdate();
  const [error, setError] = useState(null);
  const form = useForm({
    resolver: zodResolver(schema),
    values: user && {
      roleId: user.role.id,
      email: user.email ?? "",
      mobile: user.mobile ? formatMobile(user.mobile).replace("-", "") : "",
      active: user.status === "ACTIVE",
    },
  });

  const onSubmit = form.handleSubmit(async ({ active, ...values }) => {
    setError(null);
    try {
      await update.mutateAsync({ id: user.id, ...values, status: active ? "ACTIVE" : "INACTIVE" });
      toast.success("User updated");
      onClose();
    } catch (apiError) {
      if (!applyApiErrors(apiError, form.setError, ["roleId", "email", "mobile"]))
        setError(apiError.message);
    }
  });

  return (
    <FormDialog
      open={Boolean(user)}
      onOpenChange={(open) => !open && onClose()}
      title={`Edit ${user?.username ?? ""}`}
      description={
        user?.employee
          ? `${user.employee.fullName} · ${user.employee.employeeCode}`
          : "Not linked to an employee"
      }
      onSubmit={onSubmit}
      submitting={form.formState.isSubmitting}
      error={error}
    >
      <FormField
        control={form.control}
        name="roleId"
        label="Role"
        description={
          isSelf ? "You can't change your own role." : "Changing the role signs the user out."
        }
        render={(field, invalid) => (
          <ResourceSelect
            id="roleId"
            resource={roles}
            params={{ sortBy: "level", sortOrder: "desc" }}
            value={field.value}
            onChange={field.onChange}
            invalid={invalid}
            disabled={isSelf}
          />
        )}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField control={form.control} name="email" label="Email" type="email" />
        <FormField control={form.control} name="mobile" label="Mobile" />
      </div>
      {!isSelf && (
        <SwitchField
          control={form.control}
          name="active"
          label="Active"
          description="Inactive users can't sign in and are signed out now."
        />
      )}
    </FormDialog>
  );
}
