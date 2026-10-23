"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  ArrowRightLeft,
  CircleDot,
  Ellipsis,
  MessageCircle,
  Pencil,
  Phone,
  Trash2,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import ConfirmDialog from "@/components/common/confirm-dialog";
import FormDialog from "@/components/common/form-dialog";
import FormField, { applyApiErrors } from "@/components/common/form-field";
import PageHeader from "@/components/common/page-header";
import RequirePermission from "@/components/common/require-permission";
import StatusBadge from "@/components/common/status-badge";
import { formatBDTShort, formatDate, formatDateTime, formatMobile } from "@/lib/format";
import { toastError } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { useCan } from "@/modules/auth/auth-provider";
import CustomerFormSheet from "@/modules/customer/components/customer-form-sheet";
import { leads, useAssignees, useLeadDuplicates } from "../api";
import { ACTIVITY_TYPES, budgetText, LEAD_STATUS, PICKABLE_STATUSES } from "../constants";
import LeadFormSheet from "./lead-form-sheet";

const ACTIVITY_TEXT = {
  CREATED: "added the lead",
  NOTE: "wrote a note",
  CALL: "logged a call",
  SMS: "sent an SMS",
  WHATSAPP: "messaged on WhatsApp",
  EMAIL: "sent an email",
  MEETING: "met them",
  CONVERTED: "converted the lead",
};

function activityText(activity) {
  if (activity.type === "STATUS_CHANGE") {
    return `moved it from ${LEAD_STATUS[activity.fromStatus]?.label ?? "—"} to ${LEAD_STATUS[activity.toStatus].label}`;
  }
  if (activity.type === "ASSIGNMENT") {
    return activity.data?.to
      ? `assigned it to ${activity.data.to}${activity.data.from ? ` (was ${activity.data.from})` : ""}`
      : "put it back in the pool";
  }
  return ACTIVITY_TEXT[activity.type] ?? activity.type.toLowerCase();
}

