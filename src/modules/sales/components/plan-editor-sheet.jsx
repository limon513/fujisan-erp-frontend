"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import FormField, { applyApiErrors } from "@/components/common/form-field";
import ResourceSelect from "@/components/common/resource-select";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { toDateInput } from "@/lib/format";
import { SwitchField } from "@/modules/organization/components/fields";
import { projects } from "@/modules/project/api";
import { paymentPlans, usePreviewSchedule } from "../api";
import { FREQUENCIES } from "../constants";
import ScheduleView from "./schedule-view";

const amount = z
  .string()
  .trim()
  .refine((v) => /^\d+(\.\d{1,2})?$/.test(v), "A number, up to 2 decimals");
const whole = (max) =>
  z
    .string()
    .trim()
    .refine((v) => /^\d+$/.test(v) && Number(v) <= max, `0–${max}`);

const schema = z
  .object({
    name: z.string().trim().min(2, "Name the plan").max(80),
    description: z.string().max(300),
    projectId: z.string(),
    isActive: z.boolean(),
    downPaymentType: z.enum(["FIXED", "PERCENT"]),
    downPaymentValue: amount,
    installmentCount: whole(360),
    frequency: z.enum(["MONTHLY", "QUARTERLY", "YEARLY"]),
    interestRate: amount,
    gracePeriodDays: whole(365),
    lateFeeType: z.enum(["FIXED", "PERCENT"]),
    lateFeeValue: amount,
    cancellationChargeType: z.enum(["FIXED", "PERCENT"]),
    cancellationChargeValue: amount,
    transferFeeType: z.enum(["FIXED", "PERCENT"]),
    transferFeeValue: amount,
  })
  .superRefine((v, ctx) => {
    for (const key of ["downPayment", "lateFee", "cancellationCharge", "transferFee"]) {
      if (v[`${key}Type`] === "PERCENT" && Number(v[`${key}Value`]) > 100) {
        ctx.addIssue({ code: "custom", path: [`${key}Value`], message: "At most 100%" });
      }
    }
    if (Number(v.interestRate) > 100) {
      ctx.addIssue({ code: "custom", path: ["interestRate"], message: "At most 100%" });
    }
    const full = v.downPaymentType === "PERCENT" && Number(v.downPaymentValue) === 100;
    if (Number(v.installmentCount) === 0 && !full) {
      ctx.addIssue({
        code: "custom",
        path: ["installmentCount"],
        message: "Without installments the down payment must be 100%",
      });
    }
  });

const DEFAULTS = {
  name: "",
  description: "",
  projectId: "",
  isActive: true,
  downPaymentType: "PERCENT",
  downPaymentValue: "20",
  installmentCount: "24",
  frequency: "MONTHLY",
  interestRate: "0",
  gracePeriodDays: "7",
  lateFeeType: "FIXED",
  lateFeeValue: "500",
  cancellationChargeType: "PERCENT",
  cancellationChargeValue: "10",
  transferFeeType: "FIXED",
  transferFeeValue: "0",
};

const TERMS = [
  "downPaymentType",
  "downPaymentValue",
  "installmentCount",
  "frequency",
  "interestRate",
  "gracePeriodDays",
  "lateFeeType",
  "lateFeeValue",
  "cancellationChargeType",
  "cancellationChargeValue",
  "transferFeeType",
  "transferFeeValue",
];

const num = (v) => String(Number(v));

const toValues = (plan) =>
  plan
    ? {
        name: plan.name,
        description: plan.description ?? "",
        projectId: plan.project?.id ?? "",
        isActive: plan.isActive,
        downPaymentType: plan.downPaymentType,
        downPaymentValue: num(plan.downPaymentValue),
        installmentCount: String(plan.installmentCount),
        frequency: plan.frequency,
        interestRate: num(plan.interestRate),
        gracePeriodDays: String(plan.gracePeriodDays),
        lateFeeType: plan.lateFeeType,
        lateFeeValue: num(plan.lateFeeValue),
        cancellationChargeType: plan.cancellationChargeType,
        cancellationChargeValue: num(plan.cancellationChargeValue),
        transferFeeType: plan.transferFeeType,
        transferFeeValue: num(plan.transferFeeValue),
      }
    : DEFAULTS;

