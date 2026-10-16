"use client";

import { z } from "zod";
import CrudScreen from "@/components/common/crud-screen";
import FormField from "@/components/common/form-field";
import ResourceSelect from "@/components/common/resource-select";
import { ActiveBadge } from "@/components/common/status-badge";
import { formatNumber } from "@/lib/format";
import { departments, designations } from "../api";
import { SwitchField } from "./fields";

const schema = z.object({
  name: z.string().trim().min(2, "At least 2 characters"),
  departmentId: z.string(),
  level: z.coerce.number().int().min(0).max(100),
  isActive: z.boolean(),
});

const defaults = { name: "", departmentId: "", level: 0, isActive: true };

const columns = [
  {
    accessorKey: "name",
    header: "Designation",
    cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
  },
  {
    id: "department",
    header: "Department",
    cell: ({ row }) =>
      row.original.department?.name ?? <span className="text-muted-foreground">Company-wide</span>,
  },
  { accessorKey: "level", header: "Level", meta: { className: "text-right w-20" } },
  {
    accessorKey: "employeeCount",
    header: "Employees",
    meta: { className: "text-right w-28" },
    cell: ({ getValue }) => formatNumber(getValue()),
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ getValue }) => <ActiveBadge active={getValue()} />,
  },
];

function DesignationForm({ control }) {
  return (
    <>
      <FormField control={control} name="name" label="Name" placeholder="Senior Sales Executive" />
      <FormField
        control={control}
        name="departmentId"
        label="Department"
        render={(field, invalid) => (
          <ResourceSelect
            id="departmentId"
            resource={departments}
            params={{ isActive: true }}
            value={field.value}
            onChange={field.onChange}
            invalid={invalid}
            emptyLabel="Company-wide"
          />
        )}
      />
      <FormField
        control={control}
        name="level"
        label="Level"
        type="number"
        min={0}
        max={100}
        description="Seniority for sorting (higher = more senior)."
      />
      <SwitchField control={control} name="isActive" label="Active" />
    </>
  );
}

const config = {
  resource: designations,
  permission: "designation",
  title: "Designations",
  description: "Job titles, company-wide or per department.",
  singular: "designation",
  columns,
  Form: DesignationForm,
  schema,
  defaults,
  formFields: Object.keys(defaults),
  sortBy: "level",
  toFormValues: (d) => ({
    name: d.name,
    departmentId: d.department?.id ?? "",
    level: d.level,
    isActive: d.isActive,
  }),
  toBody: (values) => values,
  deleteHint: "Only designations no employee holds can be deleted.",
};

export default function DesignationsScreen() {
  return <CrudScreen config={config} />;
}
