"use client";

import { useState } from "react";
import { KeyRound, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ConfirmDialog from "@/components/common/confirm-dialog";
import DataTable from "@/components/common/data-table";
import PageHeader from "@/components/common/page-header";
import RequirePermission from "@/components/common/require-permission";
import ResourceSelect from "@/components/common/resource-select";
import RowActions from "@/components/common/row-actions";
import StatusBadge from "@/components/common/status-badge";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDateOnly, formatMobile } from "@/lib/format";
import { toastError } from "@/lib/notify";
import { useCan } from "@/modules/auth/auth-provider";
import CreateLoginDialog from "@/modules/user/components/create-login-dialog";
import TemporaryPasswordDialog from "@/modules/user/components/temporary-password-dialog";
import { branches, departments, employees } from "../api";
import EmployeeFormSheet from "./employee-form-sheet";
import { EMPLOYMENT_STATUS } from "./employee-labels";

const EMPTY_FILTERS = { search: "", branchId: "", departmentId: "", employmentStatus: "all" };

function EmployeeEditor({ id, onClose }) {
  // The list row lacks detail fields; load the full record before editing
  const { data: employee, isLoading } = employees.useItem(id === "new" ? null : id);
  if (id !== "new" && (isLoading || !employee)) return null;
  return (
    <EmployeeFormSheet
      open
      onOpenChange={(open) => !open && onClose()}
      employee={id === "new" ? null : employee}
    />
  );
}

export default function EmployeesScreen() {
  const can = useCan();
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [loginFor, setLoginFor] = useState(null);
  const [password, setPassword] = useState(null);
  const [removing, setRemoving] = useState(null);
  const search = useDebouncedValue(filters.search);
  const remove = employees.useRemove();

  const { data, isLoading, isFetching, error } = employees.useList({
    ...filters,
    search,
    page,
    limit: 20,
    sortBy: "fullName",
    sortOrder: "asc",
  });

  const set = (patch) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  const confirmRemove = async () => {
    try {
      await remove.mutateAsync(removing.id);
      toast.success(`${removing.fullName} removed`);
    } catch (apiError) {
      toastError(apiError);
    }
    setRemoving(null);
  };

  const columns = [
    {
      accessorKey: "fullName",
      header: "Employee",
      cell: ({ row }) => (
        <div className="leading-tight">
          <p className="font-medium">{row.original.fullName}</p>
          <p className="text-muted-foreground text-xs">
            {row.original.employeeCode} · {row.original.designation.name}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "mobile",
      header: "Mobile",
      meta: { className: "hidden md:table-cell whitespace-nowrap" },
      cell: ({ getValue }) => formatMobile(getValue()),
    },
    {
      id: "org",
      header: "Branch / Department",
      meta: { className: "hidden lg:table-cell" },
      cell: ({ row }) => (
        <div className="leading-tight">
          <p>{row.original.branch.name}</p>
          <p className="text-muted-foreground text-xs">
            {row.original.department.name}
            {row.original.team && ` · ${row.original.team.name}`}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "joiningDate",
      header: "Joined",
      meta: { className: "hidden xl:table-cell whitespace-nowrap" },
      cell: ({ getValue }) => formatDateOnly(getValue()),
    },
    {
      accessorKey: "employmentStatus",
      header: "Status",
      cell: ({ getValue }) => {
        const status = EMPLOYMENT_STATUS[getValue()];
        return <StatusBadge tone={status.tone}>{status.label}</StatusBadge>;
      },
    },
    {
      id: "login",
      header: "ERP login",
      meta: { className: "hidden md:table-cell" },
      cell: ({ row }) =>
        row.original.user ? (
          <div className="leading-tight">
            <p>{row.original.user.username}</p>
            <p className="text-muted-foreground text-xs">{row.original.user.role.name}</p>
          </div>
        ) : (
          <span className="text-muted-foreground">No login</span>
        ),
    },
    {
      id: "actions",
      header: "",
      meta: { className: "w-12" },
      cell: ({ row }) => (
        <RowActions
          items={[
            {
              label: "Edit",
              icon: Pencil,
              onSelect: () => setEditingId(row.original.id),
              hidden: !can("employee.edit"),
            },
            {
              label: "Create login",
              icon: KeyRound,
              onSelect: () => setLoginFor(row.original),
              hidden:
                Boolean(row.original.user) ||
                !can("user.create") ||
                ["RESIGNED", "TERMINATED", "SUSPENDED"].includes(row.original.employmentStatus),
            },
            {
              label: "Remove",
              icon: Trash2,
              destructive: true,
              separator: true,
              onSelect: () => setRemoving(row.original),
              hidden: !can("employee.delete"),
            },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Employees"
        description="Everyone in the company, with their branch, department, team and ERP login."
        actions={
          can("employee.create") && (
            <Button onClick={() => setEditingId("new")}>
              <Plus /> New employee
            </Button>
          )
        }
      />
      <RequirePermission permission="employee.view">
        <div className="space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:flex-wrap">
            <div className="relative md:w-64">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                placeholder="Name, ID, mobile or email"
                className="pl-8"
                value={filters.search}
                onChange={(e) => set({ search: e.target.value })}
              />
            </div>
            <div className="md:w-44">
              <ResourceSelect
                resource={branches}
                value={filters.branchId}
                onChange={(branchId) => set({ branchId })}
                emptyLabel="All branches"
                placeholder="All branches"
              />
            </div>
            <div className="md:w-44">
              <ResourceSelect
                resource={departments}
                value={filters.departmentId}
                onChange={(departmentId) => set({ departmentId })}
                emptyLabel="All departments"
                placeholder="All departments"
              />
            </div>
            <Select
              value={filters.employmentStatus}
              onValueChange={(employmentStatus) => set({ employmentStatus })}
            >
              <SelectTrigger className="md:w-40" aria-label="Employment status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.entries(EMPLOYMENT_STATUS).map(([value, { label }]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error ? (
            <p className="text-destructive text-sm">{error.message}</p>
          ) : (
            <DataTable
              columns={columns}
              data={data?.data}
              meta={data?.meta}
              isLoading={isLoading}
              isFetching={isFetching}
              onPageChange={setPage}
              onRowClick={can("employee.edit") ? (row) => setEditingId(row.id) : undefined}
              emptyMessage="No employees match these filters."
            />
          )}
        </div>
      </RequirePermission>

      {editingId && <EmployeeEditor id={editingId} onClose={() => setEditingId(null)} />}
      <CreateLoginDialog
        open={Boolean(loginFor)}
        onOpenChange={(open) => !open && setLoginFor(null)}
        employee={loginFor}
        onCreated={setPassword}
      />
      <TemporaryPasswordDialog result={password} onClose={() => setPassword(null)} />
      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Remove ${removing?.fullName ?? ""}?`}
        description="They disappear from the directory, their ERP login is disabled, and they're unlinked as team leader, department head and reporting manager. History is kept."
        confirmLabel="Remove"
        destructive
        loading={remove.isPending}
        onConfirm={confirmRemove}
      />
    </>
  );
}