const toBody = (values) => ({
  ...values,
  downPaymentValue: Number(values.downPaymentValue),
  installmentCount: Number(values.installmentCount),
  interestRate: Number(values.interestRate),
  gracePeriodDays: Number(values.gracePeriodDays),
  lateFeeValue: Number(values.lateFeeValue),
  cancellationChargeValue: Number(values.cancellationChargeValue),
  transferFeeValue: Number(values.transferFeeValue),
});

/** ৳ / % switch plus the value, for down payment, late fee, cancellation charge and transfer fee. */
function ChargeField({ control, typeName, valueName, label, percentOf }) {
  const type = useWatch({ control, name: typeName });
  return (
    <div className="grid grid-cols-[auto_1fr] items-start gap-2">
      <FormField
        control={control}
        name={typeName}
        label={label}
        render={(field) => (
          <ToggleGroup
            type="single"
            variant="outline"
            value={field.value}
            onValueChange={(v) => v && field.onChange(v)}
            aria-label={`${label}: amount or percentage`}
          >
            <ToggleGroupItem value="PERCENT">%</ToggleGroupItem>
            <ToggleGroupItem value="FIXED">৳</ToggleGroupItem>
          </ToggleGroup>
        )}
      />
      <FormField
        control={control}
        name={valueName}
        label={type === "PERCENT" ? `% of ${percentOf}` : "Amount (৳)"}
        inputMode="decimal"
      />
    </div>
  );
}

