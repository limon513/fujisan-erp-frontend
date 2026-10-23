"use client";

import { z } from "zod";
import CrudScreen from "@/components/common/crud-screen";
import FormField from "@/components/common/form-field";
import { ActiveBadge } from "@/components/common/status-badge";
import { formatNumber } from "@/lib/format";
import { SwitchField } from "@/modules/organization/components/fields";
import { leadSources } from "../api";

const schema = z.object({
  name: z.string().trim().min(2, "At least 2 characters").max(60),
  sortOrder: z.coerce.number().int().min(0).max(1000),
  isActive: z.boolean(),
});

const defaults = { name: "", sortOrder: 100, isActive: true };

const columns = [
  {
    accessorKey: "name",
    header: "Source",
    cell: ({ row }) => (
      <div className="leading-tight">
        <p className="font-medium">{row.original.name}</p>
        <p className="text-muted-foreground text-xs">{row.original.code}</p>
      </div>
    ),
  },
  {
    accessorKey: "leadCount",
    header: "Leads",
    meta: { className: "text-right w-24" },
    cell: ({ getValue }) => formatNumber(getValue()),
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ getValue }) => <ActiveBadge active={getValue()} />,
  },
];

function SourceForm({ control }) {
  return (
    <>
      <FormField control={control} name="name" label="Name" placeholder="Facebook" />
      <FormField
        control={control}
        name="sortOrder"
        label="Position in lists"
        type="number"
        min={0}
        max={1000}
        description="Lower numbers come first."
      />
      <SwitchField
        control={control}
        name="isActive"
        label="Active"
        description="Switched-off sources can't be chosen for new leads."
      />
    </>
  );
}

const config = {
  resource: leadSources,
  permission: "lead-source",
  title: "Lead sources",
  description: "Where leads come from: Facebook, walk-in, referral and so on.",
  singular: "source",
  columns,
  Form: SourceForm,
  schema,
  defaults,
  formFields: Object.keys(defaults),
  sortBy: "sortOrder",
  toFormValues: (s) => ({ name: s.name, sortOrder: s.sortOrder, isActive: s.isActive }),
  toBody: (values) => values,
  deleteHint: "Sources that already have leads can only be switched off.",
};

export default function LeadSourcesScreen() {
  return <CrudScreen config={config} />;
}
