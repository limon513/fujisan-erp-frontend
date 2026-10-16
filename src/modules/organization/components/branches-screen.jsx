"use client";

import { z } from "zod";
import { ActiveBadge } from "@/components/common/status-badge";
import CrudScreen from "@/components/common/crud-screen";
import FormField from "@/components/common/form-field";
import StatusBadge from "@/components/common/status-badge";
import { formatNumber } from "@/lib/format";
import { branches } from "../api";
import { SwitchField } from "./fields";

const schema = z.object({
  code: z.string().trim().min(1, "Required").max(20),
  name: z.string().trim().min(2, "At least 2 characters"),
  phone: z.string(),
  email: z.string(),
  address: z.string(),
  isHeadOffice: z.boolean(),
  isActive: z.boolean(),
});

const defaults = {
  code: "",
  name: "",
  phone: "",
  email: "",
  address: "",
  isHeadOffice: false,
  isActive: true,
};

const columns = [
  { accessorKey: "code", header: "Code", meta: { className: "w-24" } },
  {
    accessorKey: "name",
    header: "Branch",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="font-medium">{row.original.name}</span>
        {row.original.isHeadOffice && <StatusBadge tone="blue">Head office</StatusBadge>}
      </div>
    ),
  },
  {
    accessorKey: "phone",
    header: "Phone",
    meta: { className: "hidden md:table-cell" },
    cell: ({ getValue }) => getValue() ?? "—",
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

function BranchForm({ control }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <FormField
          control={control}
          name="code"
          label="Code"
          placeholder="DHK"
          className="uppercase"
        />
        <FormField control={control} name="name" label="Name" placeholder="Dhaka Branch" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField control={control} name="phone" label="Phone" />
        <FormField control={control} name="email" label="Email" type="email" />
      </div>
      <FormField control={control} name="address" label="Address" />
      <SwitchField
        control={control}
        name="isHeadOffice"
        label="Head office"
        description="Only one branch can be the head office."
      />
      <SwitchField control={control} name="isActive" label="Active" />
    </>
  );
}

const config = {
  resource: branches,
  permission: "branch",
  title: "Branches",
  description: "Offices of the company. Employees and teams belong to a branch.",
  singular: "branch",
  columns,
  Form: BranchForm,
  schema,
  defaults,
  formFields: Object.keys(defaults),
  toFormValues: (b) => ({
    code: b.code,
    name: b.name,
    phone: b.phone ?? "",
    email: b.email ?? "",
    address: b.address ?? "",
    isHeadOffice: b.isHeadOffice,
    isActive: b.isActive,
  }),
  toBody: (values) => values,
  deleteHint:
    "Only branches without employees or teams can be deleted. Deactivate it instead to keep history.",
};

export default function BranchesScreen() {
  return <CrudScreen config={config} />;
}