/** Create or edit a payment plan, with a live schedule for a sample price. */
export default function PlanEditorSheet({ plan, open, onOpenChange }) {
  const create = paymentPlans.useCreate();
  const update = paymentPlans.useUpdate();
  const preview = usePreviewSchedule();
  const [error, setError] = useState(null);
  const [samplePrice, setSamplePrice] = useState("5000000");
  const [startDate, setStartDate] = useState(() => toDateInput(new Date().toISOString()));
  const form = useForm({ resolver: zodResolver(schema), values: toValues(plan) });
  const { control } = form;
  const installmentCount = useWatch({ control, name: "installmentCount" });

  // Recalculate the preview shortly after the terms or the sample price change
  const watched = useWatch({ control, name: TERMS });
  const terms = Object.fromEntries(TERMS.map((key, i) => [key, watched[i]]));
  const request = useDebouncedValue(JSON.stringify({ terms, samplePrice, startDate }), 350);
  const { mutate } = preview;
  useEffect(() => {
    if (!open) return;
    const { terms: t, samplePrice: price, startDate: date } = JSON.parse(request);
    if (!schema.safeParse({ ...DEFAULTS, name: "preview", ...t }).success || !(Number(price) > 0))
      return;
    mutate({
      ...toBody({ ...DEFAULTS, ...t }),
      price: Number(price),
      ...(date && { startDate: date }),
    });
  }, [request, open, mutate]);

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const body = toBody(values);
      if (plan) await update.mutateAsync({ id: plan.id, ...body });
      else await create.mutateAsync(body);
      toast.success(plan ? "Plan updated" : `"${values.name}" created`);
      onOpenChange(false);
    } catch (apiError) {
      if (!applyApiErrors(apiError, form.setError, Object.keys(DEFAULTS)))
        setError(apiError.message);
    }
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-5xl">
        <form onSubmit={onSubmit} noValidate className="flex h-full min-h-0 flex-col">
          <SheetHeader className="border-b">
            <SheetTitle>{plan ? `Edit ${plan.name}` : "New payment plan"}</SheetTitle>
          </SheetHeader>
          <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:overflow-hidden">
            <div className="space-y-8 p-4 lg:overflow-y-auto">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <FieldSet>
                <FieldLegend>Plan</FieldLegend>
                <FieldGroup>
                  <FormField
                    control={control}
                    name="name"
                    label="Name"
                    placeholder="24 months, 20% down"
                  />
                  <FormField
                    control={control}
                    name="projectId"
                    label="Offered for"
                    render={(field) => (
                      <ResourceSelect
                        id="projectId"
                        resource={projects}
                        value={field.value}
                        onChange={field.onChange}
                        emptyLabel="Every project"
                      />
                    )}
                  />
                  <FormField
                    control={control}
                    name="description"
                    label="Note"
                    description="Optional"
                  />
                  <SwitchField
                    control={control}
                    name="isActive"
                    label="Offered"
                    description="Switched-off plans can't be chosen at booking."
                  />
                </FieldGroup>
              </FieldSet>
              <FieldSet>
                <FieldLegend>Payments</FieldLegend>
                <FieldGroup>
                  <ChargeField
                    control={control}
                    typeName="downPaymentType"
                    valueName="downPaymentValue"
                    label="Down payment"
                    percentOf="the price"
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={control}
                      name="installmentCount"
                      label="Installments"
                      inputMode="numeric"
                      description="0 = full payment at booking"
                    />
                    {Number(installmentCount) > 0 && (
                      <FormField
                        control={control}
                        name="frequency"
                        label="Every"
                        render={(field) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id="frequency" className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(FREQUENCIES).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label === "Monthly"
                                    ? "Month"
                                    : label === "Quarterly"
                                      ? "Quarter (3 months)"
                                      : "Year"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    )}
                  </div>
                  <FormField
                    control={control}
                    name="interestRate"
                    label="Interest (% a year)"
                    inputMode="decimal"
                    description="Flat, on the amount left after the down payment. 0 = none."
                  />
                </FieldGroup>
              </FieldSet>
              <FieldSet>
                <FieldLegend>Late payment, cancellation and transfer</FieldLegend>
                <FieldGroup>
                  <FormField
                    control={control}
                    name="gracePeriodDays"
                    label="Grace period (days)"
                    inputMode="numeric"
                    description="Days after the due date before the late fee applies."
                  />
                  <ChargeField
                    control={control}
                    typeName="lateFeeType"
                    valueName="lateFeeValue"
                    label="Late fee"
                    percentOf="the installment"
                  />
                  <ChargeField
                    control={control}
                    typeName="cancellationChargeType"
                    valueName="cancellationChargeValue"
                    label="Cancellation charge"
                    percentOf="the amount paid"
                  />
                  <ChargeField
                    control={control}
                    typeName="transferFeeType"
                    valueName="transferFeeValue"
                    label="Ownership transfer fee"
                    percentOf="the net price"
                  />
                </FieldGroup>
              </FieldSet>
            </div>

            <aside className="bg-muted/30 space-y-4 border-t p-4 lg:overflow-y-auto lg:border-t-0 lg:border-l">
              <div>
                <p className="font-medium">Preview</p>
                <p className="text-muted-foreground text-sm">
                  What a customer would pay under these terms.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="samplePrice">Plot price (৳)</Label>
                  <Input
                    id="samplePrice"
                    inputMode="decimal"
                    value={samplePrice}
                    onChange={(e) => setSamplePrice(e.target.value.replace(/[^\d.]/g, ""))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="startDate">Booking date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
              </div>
              {preview.error ? (
                <p className="text-destructive text-sm">{preview.error.message}</p>
              ) : preview.data ? (
                <ScheduleView schedule={preview.data} />
              ) : (
                <Skeleton className="h-64" />
              )}
            </aside>
          </div>
          <SheetFooter className="flex-row justify-end border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Spinner />}
              {plan ? "Save changes" : "Create plan"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
