"use client";

import { z } from "zod";
import CrudScreen from "@/components/common/crud-screen";
import FormField from "@/components/common/form-field";
import ResourceSelect from "@/components/common/resource-select";
import { ActiveBadge } from "@/components/common/status-badge";
import { formatNumber } from "@/lib/format";
import { departments, employees } from "../api";
import { SwitchField } from "./fields";

const schema = z.object({
  code: z.string().trim().min(1, "Required").max(20),
  name: z.string().trim().min(2, "At least 2 characters"),
  description: z.string(),
  headId: z.string(),
  isActive: z.boolean(),
});

const defaults = { code: "", name: "", description: "", headId: "", isActive: true };

const columns = [
  { accessorKey: "code", header: "Code", meta: { className: "w-24" } },
  {
    accessorKey: "name",
    header: "Department",
    cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
  },
  {
    id: "head",
    header: "Head",
    meta: { className: "hidden md:table-cell" },
    cell: ({ row }) =>
      row.original.head?.fullName ?? <span className="text-muted-foreground">—</span>,
  },
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

function DepartmentForm({ control, item }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <FormField
          control={control}
          name="code"
          label="Code"
          placeholder="SALES"
          className="uppercase"
        />
        <FormField control={control} name="name" label="Name" placeholder="Sales" />
      </div>
      <FormField control={control} name="description" label="Description" />
      <FormField
        control={control}
        name="headId"
        label="Department head"
        render={(field, invalid) => (
          <ResourceSelect
            id="headId"
            resource={employees}
            params={{
              sortBy: "fullName",
              employmentStatus: "ACTIVE",
              ...(item && { departmentId: item.id }),
            }}
            value={field.value}
            onChange={field.onChange}
            invalid={invalid}
            emptyLabel="No head"
            getLabel={(e) => `${e.fullName} (${e.employeeCode})`}
          />
        )}
      />
      <SwitchField control={control} name="isActive" label="Active" />
    </>
  );
}

const config = {
  resource: departments,
  permission: "department",
  title: "Departments",
  description: "Sales, CRM, Accounts & Finance, HR & Admin, …",
  singular: "department",
  columns,
  Form: DepartmentForm,
  schema,
  defaults,
  formFields: Object.keys(defaults),
  toFormValues: (d) => ({
    code: d.code,
    name: d.name,
    description: d.description ?? "",
    headId: d.head?.id ?? "",
    isActive: d.isActive,
  }),
  toBody: (values) => values,
  deleteHint: "Only departments without employees, teams or designations can be deleted.",
};

export default function DepartmentsScreen() {
  return <CrudScreen config={config} />;
}