function Timeline({ activities }) {
  return (
    <ol className="space-y-4 text-sm">
      {activities.map((activity) => (
        <li key={activity.id} className="flex gap-3">
          <CircleDot className="text-muted-foreground mt-1 size-3 shrink-0" aria-hidden />
          <div className="min-w-0">
            <p>
              <span className="font-medium">{activity.createdBy?.name ?? "System"}</span>{" "}
              {activityText(activity)}
            </p>
            {activity.body && <p className="whitespace-pre-line">{activity.body}</p>}
            <p className="text-muted-foreground text-xs">{formatDateTime(activity.createdAt)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Log a call / note / message. */
function ActivityComposer({ lead }) {
  const log = leads.usePostAction("activities");
  const [type, setType] = useState("CALL");
  const [body, setBody] = useState("");
  const [error, setError] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    if (body.trim().length < 2) {
      setError("Write what happened.");
      return;
    }
    setError(null);
    try {
      await log.mutateAsync({ id: lead.id, type, body: body.trim() });
      setBody("");
      toast.success(`${ACTIVITY_TYPES[type]} logged`);
    } catch (apiError) {
      toastError(apiError);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        value={type}
        onValueChange={(value) => value && setType(value)}
        className="flex-wrap"
        aria-label="What happened"
      >
        {Object.entries(ACTIVITY_TYPES).map(([value, label]) => (
          <ToggleGroupItem key={value} value={value}>
            {label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Textarea
        aria-label="What happened"
        placeholder={type === "NOTE" ? "Note" : "What was said, what they want next"}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        maxLength={2000}
        aria-invalid={Boolean(error)}
      />
      {error && <p className="text-destructive text-sm">{error}</p>}
      <Button type="submit" disabled={log.isPending}>
        Log {ACTIVITY_TYPES[type].toLowerCase()}
      </Button>
    </form>
  );
}

function Detail({ label, children }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="font-medium break-words">{children ?? "—"}</dd>
    </div>
  );
}

function Details({ lead }) {
  const followUpOverdue = lead.nextFollowUpAt && new Date(lead.nextFollowUpAt) < new Date();
  return (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-1">
      <Detail label="Mobile">
        {formatMobile(lead.mobile)}
        {lead.altMobile && (
          <span className="text-muted-foreground font-normal">
            {" "}
            · {formatMobile(lead.altMobile)}
          </span>
        )}
      </Detail>
      <Detail label="Email">{lead.email}</Detail>
      <Detail label="Lives in">{lead.location}</Detail>
      <Detail label="Profession">{lead.profession}</Detail>
      <Detail label="Interested in">
        {lead.preferredProject?.name}
        {lead.propertyType && (
          <span className="text-muted-foreground font-normal"> · {lead.propertyType}</span>
        )}
      </Detail>
      <Detail label="Budget">{budgetText(lead, formatBDTShort)}</Detail>
      <Detail label="Source">
        {lead.source.name}
        {lead.campaign && (
          <span className="text-muted-foreground font-normal"> · {lead.campaign.name}</span>
        )}
      </Detail>
      <Detail label="Assigned to">
        {lead.owner
          ? `${lead.owner.fullName}${lead.owner.team ? ` · ${lead.owner.team.name}` : ""}`
          : "Nobody yet"}
      </Detail>
      <Detail label="Next follow-up">
        {lead.nextFollowUpAt && (
          <span className={cn(followUpOverdue && "text-destructive")}>
            {formatDateTime(lead.nextFollowUpAt)}
            {followUpOverdue && " (overdue)"}
          </span>
        )}
      </Detail>
      {lead.status === "LOST" && <Detail label="Lost because">{lead.lostReason}</Detail>}
      {lead.convertedCustomer && (
        <Detail label="Customer">
          <Link href={`/customers/${lead.convertedCustomer.id}`} className="underline">
            {lead.convertedCustomer.customerCode} {lead.convertedCustomer.fullName}
          </Link>
        </Detail>
      )}
      {lead.duplicateOf && (
        <Detail label="Earlier lead for this person">
          <Link href={`/crm/leads/${lead.duplicateOf.id}`} className="underline">
            {lead.duplicateOf.leadCode} {lead.duplicateOf.fullName}
          </Link>
        </Detail>
      )}
      {lead.notes && (
        <div className="sm:col-span-2 lg:col-span-1">
          <dt className="text-muted-foreground text-xs">Notes</dt>
          <dd className="whitespace-pre-line">{lead.notes}</dd>
        </div>
      )}
    </dl>
  );
}

// ---- Dialogs ----------------------------------------------------------------------------------

const statusSchema = z
  .object({ status: z.string(), lostReason: z.string(), note: z.string() })
  .refine((v) => v.status !== "LOST" || v.lostReason.trim().length >= 3, {
    message: "Say why the lead was lost",
    path: ["lostReason"],
  });

function StatusDialog({ lead, open, onOpenChange }) {
  const change = leads.usePostAction("status");
  const [error, setError] = useState(null);
  const form = useForm({
    resolver: zodResolver(statusSchema),
    values: { status: lead.status === "CONVERTED" ? "NEW" : lead.status, lostReason: "", note: "" },
  });
  const status = useWatch({ control: form.control, name: "status" });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await change.mutateAsync({ id: lead.id, ...values });
      toast.success(`Moved to ${LEAD_STATUS[values.status].label}`);
      onOpenChange(false);
    } catch (apiError) {
      if (!applyApiErrors(apiError, form.setError, ["status", "lostReason", "note"]))
        setError(apiError.message);
    }
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Change status"
      onSubmit={onSubmit}
      submitting={form.formState.isSubmitting}
      error={error}
      submitLabel="Change status"
    >
      <FormField
        control={form.control}
        name="status"
        label="Status"
        render={(field) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id="status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PICKABLE_STATUSES.map((value) => (
                <SelectItem key={value} value={value}>
                  {LEAD_STATUS[value].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      {status === "LOST" && (
        <FormField
          control={form.control}
          name="lostReason"
          label="Why was it lost?"
          placeholder="Bought elsewhere, budget too low, …"
        />
      )}
      <FormField control={form.control} name="note" label="Note" description="Optional" />
    </FormDialog>
  );
}

const POOL = "__pool__";

function AssignDialog({ lead, open, onOpenChange }) {
  const assign = leads.usePostAction("assign");
  const { data: people = [] } = useAssignees(open);
  const [error, setError] = useState(null);
  const form = useForm({ values: { ownerId: lead.owner?.id ?? POOL, note: "" } });

  const onSubmit = form.handleSubmit(async ({ ownerId, note }) => {
    setError(null);
    try {
      const result = await assign.mutateAsync({
        id: lead.id,
        ownerId: ownerId === POOL ? null : ownerId,
        note,
      });
      toast.success(result.owner ? `Assigned to ${result.owner.fullName}` : "Back in the pool");
      onOpenChange(false);
    } catch (apiError) {
      setError(apiError.message);
    }
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Assign ${lead.fullName}`}
      description="They're notified and the lead moves to their list."
      onSubmit={onSubmit}
      submitting={form.formState.isSubmitting}
      error={error}
      submitLabel="Assign"
    >
      <FormField
        control={form.control}
        name="ownerId"
        label="Assign to"
        render={(field) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id="ownerId" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={POOL}>Nobody yet (pool)</SelectItem>
              {people.map((person) => (
                <SelectItem key={person.id} value={person.id}>
                  {person.fullName} — {person.designation.name}
                  {person.team && ` · ${person.team.name}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      <FormField control={form.control} name="note" label="Note" description="Optional" />
    </FormDialog>
  );
}

/** Link an existing customer with the same mobile/email, or create one from the lead. */
function ConvertDialog({ lead, open, onOpenChange, onCreateNew }) {
  const convert = leads.usePostAction("convert");
  const { data: matches } = useLeadDuplicates({
    mobile: open ? formatMobile(lead.mobile).replace("-", "") : "",
    email: open ? (lead.email ?? "") : "",
    excludeId: lead.id,
  });
  const customers = matches?.customers ?? [];

  const link = async (customer) => {
    try {
      await convert.mutateAsync({ id: lead.id, customerId: customer.id });
      toast.success(`${lead.fullName} is now customer ${customer.customerCode}`);
      onOpenChange(false);
    } catch (apiError) {
      toastError(apiError);
    }
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Convert ${lead.fullName} to a customer`}
      description="Customers are needed for bookings. The lead closes as Converted."
      onSubmit={(event) => {
        event.preventDefault();
        onCreateNew();
      }}
      submitLabel="Create a new customer"
    >
      {customers.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Already a customer?</p>
          {customers.map((customer) => (
            <div
              key={customer.id}
              className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
            >
              <div>
                <p className="font-medium">
                  {customer.customerCode} {customer.fullName}
                </p>
                <p className="text-muted-foreground text-xs">
                  Same {customer.matchedOn.join(" and ")}
                  {customer.ownerName && ` · with ${customer.ownerName}`}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={convert.isPending}
                onClick={() => link(customer)}
                aria-label={`Link ${customer.customerCode} ${customer.fullName}`}
              >
                Link
              </Button>
            </div>
          ))}
        </div>
      )}
      {!customers.length && (
        <p className="text-muted-foreground text-sm">
          No customer has this mobile or email yet. Create one from the lead&apos;s details.
        </p>
      )}
    </FormDialog>
  );
}

// ---- Screen -----------------------------------------------------------------------------------

export default function LeadDetailScreen() {
  const { id } = useParams();
  const router = useRouter();
  const can = useCan();
  const [dialog, setDialog] = useState(null); // edit | status | assign | convert | customer | delete
  // While deleting, stop refetching: a 404 would unmount the dialog mid-close
  const [removing, setRemoving] = useState(false);
  const { data: lead, isLoading, error } = leads.useItem(id, { enabled: !removing });
  const remove = leads.useRemove();
  const convert = leads.usePostAction("convert");
  const close = () => setDialog(null);
  const openDialog = (name) => () => setDialog(name);

  const closed = lead?.status === "CONVERTED";
  const whatsapp = lead && `https://wa.me/${lead.mobile}`;

  return (
    <RequirePermission permission="lead.view">
      <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
        <Link href="/crm/leads">
          <ArrowLeft /> All leads
        </Link>
      </Button>
      {error ? (
        <p className="text-destructive text-sm">
          {error.status === 404
            ? "This lead doesn't exist or isn't assigned to anyone you can see."
            : error.message}
        </p>
      ) : isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          <PageHeader
            title={lead.fullName}
            description={`${lead.leadCode} · ${lead.source.name} · added ${formatDate(lead.createdAt)}`}
            actions={
              <>
                <StatusBadge tone={LEAD_STATUS[lead.status].tone}>
                  {LEAD_STATUS[lead.status].label}
                </StatusBadge>
                {can("lead.edit") && !closed && (
                  <Button size="sm" variant="outline" onClick={openDialog("status")}>
                    <ArrowRightLeft /> Status
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon-sm" variant="outline" aria-label="More actions">
                      <Ellipsis />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {can("lead.edit") && (
                      <DropdownMenuItem onSelect={openDialog("edit")}>
                        <Pencil /> Edit
                      </DropdownMenuItem>
                    )}
                    {can("lead.assign") && !closed && (
                      <DropdownMenuItem onSelect={openDialog("assign")}>
                        <UserPlus /> Assign
                      </DropdownMenuItem>
                    )}
                    {can("lead.edit") && can("customer.create") && !closed && (
                      <DropdownMenuItem onSelect={openDialog("convert")}>
                        <UserCheck /> Convert to customer
                      </DropdownMenuItem>
                    )}
                    {can("lead.delete") && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onSelect={openDialog("delete")}>
                          <Trash2 /> Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            }
          />

          <div className="mb-6 flex flex-wrap gap-2">
            <Button asChild>
              <a href={`tel:+${lead.mobile}`}>
                <Phone /> Call {formatMobile(lead.mobile)}
              </a>
            </Button>
            <Button variant="outline" asChild>
              <a href={whatsapp} target="_blank" rel="noreferrer">
                <MessageCircle /> WhatsApp
              </a>
            </Button>
          </div>

          {/* Phones: log, details, history. Wide screens: details in a side column */}
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            {can("lead.edit") && !closed && (
              <Card className="lg:col-start-1">
                <CardHeader>
                  <CardTitle>Log what happened</CardTitle>
                  <CardDescription>
                    Calls, messages, meetings and notes build the lead&apos;s history.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ActivityComposer lead={lead} />
                </CardContent>
              </Card>
            )}
            <Card className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent>
                <Details lead={lead} />
              </CardContent>
            </Card>
            <Card className="lg:col-start-1">
              <CardHeader>
                <CardTitle>History</CardTitle>
              </CardHeader>
              <CardContent>
                <Timeline activities={lead.activities} />
              </CardContent>
            </Card>
          </div>

          <LeadFormSheet open={dialog === "edit"} onOpenChange={(o) => !o && close()} lead={lead} />
          {dialog === "status" && (
            <StatusDialog lead={lead} open onOpenChange={(o) => !o && close()} />
          )}
          {dialog === "assign" && (
            <AssignDialog lead={lead} open onOpenChange={(o) => !o && close()} />
          )}
          <ConvertDialog
            lead={lead}
            open={dialog === "convert"}
            onOpenChange={(o) => !o && close()}
            onCreateNew={() => setDialog("customer")}
          />
          <CustomerFormSheet
            open={dialog === "customer"}
            onOpenChange={(o) => !o && close()}
            customer={null}
            initial={{
              fullName: lead.fullName,
              mobile: lead.mobile,
              altMobile: lead.altMobile,
              email: lead.email,
              profession: lead.profession,
              presentAddress: lead.location,
              owner: lead.owner,
            }}
            onSaved={async (customer) => {
              try {
                await convert.mutateAsync({ id: lead.id, customerId: customer.id });
                toast.success(`${lead.fullName} converted to ${customer.customerCode}`);
              } catch (apiError) {
                toastError(apiError);
              }
            }}
          />
          <ConfirmDialog
            open={dialog === "delete"}
            onOpenChange={(o) => !o && close()}
            title={`Delete ${lead.fullName}?`}
            description="The lead and its history disappear from lists. This can't be undone in the app."
            confirmLabel="Delete"
            destructive
            loading={remove.isPending}
            onConfirm={async () => {
              setRemoving(true);
              try {
                await remove.mutateAsync(lead.id);
                toast.success("Lead deleted");
                close();
              } catch (apiError) {
                setRemoving(false);
                toastError(apiError);
              }
            }}
            onClosed={() => removing && router.push("/crm/leads")}
          />
        </>
      )}
    </RequirePermission>
  );
}
