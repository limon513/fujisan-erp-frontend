"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import FormDialog from "@/components/common/form-dialog";
import FormField, { applyApiErrors } from "@/components/common/form-field";
import ResourceSelect from "@/components/common/resource-select";
import { toDateInput } from "@/lib/format";
import { branches, employees } from "@/modules/organization/api";
import { SwitchField } from "@/modules/organization/components/fields";
import { projects } from "../api";
import { PROJECT_STATUS } from "../constants";

const schema = z.object({
  code: z.string().trim().min(1, "Required").max(20),
  name: z.string().trim().min(2, "At least 2 characters"),
  status: z.string(),
  district: z.string(),
  upazila: z.string(),
  address: z.string(),
  landAreaDecimal: z.string(),
  launchDate: z.string(),
  expectedHandoverDate: z.string(),
  branchId: z.string(),
  projectManagerId: z.string(),
  defaultHoldDays: z.coerce.number().int().min(1, "1–90").max(90, "1–90"),
  description: z.string(),
  isActive: z.boolean(),
});

const EMPTY = {
  code: "",
  name: "",
  status: "ONGOING",
  district: "",
  upazila: "",
  address: "",
  landAreaDecimal: "",
  launchDate: "",
  expectedHandoverDate: "",
  branchId: "",
  projectManagerId: "",
  defaultHoldDays: 7,
  description: "",
  isActive: true,
};

const toFormValues = (p) => ({
  code: p.code,
  name: p.name,
  status: p.status,
  district: p.district ?? "",
  upazila: p.upazila ?? "",
  address: p.address ?? "",
  landAreaDecimal: p.landAreaDecimal ?? "",
  launchDate: toDateInput(p.launchDate),
  expectedHandoverDate: toDateInput(p.expectedHandoverDate),
  branchId: p.branch?.id ?? "",
  projectManagerId: p.projectManager?.id ?? "",
  defaultHoldDays: p.defaultHoldDays,
  description: p.description ?? "",
  isActive: p.isActive,
});

/** Create (project = null) or edit a project. */
export default function ProjectFormDialog({ open, onOpenChange, project, onSaved }) {
  const create = projects.useCreate();
  const update = projects.useUpdate();
  const [error, setError] = useState(null);
  // set on success; handed to onSaved once the close animation has finished
  const [saved, setSaved] = useState(null);
  const form = useForm({
    resolver: zodResolver(schema),
    values: project ? toFormValues(project) : EMPTY,
  });
  const { control } = form;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const result = project
        ? await update.mutateAsync({ id: project.id, ...values })
        : await create.mutateAsync(values);
      toast.success(project ? "Project updated" : "Project created");
      setSaved(result);
      onOpenChange(false);
    } catch (apiError) {
      if (!applyApiErrors(apiError, form.setError, Object.keys(EMPTY))) setError(apiError.message);
    }
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={project ? `Edit ${project.name}` : "New project"}
      onSubmit={onSubmit}
      submitting={form.formState.isSubmitting}
      error={error}
      className="sm:max-w-2xl"
      onClosed={() => {
        if (saved) onSaved?.(saved);
        setSaved(null);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-[9rem_1fr]">
        <FormField
          control={control}
          name="code"
          label="Code"
          placeholder="FCITY"
          className="uppercase"
        />
        <FormField control={control} name="name" label="Project name" placeholder="Fujisan City" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField
          control={control}
          name="status"
          label="Status"
          render={(field) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PROJECT_STATUS).map(([value, { label }]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FormField
          control={control}
          name="landAreaDecimal"
          label="Total land (decimal)"
          inputMode="decimal"
        />
        <FormField
          control={control}
          name="defaultHoldDays"
          label="Default hold (days)"
          type="number"
          min={1}
          max={90}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField control={control} name="district" label="District" placeholder="Dhaka" />
        <FormField control={control} name="upazila" label="Upazila / area" placeholder="Savar" />
      </div>
      <FormField control={control} name="address" label="Address" />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField control={control} name="launchDate" label="Launch date" type="date" />
        <FormField
          control={control}
          name="expectedHandoverDate"
          label="Expected handover"
          type="date"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="branchId"
          label="Branch"
          render={(field) => (
            <ResourceSelect
              id="branchId"
              resource={branches}
              params={{ isActive: true }}
              value={field.value}
              onChange={field.onChange}
              emptyLabel="None"
            />
          )}
        />
        <FormField
          control={control}
          name="projectManagerId"
          label="Project manager"
          render={(field) => (
            <ResourceSelect
              id="projectManagerId"
              resource={employees}
              params={{ sortBy: "fullName", employmentStatus: "ACTIVE" }}
              value={field.value}
              onChange={field.onChange}
              emptyLabel="None"
              getLabel={(e) => `${e.fullName} — ${e.designation.name}`}
            />
          )}
        />
      </div>
      <FormField control={control} name="description" label="Description" />
      <SwitchField
        control={control}
        name="isActive"
        label="Active"
        description="Inactive projects are hidden from sales."
      />
    </FormDialog>
  );
}
