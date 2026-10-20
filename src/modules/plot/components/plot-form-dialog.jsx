"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
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
import { projects, useProjectChildren } from "@/modules/project/api";
import { plots } from "../api";
import { FACING_LABELS } from "../constants";

const schema = z.object({
  projectId: z.string().min(1, "Choose a project"),
  blockId: z.string().min(1, "Choose a block"),
  roadId: z.string(),
  plotNumber: z.string().trim().min(1, "Required").max(20),
  areaSqft: z.coerce.number({ error: "Enter the area" }).positive("Enter the area"),
  price: z.coerce.number({ error: "Enter the price" }).nonnegative(),
  facing: z.string(),
  dimensions: z.string(),
  remarks: z.string(),
});

const NONE = "__none__";

function ChildSelect({ projectId, kind, field, invalid, emptyLabel, placeholder }) {
  const { data = [], isLoading } = useProjectChildren(projectId, kind);
  const items = data.filter((item) => item.isActive || item.id === field.value);
  return (
    <Select
      value={field.value || (emptyLabel ? NONE : "")}
      onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
      disabled={!projectId || isLoading}
    >
      <SelectTrigger id={field.name} aria-invalid={invalid} className="w-full">
        <SelectValue placeholder={projectId ? placeholder : "Choose a project first"} />
      </SelectTrigger>
      <SelectContent>
        {emptyLabel && <SelectItem value={NONE}>{emptyLabel}</SelectItem>}
        {items.map((item) => (
          <SelectItem key={item.id} value={item.id}>
            {item.code ? `${item.code} — ${item.name}` : item.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Add a plot (plot = null) or edit its details. Price changes go through ChangePriceDialog. */
export default function PlotFormDialog({ open, onOpenChange, plot, projectId: fixedProjectId }) {
  const create = plots.useCreate();
  const update = plots.useUpdate();
  const [error, setError] = useState(null);
  const isNew = !plot;

  const form = useForm({
    resolver: zodResolver(schema),
    values: plot
      ? {
          projectId: plot.project.id,
          blockId: plot.block.id,
          roadId: plot.road?.id ?? "",
          plotNumber: plot.plotNumber,
          areaSqft: plot.areaSqft,
          price: plot.price,
          facing: plot.facing ?? "",
          dimensions: plot.dimensions ?? "",
          remarks: plot.remarks ?? "",
        }
      : {
          projectId: fixedProjectId ?? "",
          blockId: "",
          roadId: "",
          plotNumber: "",
          areaSqft: "",
          price: "",
          facing: "",
          dimensions: "",
          remarks: "",
        },
  });
  const { control } = form;
  const projectId = useWatch({ control, name: "projectId" });

  const onSubmit = form.handleSubmit(async ({ projectId: pid, price, ...values }) => {
    setError(null);
    const body = { ...values, facing: values.facing || null };
    try {
      if (isNew) await create.mutateAsync({ ...body, projectId: pid, price });
      else await update.mutateAsync({ id: plot.id, ...body });
      toast.success(isNew ? "Plot added" : "Plot updated");
      onOpenChange(false);
    } catch (apiError) {
      if (apiError.status === 409)
        setError("A plot with this block and number already exists in the project.");
      else if (!applyApiErrors(apiError, form.setError, Object.keys(schema.shape)))
        setError(apiError.message);
    }
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isNew ? "New plot" : `Edit plot ${plot.code}`}
      onSubmit={onSubmit}
      submitting={form.formState.isSubmitting}
      error={error}
    >
      {!fixedProjectId && isNew && (
        <FormField
          control={control}
          name="projectId"
          label="Project"
          render={(field, invalid) => (
            <ResourceSelect
              id="projectId"
              resource={projects}
              params={{ isActive: true }}
              value={field.value}
              onChange={(value) => {
                field.onChange(value);
                form.setValue("blockId", "");
                form.setValue("roadId", "");
              }}
              invalid={invalid}
            />
          )}
        />
      )}
      <div className="grid gap-4 sm:grid-cols-[1fr_8rem]">
        <FormField
          control={control}
          name="blockId"
          label="Block"
          render={(field, invalid) => (
            <ChildSelect
              projectId={projectId}
              kind="blocks"
              field={field}
              invalid={invalid}
              placeholder="Select…"
            />
          )}
        />
        <FormField control={control} name="plotNumber" label="Plot number" placeholder="102" />
      </div>
      <FormField
        control={control}
        name="roadId"
        label="Road"
        render={(field, invalid) => (
          <ChildSelect
            projectId={projectId}
            kind="roads"
            field={field}
            invalid={invalid}
            emptyLabel="Not set"
          />
        )}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="areaSqft"
          label="Area (sqft)"
          type="number"
          min={1}
          step="0.01"
        />
        {isNew && (
          <FormField
            control={control}
            name="price"
            label="Price (BDT)"
            type="number"
            min={0}
            step="0.01"
          />
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="facing"
          label="Facing"
          render={(field) => <FacingSelect field={field} />}
        />
        <FormField
          control={control}
          name="dimensions"
          label="Dimensions"
          placeholder="40 × 36 ft"
        />
      </div>
      <FormField control={control} name="remarks" label="Remarks" />
    </FormDialog>
  );
}

function FacingSelect({ field }) {
  return (
    <Select value={field.value || NONE} onValueChange={(v) => field.onChange(v === NONE ? "" : v)}>
      <SelectTrigger id="facing" className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>Not set</SelectItem>
        {Object.entries(FACING_LABELS).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
