"use client";

import { useWatch } from "react-hook-form";
import { z } from "zod";
import CrudScreen from "@/components/common/crud-screen";
import FormField from "@/components/common/form-field";
import ResourceSelect from "@/components/common/resource-select";
import { ActiveBadge } from "@/components/common/status-badge";
import { formatNumber } from "@/lib/format";
import { branches, departments, employees, teams } from "../api";
import { SwitchField } from "./fields";

const schema = z.object({
  name: z.string().trim().min(2, "At least 2 characters"),
  branchId: z.string().min(1, "Choose a branch"),
  departmentId: z.string().min(1, "Choose a department"),
  leaderId: z.string(),
  isActive: z.boolean(),
});

const defaults = { name: "", branchId: "", departmentId: "", leaderId: "", isActive: true };

const columns = [
  {
    accessorKey: "name",
    header: "Team",
    cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
  },
  { id: "branch", header: "Branch", cell: ({ row }) => row.original.branch.name },
  {
    id: "department",
    header: "Department",
    meta: { className: "hidden md:table-cell" },
    cell: ({ row }) => row.original.department.name,
  },
  {
    id: "leader",
    header: "Leader",
    cell: ({ row }) =>
      row.original.leader?.fullName ?? <span className="text-muted-foreground">—</span>,
  },
  {
    accessorKey: "memberCount",
    header: "Members",
    meta: { className: "text-right w-24" },
    cell: ({ getValue }) => formatNumber(getValue()),
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ getValue }) => <ActiveBadge active={getValue()} />,
  },
];

function TeamForm({ control }) {
  const [branchId, departmentId] = useWatch({ control, name: ["branchId", "departmentId"] });

  return (
    <>
      <FormField control={control} name="name" label="Name" placeholder="Team Alpha" />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={control}
          name="branchId"
          label="Branch"
          render={(field, invalid) => (
            <ResourceSelect
              id="branchId"
              resource={branches}
              params={{ isActive: true }}
              value={field.value}
              onChange={field.onChange}
              invalid={invalid}
            />
          )}
        />
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
            />
          )}
        />
      </div>
      <FormField
        control={control}
        name="leaderId"
        label="Team leader"
        description="Employees of the chosen branch and department."
        render={(field, invalid) => (
          <ResourceSelect
            id="leaderId"
            resource={employees}
            params={{ sortBy: "fullName", branchId, departmentId, employmentStatus: "ACTIVE" }}
            disabled={!branchId || !departmentId}
            value={field.value}
            onChange={field.onChange}
            invalid={invalid}
            emptyLabel="No leader"
            getLabel={(e) => `${e.fullName} (${e.employeeCode})`}
          />
        )}
      />
      <SwitchField control={control} name="isActive" label="Active" />
    </>
  );
}

function TeamFilters({ value, onChange }) {
  return (
    <div className="sm:w-48">
      <ResourceSelect
        resource={branches}
        value={value.branchId ?? ""}
        onChange={(branchId) => onChange({ ...value, branchId })}
        emptyLabel="All branches"
        placeholder="All branches"
      />
    </div>
  );
}

const config = {
  resource: teams,
  permission: "team",
  title: "Teams",
  description: "Sales teams and other groups. Team leaders see their team's data.",
  singular: "team",
  columns,
  Form: TeamForm,
  Filters: TeamFilters,
  schema,
  defaults,
  formFields: Object.keys(defaults),
  toFormValues: (t) => ({
    name: t.name,
    branchId: t.branch.id,
    departmentId: t.department.id,
    leaderId: t.leader?.id ?? "",
    isActive: t.isActive,
  }),
  toBody: (values) => values,
  deleteHint: "Only teams without members can be deleted.",
};

export default function TeamsScreen() {
  return <CrudScreen config={config} />;
}
