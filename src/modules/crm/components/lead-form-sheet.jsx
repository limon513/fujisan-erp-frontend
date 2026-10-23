"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CircleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import FormField, { applyApiErrors } from "@/components/common/form-field";
import ResourceSelect from "@/components/common/resource-select";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { toDateTimeInput, toMobileInput } from "@/lib/format";
import { useAuth } from "@/modules/auth/auth-provider";
import { projects } from "@/modules/project/api";
import { campaigns, leads, leadSources, useAssignees, useLeadDuplicates } from "../api";
import { LEAD_STATUS } from "../constants";

const FIELDS = {
  fullName: "",
  mobile: "",
  altMobile: "",
  email: "",
  location: "",
  profession: "",
  sourceId: "",
  campaignId: "",
  preferredProjectId: "",
  propertyType: "",
  budgetMin: "",
  budgetMax: "",
  nextFollowUpAt: "",
  notes: "",
};

const amount = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d+(\.\d{1,2})?$/.test(v), "A number, up to 2 decimals");

const schema = z
  .object({
    ...Object.fromEntries(Object.keys(FIELDS).map((key) => [key, z.string()])),
    fullName: z.string().trim().min(2, "Enter the name"),
    mobile: z.string().trim().min(11, "Enter a mobile number"),
    email: z.union([z.literal(""), z.email("Not a valid email")]),
    sourceId: z.string().min(1, "Choose where the lead came from"),
    budgetMin: amount,
    budgetMax: amount,
    owner: z.string(),
  })
  .refine((v) => !v.budgetMin || !v.budgetMax || Number(v.budgetMin) <= Number(v.budgetMax), {
    message: "Lower than the minimum",
    path: ["budgetMax"],
  });

const SELF = "__self__";
const POOL = "__pool__";

const toValues = (lead) => ({
  ...Object.fromEntries(Object.keys(FIELDS).map((key) => [key, lead[key] ?? ""])),
  mobile: toMobileInput(lead.mobile),
  altMobile: toMobileInput(lead.altMobile),
  sourceId: lead.source?.id ?? "",
  campaignId: lead.campaign?.id ?? "",
  preferredProjectId: lead.preferredProject?.id ?? "",
  budgetMin: lead.budgetMin == null ? "" : String(Number(lead.budgetMin)),
  budgetMax: lead.budgetMax == null ? "" : String(Number(lead.budgetMax)),
  nextFollowUpAt: toDateTimeInput(lead.nextFollowUpAt),
  owner: SELF,
});

