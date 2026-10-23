"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CircleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import FormField, { applyApiErrors } from "@/components/common/form-field";
import ResourceSelect from "@/components/common/resource-select";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { toDateInput, toMobileInput } from "@/lib/format";
import { useAuth } from "@/modules/auth/auth-provider";
import { employees } from "@/modules/organization/api";
import { customers, useDuplicateCheck } from "../api";
import DuplicateWarning from "./duplicate-warning";

const FIELDS = {
  fullName: "",
  fatherName: "",
  motherName: "",
  spouseName: "",
  dateOfBirth: "",
  gender: "",
  profession: "",
  organization: "",
  mobile: "",
  altMobile: "",
  email: "",
  nidNumber: "",
  passportNumber: "",
  tin: "",
  presentAddress: "",
  permanentAddress: "",
  notes: "",
  ownerId: "",
};

const schema = z.object({
  ...Object.fromEntries(Object.keys(FIELDS).map((key) => [key, z.string()])),
  fullName: z.string().trim().min(2, "Enter the customer's name"),
  mobile: z.string().trim().min(11, "Enter a mobile number"),
});

const toValues = (c) => ({
  ...Object.fromEntries(Object.keys(FIELDS).map((key) => [key, c[key] ?? ""])),
  dateOfBirth: toDateInput(c.dateOfBirth),
  mobile: toMobileInput(c.mobile),
  altMobile: toMobileInput(c.altMobile),
  ownerId: c.owner?.id ?? "",
});

const NONE = "__none__";

/**
 * Add (customer = null) or edit a customer. onSaved(customer) after a create.
 * `initial` prefills a new customer (e.g. from a lead: { fullName, mobile, email, owner, ... }).
 */
