"use client";

import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import FormField, { applyApiErrors } from "@/components/common/form-field";
import ResourceSelect from "@/components/common/resource-select";
import { roles } from "@/modules/role/api";
import { users } from "@/modules/user/api";
import { workflows } from "../api";
import { APPROVER_TYPES } from "../constants";

const MAX_STEPS = 10;

const limit = (max) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d+(\.\d{1,2})?$/.test(v) && Number(v) <= max), {
      message: max === 100 ? "0–100, up to 2 decimals" : "A number, up to 2 decimals",
    });

const stepSchema = z
  .object({
    name: z.string().trim().min(2, "Name the step").max(60),
    approverType: z.enum(Object.keys(APPROVER_TYPES)),
    approverRoleId: z.string(),
    approverUserId: z.string(),
    sameBranch: z.boolean(),
    maxPercent: limit(100),
    maxAmount: limit(1e12),
  })
  .superRefine((step, ctx) => {
    if (step.approverType === "ROLE" && !step.approverRoleId)
      ctx.addIssue({ code: "custom", path: ["approverRoleId"], message: "Choose a role" });
    if (step.approverType === "USER" && !step.approverUserId)
      ctx.addIssue({ code: "custom", path: ["approverUserId"], message: "Choose a person" });
  });

const schema = z.object({ steps: z.array(stepSchema).max(MAX_STEPS) });

const NEW_STEP = {
  name: "",
  approverType: "ROLE",
  approverRoleId: "",
  approverUserId: "",
  sameBranch: false,
  maxPercent: "",
  maxAmount: "",
};

const toForm = (workflow) => ({
  steps: workflow.steps.map((step) => ({
    name: step.name,
    approverType: step.approverType,
    approverRoleId: step.approverRole?.id ?? "",
    approverUserId: step.approverUser?.id ?? "",
    sameBranch: step.sameBranch,
    maxPercent: step.maxPercent == null ? "" : String(Number(step.maxPercent)),
    maxAmount: step.maxAmount == null ? "" : String(Number(step.maxAmount)),
  })),
});

const toBody = ({ steps }) => ({
  steps: steps.map((step) => ({
    name: step.name,
    approverType: step.approverType,
    approverRoleId: step.approverType === "ROLE" ? step.approverRoleId : null,
    approverUserId: step.approverType === "USER" ? step.approverUserId : null,
    sameBranch: step.approverType === "ROLE" && step.sameBranch,
    maxPercent: step.maxPercent,
    maxAmount: step.maxAmount,
  })),
});

function StepFields({ form, index, count, onMove, onRemove }) {
  const prefix = `steps.${index}`;
  const type = useWatch({ control: form.control, name: `${prefix}.approverType` });
  return (
    <li className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <span className="bg-muted flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium">
          {index + 1}
        </span>
        <p className="flex-1 text-sm font-medium">Step {index + 1}</p>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Move up"
          disabled={index === 0}
          onClick={() => onMove(index, index - 1)}
        >
          <ArrowUp />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Move down"
          disabled={index === count - 1}
          onClick={() => onMove(index, index + 1)}
        >
          <ArrowDown />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Remove step"
          onClick={() => onRemove(index)}
        >
          <Trash2 />
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name={`${prefix}.name`}
          label="Step name"
          placeholder="e.g. Sales Manager"
        />
        <FormField
          control={form.control}
          name={`${prefix}.approverType`}
          label="Who approves"
          render={(field, invalid) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id={field.name} aria-invalid={invalid} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(APPROVER_TYPES).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {type === "ROLE" && (
          <FormField
            control={form.control}
            name={`${prefix}.approverRoleId`}
            label="Role"
            render={(field, invalid) => (
              <ResourceSelect
                id={field.name}
                resource={roles}
                params={{ sortBy: "level", sortOrder: "desc" }}
                value={field.value}
                onChange={field.onChange}
                invalid={invalid}
              />
            )}
          />
        )}
        {type === "ROLE" && (
          <FormField
            control={form.control}
            name={`${prefix}.sameBranch`}
            label="Branch"
            render={(field) => (
              <div className="flex h-9 items-center gap-2">
                <Checkbox
                  id={field.name}
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
                <Label htmlFor={field.name} className="font-normal">
                  Only from the requester&apos;s branch
                </Label>
              </div>
            )}
          />
        )}
        {type === "USER" && (
          <FormField
            control={form.control}
            name={`${prefix}.approverUserId`}
            label="Person"
            render={(field, invalid) => (
              <ResourceSelect
                id={field.name}
                resource={users}
                params={{ sortBy: "username", sortOrder: "asc", status: "ACTIVE" }}
                value={field.value}
                onChange={field.onChange}
                invalid={invalid}
                getLabel={(u) =>
                  u.employee ? `${u.employee.fullName} (${u.username})` : u.username
                }
              />
            )}
          />
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name={`${prefix}.maxPercent`}
          label="Final step up to (%)"
          inputMode="decimal"
          placeholder="No limit"
        />
        <FormField
          control={form.control}
          name={`${prefix}.maxAmount`}
          label="Final step up to (৳)"
          inputMode="decimal"
          placeholder="No limit"
        />
      </div>
    </li>
  );
}

/** Edits a workflow's approval chain (replaces all steps). */
export default function WorkflowEditorSheet({ workflow, open, onOpenChange }) {
  const update = workflows.useUpdate();
  const [error, setError] = useState(null);
  const form = useForm({
    resolver: zodResolver(schema),
    values: workflow ? toForm(workflow) : { steps: [] },
  });
  const { fields, append, remove, move } = useFieldArray({ control: form.control, name: "steps" });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await update.mutateAsync({ id: workflow.id, ...toBody(values) });
      toast.success(`Approval chain for ${workflow.name} saved`);
      onOpenChange(false);
    } catch (apiError) {
      const paths = values.steps.flatMap((_, i) =>
        Object.keys(NEW_STEP).map((key) => `steps.${i}.${key}`),
      );
      if (!applyApiErrors(apiError, form.setError, paths)) setError(apiError.message);
    }
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-2xl">
        <form onSubmit={onSubmit} noValidate className="flex h-full flex-col">
          <SheetHeader className="border-b">
            <SheetTitle>{workflow?.name} approval chain</SheetTitle>
            <SheetDescription>
              Steps are asked in order. A step with a limit is the last one needed when the request
              is within it; steps without a limit are always asked. Requests already waiting keep
              their old chain.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {fields.length ? (
              <ol className="space-y-3">
                {fields.map((field, index) => (
                  <StepFields
                    key={field.id}
                    form={form}
                    index={index}
                    count={fields.length}
                    onMove={move}
                    onRemove={remove}
                  />
                ))}
              </ol>
            ) : (
              <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
                No steps: requests are approved as soon as they&apos;re made.
              </p>
            )}
            {fields.length < MAX_STEPS && (
              <Button type="button" variant="outline" onClick={() => append(NEW_STEP)}>
                <Plus /> Add step
              </Button>
            )}
          </div>
          <SheetFooter className="flex-row justify-end border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Spinner />}
              Save chain
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