/** Other leads/customers with this mobile or email, shown while typing. */
function Duplicates({ matches }) {
  if (!matches || (!matches.leads.length && !matches.customers.length)) return null;
  return (
    <Alert>
      <CircleAlert />
      <AlertTitle>This person may already be known</AlertTitle>
      <AlertDescription>
        <ul className="mt-1 space-y-1">
          {matches.leads.map((lead) => (
            <li key={lead.id}>
              Lead{" "}
              <Link
                href={`/crm/leads/${lead.id}`}
                className="font-medium underline"
                target="_blank"
              >
                {lead.leadCode} {lead.fullName}
              </Link>{" "}
              · {LEAD_STATUS[lead.status].label} ·{" "}
              {lead.ownerName ? `with ${lead.ownerName}` : "unassigned"} (same{" "}
              {lead.matchedOn.join(" and ")})
            </li>
          ))}
          {matches.customers.map((customer) => (
            <li key={customer.id}>
              Customer{" "}
              <span className="font-medium">
                {customer.customerCode} {customer.fullName}
              </span>
              {customer.ownerName && ` · with ${customer.ownerName}`} (same{" "}
              {customer.matchedOn.join(" and ")})
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

/** Add (lead = null) or edit a lead. onSaved(lead) runs after the sheet has closed. */
export default function LeadFormSheet({ open, onOpenChange, lead, onSaved }) {
  const { user: me } = useAuth();
  const create = leads.useCreate();
  const update = leads.useUpdate();
  const [error, setError] = useState(null);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);
  const [saved, setSaved] = useState(null);
  const isNew = !lead;
  const canAssign = me.isSuperAdmin || Boolean(me.permissions["lead.assign"]);

  const form = useForm({
    resolver: zodResolver(schema),
    values: lead ? toValues(lead) : { ...FIELDS, owner: me.employee ? SELF : POOL },
  });
  const { control } = form;
  const [mobile, email, sourceId] = useWatch({ control, name: ["mobile", "email", "sourceId"] });
  const debouncedMobile = useDebouncedValue(mobile, 400);
  const debouncedEmail = useDebouncedValue(email, 400);
  const { data: matches } = useLeadDuplicates({
    mobile: lead && toMobileInput(lead.mobile) === debouncedMobile ? "" : debouncedMobile,
    email: lead && lead.email === debouncedEmail ? "" : debouncedEmail,
    excludeId: lead?.id,
  });
  const duplicateLead = Boolean(matches?.leads.length);

  const onSubmit = form.handleSubmit(async ({ owner, nextFollowUpAt, ...values }) => {
    setError(null);
    const body = {
      ...values,
      nextFollowUpAt: nextFollowUpAt ? new Date(nextFollowUpAt).toISOString() : null,
      ...(confirmDuplicate && { confirmDuplicate: true }),
      ...(isNew &&
        canAssign &&
        (owner === POOL ? { unassigned: true } : owner !== SELF && { ownerId: owner })),
    };
    try {
      const result = isNew
        ? await create.mutateAsync(body)
        : await update.mutateAsync({ id: lead.id, ...body });
      toast.success(isNew ? `${result.fullName} added as ${result.leadCode}` : "Lead updated");
      if (isNew) setSaved(result);
      onOpenChange(false);
    } catch (apiError) {
      if (!applyApiErrors(apiError, form.setError, Object.keys(FIELDS))) setError(apiError.message);
    }
  });

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setError(null);
          setConfirmDuplicate(false);
        }
        onOpenChange(next);
      }}
    >
      <SheetContent
        className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-2xl"
        onCloseAutoFocus={(event) => {
          if (!saved) return;
          event.preventDefault();
          onSaved?.(saved);
          setSaved(null);
        }}
      >
        <form onSubmit={onSubmit} noValidate className="flex h-full flex-col">
          <SheetHeader className="border-b">
            <SheetTitle>{isNew ? "New lead" : `Edit ${lead.fullName}`}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 space-y-8 overflow-y-auto p-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <FieldSet>
              <FieldLegend>Contact</FieldLegend>
              <FieldGroup>
                <FormField control={control} name="fullName" label="Name" autoComplete="off" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={control}
                    name="mobile"
                    label="Mobile"
                    inputMode="tel"
                    placeholder="01XXXXXXXXX"
                  />
                  <FormField
                    control={control}
                    name="altMobile"
                    label="Other mobile"
                    inputMode="tel"
                    description="Optional"
                  />
                </div>
                <FormField
                  control={control}
                  name="email"
                  label="Email"
                  type="email"
                  description="Optional"
                />
                <Duplicates matches={matches} />
                {duplicateLead && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="confirmDuplicate"
                      checked={confirmDuplicate}
                      onCheckedChange={(checked) => setConfirmDuplicate(checked === true)}
                    />
                    <Label htmlFor="confirmDuplicate" className="font-normal">
                      It&apos;s a new enquiry: add it anyway (linked to the earlier lead)
                    </Label>
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={control}
                    name="location"
                    label="Lives in"
                    placeholder="Uttara, Dhaka"
                  />
                  <FormField control={control} name="profession" label="Profession" />
                </div>
              </FieldGroup>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Where it came from</FieldLegend>
              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={control}
                    name="sourceId"
                    label="Source"
                    render={(field, invalid) => (
                      <ResourceSelect
                        id="sourceId"
                        resource={leadSources}
                        params={{ sortBy: "sortOrder", sortOrder: "asc", isActive: true }}
                        value={field.value}
                        onChange={field.onChange}
                        invalid={invalid}
                      />
                    )}
                  />
                  <FormField
                    control={control}
                    name="campaignId"
                    label="Campaign"
                    render={(field) => (
                      <ResourceSelect
                        id="campaignId"
                        resource={campaigns}
                        params={{ isActive: true, ...(sourceId && { sourceId }) }}
                        value={field.value}
                        onChange={field.onChange}
                        emptyLabel="No campaign"
                      />
                    )}
                  />
                </div>
              </FieldGroup>
            </FieldSet>

            <FieldSet>
              <FieldLegend>What they want</FieldLegend>
              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={control}
                    name="preferredProjectId"
                    label="Interested in"
                    render={(field) => (
                      <ResourceSelect
                        id="preferredProjectId"
                        resource={projects}
                        value={field.value}
                        onChange={field.onChange}
                        emptyLabel="No project yet"
                      />
                    )}
                  />
                  <FormField
                    control={control}
                    name="propertyType"
                    label="Property type"
                    placeholder="Residential plot"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={control}
                    name="budgetMin"
                    label="Budget from (৳)"
                    inputMode="decimal"
                  />
                  <FormField
                    control={control}
                    name="budgetMax"
                    label="Budget up to (৳)"
                    inputMode="decimal"
                  />
                </div>
              </FieldGroup>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Follow-up</FieldLegend>
              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={control}
                    name="nextFollowUpAt"
                    label="Next follow-up"
                    type="datetime-local"
                  />
                  {isNew && canAssign && (
                    <FormField
                      control={control}
                      name="owner"
                      label="Assign to"
                      render={(field) => (
                        <OwnerSelect field={field} hasEmployee={Boolean(me.employee)} />
                      )}
                    />
                  )}
                </div>
                <FormField
                  control={control}
                  name="notes"
                  label="Notes"
                  render={(field) => <Textarea id="notes" rows={3} {...field} />}
                />
              </FieldGroup>
            </FieldSet>
          </div>

          <SheetFooter className="flex-row justify-end border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting || (duplicateLead && !confirmDuplicate)}
            >
              {form.formState.isSubmitting && <Spinner />}
              {isNew ? "Add lead" : "Save changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

/** Me / the pool / an employee. */
function OwnerSelect({ field, hasEmployee }) {
  const { data = [] } = useAssignees();
  return (
    <Select value={field.value} onValueChange={field.onChange}>
      <SelectTrigger id="owner" className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {hasEmployee && <SelectItem value={SELF}>Me</SelectItem>}
        <SelectItem value={POOL}>Nobody yet (pool)</SelectItem>
        {data.map((employee) => (
          <SelectItem key={employee.id} value={employee.id}>
            {employee.fullName} — {employee.designation.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
