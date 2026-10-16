"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import FormDialog from "@/components/common/form-dialog";
import FormField, { applyApiErrors } from "@/components/common/form-field";
import ResourceSelect from "@/components/common/resource-select";
import { roles, users } from "../api";

const schema = z.object({
  username: z
    .string()
    .trim()
    .regex(/^[a-zA-Z0-9._-]{3,50}$/, "3–50 characters: letters, digits, dot, dash or underscore"),
  roleId: z.string().min(1, "Choose a role"),
  email: z.string(),
  mobile: z.string(),
});

/** "Rahim Uddin" → "rahim.uddin" */
export const suggestUsername = (fullName = "") =>
  fullName
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .join(".");

/**
 * Creates an ERP login. With `employee`, the login is linked to that employee (email and mobile
 * default to the employee's). Calls onCreated({ username, password }) with the one-time password.
 */
export default function CreateLoginDialog({ open, onOpenChange, employee, onCreated }) {
  const create = users.useCreate();
  const [error, setError] = useState(null);
  const form = useForm({
    resolver: zodResolver(schema),
    values: { username: suggestUsername(employee?.fullName), roleId: "", email: "", mobile: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const user = await create.mutateAsync({
        username: values.username,
        roleId: values.roleId,
        ...(employee
          ? { employeeId: employee.id }
          : { email: values.email, mobile: values.mobile }),
      });
      onOpenChange(false);
      onCreated({ username: user.username, password: user.temporaryPassword });
    } catch (apiError) {
      if (!applyApiErrors(apiError, form.setError, ["username", "roleId", "email", "mobile"])) {
        setError(apiError.message);
      }
    }
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={employee ? `Create login for ${employee.fullName}` : "New user account"}
      description="A temporary password is generated; the user sets their own at first sign-in."
      onSubmit={onSubmit}
      submitting={form.formState.isSubmitting}
      error={error}
      submitLabel="Create login"
    >
      <FormField control={form.control} name="username" label="Username" autoComplete="off" />
      <FormField
        control={form.control}
        name="roleId"
        label="Role"
        description="Decides what they can see and do. You can only assign roles below your own."
        render={(field, invalid) => (
          <ResourceSelect
            id="roleId"
            resource={roles}
            params={{ sortBy: "level", sortOrder: "desc" }}
            value={field.value}
            onChange={field.onChange}
            invalid={invalid}
          />
        )}
      />
      {!employee && (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField control={form.control} name="email" label="Email" type="email" />
          <FormField
            control={form.control}
            name="mobile"
            label="Mobile"
            placeholder="01711-000000"
          />
        </div>
      )}
    </FormDialog>
  );
}