export default function CustomerFormSheet({ open, onOpenChange, customer, initial, onSaved }) {
  const { user: me } = useAuth();
  const create = customers.useCreate();
  const update = customers.useUpdate();
  const [error, setError] = useState(null);
  const [confirmMobile, setConfirmMobile] = useState(false);
  const [mobileConflict, setMobileConflict] = useState(false);
  // handed to onSaved once the sheet's close animation has finished (see FormDialog.onClosed)
  const [saved, setSaved] = useState(null);
  const isNew = !customer;
  // Assigning another owner needs customer access wider than OWN (mirrors the API)
  const canAssign =
    me.isSuperAdmin ||
    (me.permissions["customer.create"] && me.permissions["customer.create"] !== "OWN");

  const form = useForm({
    resolver: zodResolver(schema),
    values: customer ? toValues(customer) : initial ? toValues({ ...FIELDS, ...initial }) : FIELDS,
  });
  const { control } = form;
  const [mobile, nidNumber] = useWatch({ control, name: ["mobile", "nidNumber"] });
  const debouncedMobile = useDebouncedValue(mobile, 400);
  const debouncedNid = useDebouncedValue(nidNumber, 400);
  const { data: matches } = useDuplicateCheck({
    mobile: customer && toMobileInput(customer.mobile) === debouncedMobile ? "" : debouncedMobile,
    nidNumber: customer && customer.nidNumber === debouncedNid ? "" : debouncedNid,
    excludeId: customer?.id,
  });
  const nidTaken = matches?.some((m) => m.matchedOn.includes("nidNumber"));
  const mobileShared = mobileConflict || matches?.some((m) => m.matchedOn.includes("mobile"));

  const onSubmit = form.handleSubmit(async ({ ownerId, ...values }) => {
    setError(null);
    const body = {
      ...values,
      gender: values.gender || null,
      ...(canAssign && { ownerId: ownerId || null }),
      ...(confirmMobile && { confirmDuplicateMobile: true }),
    };
    try {
      const result = isNew
        ? await create.mutateAsync(body)
        : await update.mutateAsync({ id: customer.id, ...body });
      toast.success(
        isNew ? `${result.fullName} added as ${result.customerCode}` : "Customer updated",
      );
      if (isNew) setSaved(result);
      onOpenChange(false);
    } catch (apiError) {
      if (apiError.status === 409 && apiError.errors[0]?.path === "mobile") setMobileConflict(true);
      if (!applyApiErrors(apiError, form.setError, Object.keys(FIELDS))) setError(apiError.message);
    }
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-3xl"
        onCloseAutoFocus={(event) => {
          if (!saved) return;
          event.preventDefault();
          onSaved?.(saved);
          setSaved(null);
        }}
      >
        <form onSubmit={onSubmit} noValidate className="flex h-full flex-col">
          <SheetHeader className="border-b">
            <SheetTitle>{isNew ? "New customer" : `Edit ${customer.fullName}`}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 space-y-8 overflow-y-auto p-4">
            {error && (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <FieldSet>
              <FieldLegend>Contact & identity</FieldLegend>
              <FieldGroup>
                <FormField control={control} name="fullName" label="Full name (as on NID)" />
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField
                    control={control}
                    name="mobile"
                    label="Mobile"
                    placeholder="01811-000000"
                  />
                  <FormField control={control} name="altMobile" label="Alternative mobile" />
                  <FormField control={control} name="email" label="Email" type="email" />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField
                    control={control}
                    name="nidNumber"
                    label="NID number"
                    inputMode="numeric"
                    description="10, 13 or 17 digits"
                  />
                  <FormField control={control} name="passportNumber" label="Passport" />
                  <FormField control={control} name="tin" label="e-TIN" inputMode="numeric" />
                </div>
                <DuplicateWarning matches={matches} />
                {mobileShared && !nidTaken && (
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={confirmMobile}
                      onCheckedChange={(v) => setConfirmMobile(Boolean(v))}
                    />
                    It&apos;s a different person sharing this mobile (e.g. a family member) — save
                    anyway
                  </label>
                )}
              </FieldGroup>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Personal</FieldLegend>
              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField control={control} name="fatherName" label="Father's name" />
                  <FormField control={control} name="motherName" label="Mother's name" />
                  <FormField control={control} name="spouseName" label="Spouse's name" />
                </div>
                <div className="grid gap-4 sm:grid-cols-4">
                  <FormField
                    control={control}
                    name="dateOfBirth"
                    label="Date of birth"
                    type="date"
                  />
                  <FormField
                    control={control}
                    name="gender"
                    label="Gender"
                    render={(field) => (
                      <Select
                        value={field.value || NONE}
                        onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                      >
                        <SelectTrigger id="gender" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Not set</SelectItem>
                          <SelectItem value="MALE">Male</SelectItem>
                          <SelectItem value="FEMALE">Female</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FormField control={control} name="profession" label="Profession" />
                  <FormField control={control} name="organization" label="Organization" />
                </div>
              </FieldGroup>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Address</FieldLegend>
              <FieldGroup>
                <FormField control={control} name="presentAddress" label="Present address" />
                <FormField control={control} name="permanentAddress" label="Permanent address" />
              </FieldGroup>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Other</FieldLegend>
              <FieldGroup>
                {canAssign && (
                  <FormField
                    control={control}
                    name="ownerId"
                    label="Responsible employee"
                    description="The salesperson who looks after this customer. Leave empty to take it yourself."
                    render={(field) => (
                      <ResourceSelect
                        id="ownerId"
                        resource={employees}
                        params={{ sortBy: "fullName", employmentStatus: "ACTIVE" }}
                        value={field.value}
                        onChange={field.onChange}
                        emptyLabel="Me"
                        getLabel={(e) => `${e.fullName} — ${e.designation.name}`}
                      />
                    )}
                  />
                )}
                <FormField control={control} name="notes" label="Notes" />
              </FieldGroup>
            </FieldSet>
          </div>

          <SheetFooter className="flex-row justify-end border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting || nidTaken || (mobileShared && !confirmMobile)}
            >
              {form.formState.isSubmitting && <Spinner />}
              {isNew ? "Add customer" : "Save changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
