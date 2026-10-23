"use client";

import { z } from "zod";
import CrudScreen from "@/components/common/crud-screen";
import FormField from "@/components/common/form-field";
import ResourceSelect from "@/components/common/resource-select";
import { ActiveBadge } from "@/components/common/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { formatBDT, formatDateOnly, formatNumber, toDateInput } from "@/lib/format";
import { SwitchField } from "@/modules/organization/components/fields";
import { leadSources, campaigns } from "../api";

const schema = z
  .object({
    name: z.string().trim().min(2, "At least 2 characters").max(120),
    sourceId: z.string(),
    budget: z
      .string()
      .trim()
      .refine((v) => v === "" || /^\d+(\.\d{1,2})?$/.test(v), "A number, up to 2 decimals"),
    startDate: z.string(),
    endDate: z.string(),
    externalId: z.string().trim().max(100),
    notes: z.string().max(1000),
    isActive: z.boolean(),
  })
  .refine((v) => !v.startDate || !v.endDate || v.startDate <= v.endDate, {
    message: "Ends before it starts",
    path: ["endDate"],
  });

const defaults = {
  name: "",
  sourceId: "",
  budget: "",
  startDate: "",
  endDate: "",
  externalId: "",
  notes: "",
  isActive: true,
};

const period = (c) =>
  c.startDate || c.endDate
    ? `${c.startDate ? formatDateOnly(c.startDate) : "…"} – ${c.endDate ? formatDateOnly(c.endDate) : "ongoing"}`
    : "—";

const columns = [
  {
    accessorKey: "name",
    header: "Campaign",
    cell: ({ row }) => (
      <div className="leading-tight">
        <p className="font-medium">{row.original.name}</p>
        <p className="text-muted-foreground text-xs">{row.original.source?.name ?? "Any source"}</p>
      </div>
    ),
  },
  {
    id: "period",
    header: "Runs",
    meta: { className: "hidden md:table-cell whitespace-nowrap" },
    cell: ({ row }) => period(row.original),
  },
  {
    accessorKey: "budget",
    header: "Budget",
    meta: { className: "hidden sm:table-cell text-right whitespace-nowrap" },
    cell: ({ getValue }) => (getValue() == null ? "—" : formatBDT(getValue())),
  },
  {
    accessorKey: "leadCount",
    header: "Leads",
    meta: { className: "text-right w-20" },
    cell: ({ getValue }) => formatNumber(getValue()),
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ getValue }) => <ActiveBadge active={getValue()} />,
  },
];

function CampaignForm({ control }) {
  return (
    <>
      <FormField control={control} name="name" label="Name" placeholder="Puja offer 2026" />
      <FormField
        control={control}
        name="sourceId"
        label="Runs on"
        render={(field, invalid) => (
          <ResourceSelect
            id="sourceId"
            resource={leadSources}
            params={{ sortBy: "sortOrder", sortOrder: "asc" }}
            value={field.value}
            onChange={field.onChange}
            invalid={invalid}
            emptyLabel="Any source"
          />
        )}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField control={control} name="startDate" label="Starts" type="date" />
        <FormField control={control} name="endDate" label="Ends" type="date" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField control={control} name="budget" label="Budget (৳)" inputMode="decimal" />
        <FormField
          control={control}
          name="externalId"
          label="Ad platform id"
          description="Optional, e.g. the Facebook campaign id."
        />
      </div>
      <FormField
        control={control}
        name="notes"
        label="Notes"
        render={(field) => <Textarea id="notes" rows={3} {...field} />}
      />
      <SwitchField control={control} name="isActive" label="Active" />
    </>
  );
}

function SourceFilter({ value, onChange }) {
  return (
    <div className="sm:w-48">
      <ResourceSelect
        resource={leadSources}
        params={{ sortBy: "sortOrder", sortOrder: "asc" }}
        value={value.sourceId ?? ""}
        onChange={(sourceId) => onChange({ ...value, sourceId })}
        emptyLabel="All sources"
        placeholder="All sources"
      />
    </div>
  );
}

const config = {
  resource: campaigns,
  permission: "campaign",
  title: "Campaigns",
  description: "Marketing campaigns that bring in leads.",
  singular: "campaign",
  columns,
  Form: CampaignForm,
  Filters: SourceFilter,
  schema,
  defaults,
  formFields: Object.keys(defaults),
  sortBy: "name",
  toFormValues: (c) => ({
    name: c.name,
    sourceId: c.source?.id ?? "",
    budget: c.budget == null ? "" : String(Number(c.budget)),
    startDate: toDateInput(c.startDate),
    endDate: toDateInput(c.endDate),
    externalId: c.externalId ?? "",
    notes: c.notes ?? "",
    isActive: c.isActive,
  }),
  toBody: (values) => values,
  deleteHint: "Leads from this campaign keep their history.",
};

export default function CampaignsScreen() {
  return <CrudScreen config={config} />;
}
