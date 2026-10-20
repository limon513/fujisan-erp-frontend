"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Ban, CircleCheck, Hand, Unlock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import FormDialog from "@/components/common/form-dialog";
import FormField, { applyApiErrors } from "@/components/common/form-field";
import ResourceSelect from "@/components/common/resource-select";
import { useCan } from "@/modules/auth/auth-provider";
import { customers } from "@/modules/customer/api";
import { employees } from "@/modules/organization/api";
import { plots } from "../api";

const holdSchema = z.object({
  requestedById: z.string().min(1, "Who asked for the hold?"),
  days: z.coerce.number().int().min(1, "1–90").max(90, "1–90"),
  reason: z.string().trim().min(3, "Give a reason"),
  customerId: z.string(),
  prospectName: z.string(),
  prospectMobile: z.string(),
});

const reasonSchema = z.object({ reason: z.string().trim().min(3, "Give a reason") });

function HoldDialog({ plot, open, onOpenChange }) {
  const holdPlot = plots.usePostAction("hold");
  const [error, setError] = useState(null);
  const form = useForm({
    resolver: zodResolver(holdSchema),
    values: {
      requestedById: "",
      days: plot.project.defaultHoldDays ?? 7,
      reason: "",
      customerId: "",
      prospectName: "",
      prospectMobile: "",
    },
  });
  const customerId = useWatch({ control: form.control, name: "customerId" });

  const onSubmit = form.handleSubmit(
    async ({ customerId: chosen, prospectName, prospectMobile, ...values }) => {
      setError(null);
      try {
        await holdPlot.mutateAsync({
          id: plot.id,
          ...values,
          ...(chosen ? { customerId: chosen } : { prospectName, prospectMobile }),
        });
        toast.success(
          `Plot ${plot.code} is on hold for ${values.days} day${values.days === 1 ? "" : "s"}`,
        );
        onOpenChange(false);
      } catch (apiError) {
        if (!applyApiErrors(apiError, form.setError, Object.keys(holdSchema.shape)))
          setError(apiError.message);
      }
    },
  );

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Hold plot ${plot.code}`}
      description="The plot is reserved for the number of days below and released automatically afterwards."
      onSubmit={onSubmit}
      submitting={form.formState.isSubmitting}
      error={error}
      submitLabel="Put on hold"
    >
      <FormField
        control={form.control}
        name="requestedById"
        label="Requested by"
        description="The employee who asked for the hold (e.g. the sales executive with the customer)."
        render={(field, invalid) => (
          <ResourceSelect
            id="requestedById"
            resource={employees}
            params={{ sortBy: "fullName", employmentStatus: "ACTIVE" }}
            value={field.value}
            onChange={field.onChange}
            invalid={invalid}
            getLabel={(e) => `${e.fullName} — ${e.designation.name}`}
          />
        )}
      />
      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <FormField control={form.control} name="days" label="Days" type="number" min={1} max={90} />
        <FormField
          control={form.control}
          name="reason"
          label="Reason"
          placeholder="Customer visiting on Friday"
        />
      </div>
      <FormField
        control={form.control}
        name="customerId"
        label="Customer"
        description="Choose an existing customer, or leave empty and note the prospect below."
        render={(field) => (
          <ResourceSelect
            id="customerId"
            resource={customers}
            params={{ sortBy: "fullName" }}
            value={field.value}
            onChange={field.onChange}
            emptyLabel="Not a customer yet"
            getLabel={(c) => `${c.fullName} (${c.customerCode})`}
          />
        )}
      />
      {!customerId && (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="prospectName"
            label="Prospect name"
            description="Optional"
          />
          <FormField
            control={form.control}
            name="prospectMobile"
            label="Prospect mobile"
            description="Optional"
          />
        </div>
      )}
    </FormDialog>
  );
}

const REASON_ACTIONS = {
  release: {
    title: "Release hold on",
    label: "Release",
    success: "Hold released",
    placeholder: "Customer chose another plot",
  },
  block: {
    title: "Block plot",
    label: "Block",
    success: "Plot blocked",
    placeholder: "Land dispute, reserved for owner, …",
  },
  unblock: {
    title: "Unblock plot",
    label: "Unblock",
    success: "Plot unblocked",
    placeholder: "Issue resolved",
  },
};

function ReasonDialog({ plot, action, onClose }) {
  const config = REASON_ACTIONS[action];
  const run = plots.usePostAction(action ?? "release");
  const [error, setError] = useState(null);
  const form = useForm({ resolver: zodResolver(reasonSchema), values: { reason: "" } });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await run.mutateAsync({ id: plot.id, ...values });
      toast.success(`${config.success}: ${plot.code}`);
      onClose();
    } catch (apiError) {
      if (!applyApiErrors(apiError, form.setError, ["reason"])) setError(apiError.message);
    }
  });

  return (
    <FormDialog
      open={Boolean(action)}
      onOpenChange={(open) => !open && onClose()}
      title={config ? `${config.title} ${plot.code}` : ""}
      onSubmit={onSubmit}
      submitting={form.formState.isSubmitting}
      error={error}
      submitLabel={config?.label}
    >
      <FormField
        control={form.control}
        name="reason"
        label="Reason"
        placeholder={config?.placeholder}
      />
    </FormDialog>
  );
}

/** Hold / release / block / unblock buttons for the plot detail sheet (permission-aware). */
export default function PlotStatusActions({ plot }) {
  const can = useCan();
  const [holding, setHolding] = useState(false);
  const [action, setAction] = useState(null);

  return (
    <>
      {can("plot.hold") && plot.status === "AVAILABLE" && (
        <Button size="sm" onClick={() => setHolding(true)}>
          <Hand /> Hold
        </Button>
      )}
      {can("plot.hold") && plot.status === "HOLD" && (
        <Button size="sm" variant="outline" onClick={() => setAction("release")}>
          <CircleCheck /> Release hold
        </Button>
      )}
      {can("plot.block") && plot.status === "AVAILABLE" && (
        <Button size="sm" variant="outline" onClick={() => setAction("block")}>
          <Ban /> Block
        </Button>
      )}
      {can("plot.block") && plot.status === "BLOCKED" && (
        <Button size="sm" variant="outline" onClick={() => setAction("unblock")}>
          <Unlock /> Unblock
        </Button>
      )}
      <HoldDialog plot={plot} open={holding} onOpenChange={setHolding} />
      <ReasonDialog plot={plot} action={action} onClose={() => setAction(null)} />
    </>
  );
}
