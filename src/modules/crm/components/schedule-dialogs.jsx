"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import FormDialog from "@/components/common/form-dialog";
import FormField, { applyApiErrors } from "@/components/common/form-field";
import ResourceSelect from "@/components/common/resource-select";
import { formatDateTime, toDateTimeInput } from "@/lib/format";
import { projects } from "@/modules/project/api";
import { followUps, siteVisits } from "../api";
import { FOLLOW_UP_TYPES, INTEREST, TRANSPORTS } from "../constants";

const toIso = (local) => new Date(local).toISOString();

/** Tomorrow at 10:00 (local), a sensible default slot. */
function tomorrowAt10() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(10, 0, 0, 0);
  return toDateTimeInput(date);
}

const when = z.string().min(1, "Choose a date and time");

/** Shared submit handling: API field errors onto the form, anything else in the banner. */
function useSubmit(form, fields, run) {
  const [error, setError] = useState(null);
  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await run(values);
    } catch (apiError) {
      if (!applyApiErrors(apiError, form.setError, fields)) setError(apiError.message);
    }
  });
  return { error, onSubmit };
}

function TypeSelect({ field, id }) {
  return (
    <Select value={field.value} onValueChange={field.onChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(FOLLOW_UP_TYPES).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ---- Follow-ups -------------------------------------------------------------------------------

const followUpSchema = z.object({ type: z.string(), dueAt: when, purpose: z.string().max(300) });

/** Schedule a follow-up for `lead`, or reschedule `followUp`. */
export function FollowUpDialog({ lead, followUp, open, onOpenChange }) {
  const create = followUps.useCreate();
  const update = followUps.useUpdate();
  const form = useForm({
    resolver: zodResolver(followUpSchema),
    values: followUp
      ? {
          type: followUp.type,
          dueAt: toDateTimeInput(followUp.dueAt),
          purpose: followUp.purpose ?? "",
        }
      : { type: "CALL", dueAt: tomorrowAt10(), purpose: "" },
  });
  const { error, onSubmit } = useSubmit(form, ["type", "dueAt", "purpose"], async (values) => {
    const body = { ...values, dueAt: toIso(values.dueAt) };
    if (followUp) await update.mutateAsync({ id: followUp.id, ...body });
    else await create.mutateAsync({ leadId: lead.id, ...body });
    toast.success(
      `${FOLLOW_UP_TYPES[values.type]} ${followUp ? "moved to" : "planned for"} ${formatDateTime(body.dueAt)}`,
    );
    onOpenChange(false);
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={followUp ? "Reschedule follow-up" : `Follow-up with ${lead.fullName}`}
      onSubmit={onSubmit}
      submitting={form.formState.isSubmitting}
      error={error}
      submitLabel={followUp ? "Reschedule" : "Schedule"}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="type"
          label="How"
          render={(field) => <TypeSelect field={field} id="type" />}
        />
        <FormField control={form.control} name="dueAt" label="When" type="datetime-local" />
      </div>
      <FormField
        control={form.control}
        name="purpose"
        label="About"
        placeholder="Send the brochure, confirm the visit, …"
        description="Optional"
      />
    </FormDialog>
  );
}

const completeSchema = z
  .object({
    outcome: z.string().trim().min(2, "Write what happened"),
    planNext: z.boolean(),
    nextType: z.string(),
    nextDueAt: z.string(),
    nextPurpose: z.string().max(300),
  })
  .refine((v) => !v.planNext || v.nextDueAt, {
    message: "Choose a date and time",
    path: ["nextDueAt"],
  });

/** Mark a follow-up done with what happened; optionally plan the next one. */
export function CompleteFollowUpDialog({ followUp, open, onOpenChange }) {
  const complete = followUps.usePostAction("complete");
  const form = useForm({
    resolver: zodResolver(completeSchema),
    values: {
      outcome: "",
      planNext: true,
      nextType: "CALL",
      nextDueAt: tomorrowAt10(),
      nextPurpose: "",
    },
  });
  const planNext = useWatch({ control: form.control, name: "planNext" });
  const { error, onSubmit } = useSubmit(form, ["outcome"], async (values) => {
    await complete.mutateAsync({
      id: followUp.id,
      outcome: values.outcome,
      ...(values.planNext && {
        next: {
          type: values.nextType,
          dueAt: toIso(values.nextDueAt),
          purpose: values.nextPurpose,
        },
      }),
    });
    toast.success(values.planNext ? "Done — next follow-up planned" : "Follow-up done");
    onOpenChange(false);
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${FOLLOW_UP_TYPES[followUp.type]} with ${followUp.lead?.fullName ?? "the lead"}: done`}
      description={followUp.purpose ?? undefined}
      onSubmit={onSubmit}
      submitting={form.formState.isSubmitting}
      error={error}
      submitLabel="Save"
    >
      <FormField
        control={form.control}
        name="outcome"
        label="What happened?"
        render={(field, invalid) => (
          <Textarea
            id="outcome"
            rows={3}
            aria-invalid={invalid}
            placeholder="What they said, what they want next"
            {...field}
          />
        )}
      />
      <FormField
        control={form.control}
        name="planNext"
        render={(field) => (
          <div className="flex items-center gap-2">
            <Checkbox
              id="planNext"
              checked={field.value}
              onCheckedChange={(c) => field.onChange(c === true)}
            />
            <Label htmlFor="planNext" className="font-normal">
              Plan the next follow-up
            </Label>
          </div>
        )}
      />
      {planNext && (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="nextType"
              label="How"
              render={(field) => <TypeSelect field={field} id="nextType" />}
            />
            <FormField control={form.control} name="nextDueAt" label="When" type="datetime-local" />
          </div>
          <FormField
            control={form.control}
            name="nextPurpose"
            label="About"
            description="Optional"
          />
        </>
      )}
    </FormDialog>
  );
}

// ---- Site visits ------------------------------------------------------------------------------

const visitSchema = z.object({
  projectId: z.string().min(1, "Choose a project"),
  scheduledAt: when,
  transport: z.string(),
  pickupPoint: z.string().max(200),
  visitors: z.coerce.number().int().min(1, "At least 1").max(50),
  note: z.string().max(1000),
});

/** Book a site visit for `lead`, or change `visit`. */
export function SiteVisitDialog({ lead, visit, open, onOpenChange }) {
  const create = siteVisits.useCreate();
  const update = siteVisits.useUpdate();
  const form = useForm({
    resolver: zodResolver(visitSchema),
    values: visit
      ? {
          projectId: visit.project.id,
          scheduledAt: toDateTimeInput(visit.scheduledAt),
          transport: visit.transport,
          pickupPoint: visit.pickupPoint ?? "",
          visitors: visit.visitors,
          note: visit.note ?? "",
        }
      : {
          projectId: lead?.preferredProject?.id ?? "",
          scheduledAt: tomorrowAt10(),
          transport: "OFFICE_CAR",
          pickupPoint: lead?.location ?? "",
          visitors: 1,
          note: "",
        },
  });
  const transport = useWatch({ control: form.control, name: "transport" });
  const fields = ["projectId", "scheduledAt", "transport", "pickupPoint", "visitors", "note"];
  const { error, onSubmit } = useSubmit(form, fields, async (values) => {
    const body = { ...values, scheduledAt: toIso(values.scheduledAt) };
    if (visit) await update.mutateAsync({ id: visit.id, ...body });
    else await create.mutateAsync({ leadId: lead.id, ...body });
    toast.success(
      `Site visit ${visit ? "moved to" : "booked for"} ${formatDateTime(body.scheduledAt)}`,
    );
    onOpenChange(false);
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={visit ? "Change site visit" : `Site visit for ${lead.fullName}`}
      description={visit ? undefined : "The lead moves to the Site visit stage."}
      onSubmit={onSubmit}
      submitting={form.formState.isSubmitting}
      error={error}
      submitLabel={visit ? "Save" : "Book visit"}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="projectId"
          label="Project"
          render={(field, invalid) => (
            <ResourceSelect
              id="projectId"
              resource={projects}
              value={field.value}
              onChange={field.onChange}
              invalid={invalid}
            />
          )}
        />
        <FormField control={form.control} name="scheduledAt" label="When" type="datetime-local" />
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_6rem]">
        <FormField
          control={form.control}
          name="transport"
          label="Transport"
          render={(field) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="transport" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TRANSPORTS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        <FormField
          control={form.control}
          name="visitors"
          label="People"
          type="number"
          min={1}
          max={50}
        />
      </div>
      {transport === "OFFICE_CAR" && (
        <FormField
          control={form.control}
          name="pickupPoint"
          label="Pick up from"
          placeholder="Address or landmark"
        />
      )}
      <FormField control={form.control} name="note" label="Note" description="Optional" />
    </FormDialog>
  );
}

const visitResultSchema = z
  .object({
    status: z.enum(["VISITED", "NO_SHOW"]),
    interest: z.string(),
    plotsShown: z.string().max(300),
    feedback: z.string().max(2000),
  })
  .refine((v) => v.status !== "VISITED" || v.interest, {
    message: "How interested were they?",
    path: ["interest"],
  });

/** Record how a visit went: visited (interest, plots shown, feedback) or didn't come. */
export function CompleteVisitDialog({ visit, open, onOpenChange }) {
  const complete = siteVisits.usePostAction("complete");
  const form = useForm({
    resolver: zodResolver(visitResultSchema),
    values: { status: "VISITED", interest: "", plotsShown: "", feedback: "" },
  });
  const status = useWatch({ control: form.control, name: "status" });
  const { error, onSubmit } = useSubmit(
    form,
    ["interest", "plotsShown", "feedback"],
    async (values) => {
      await complete.mutateAsync({
        id: visit.id,
        status: values.status,
        ...(values.status === "VISITED" && {
          interest: values.interest,
          plotsShown: values.plotsShown,
        }),
        feedback: values.feedback,
      });
      toast.success(values.status === "VISITED" ? "Visit recorded" : "Marked as didn't come");
      onOpenChange(false);
    },
  );

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`How did the visit go?`}
      description={`${visit.lead?.fullName ?? "Lead"} · ${visit.project.name} · ${formatDateTime(visit.scheduledAt)}`}
      onSubmit={onSubmit}
      submitting={form.formState.isSubmitting}
      error={error}
      submitLabel="Save"
    >
      <FormField
        control={form.control}
        name="status"
        render={(field) => (
          <ToggleGroup
            type="single"
            variant="outline"
            value={field.value}
            onValueChange={(v) => v && field.onChange(v)}
            aria-label="Did they come?"
          >
            <ToggleGroupItem value="VISITED">They came</ToggleGroupItem>
            <ToggleGroupItem value="NO_SHOW">Didn&apos;t come</ToggleGroupItem>
          </ToggleGroup>
        )}
      />
      {status === "VISITED" && (
        <>
          <FormField
            control={form.control}
            name="interest"
            label="Interest"
            render={(field, invalid) => (
              <ToggleGroup
                type="single"
                variant="outline"
                value={field.value}
                onValueChange={(v) => v && field.onChange(v)}
                aria-invalid={invalid}
                aria-label="Interest"
              >
                {Object.entries(INTEREST).map(([value, { label }]) => (
                  <ToggleGroupItem key={value} value={value}>
                    {label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            )}
          />
          <FormField
            control={form.control}
            name="plotsShown"
            label="Plots shown"
            placeholder="A-5, A-7"
          />
        </>
      )}
      <FormField
        control={form.control}
        name="feedback"
        label={status === "VISITED" ? "What they said" : "Reason, if known"}
        render={(field) => <Textarea id="feedback" rows={3} {...field} />}
      />
    </FormDialog>
  );
}

// ---- Cancel -----------------------------------------------------------------------------------

/** Cancel a follow-up or a visit with an optional reason. */
export function CancelDialog({ kind, item, open, onOpenChange }) {
  const cancel = (kind === "visit" ? siteVisits : followUps).usePostAction("cancel");
  const form = useForm({ values: { reason: "" } });
  const { error, onSubmit } = useSubmit(form, ["reason"], async ({ reason }) => {
    await cancel.mutateAsync({ id: item.id, reason });
    toast.success(kind === "visit" ? "Site visit cancelled" : "Follow-up cancelled");
    onOpenChange(false);
  });
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={kind === "visit" ? "Cancel site visit" : "Cancel follow-up"}
      onSubmit={onSubmit}
      submitting={form.formState.isSubmitting}
      error={error}
      submitLabel="Cancel it"
    >
      <FormField control={form.control} name="reason" label="Why?" description="Optional" />
    </FormDialog>
  );
}
