"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Copy, Pencil, Plus, Search, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ConfirmDialog from "@/components/common/confirm-dialog";
import DataTable from "@/components/common/data-table";
import FormDialog from "@/components/common/form-dialog";
import FormField, { applyApiErrors } from "@/components/common/form-field";
import PageHeader from "@/components/common/page-header";
import RequirePermission from "@/components/common/require-permission";
import RowActions from "@/components/common/row-actions";
import StatusBadge from "@/components/common/status-badge";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatNumber } from "@/lib/format";
import { toastError } from "@/lib/notify";
import { useAuth, useCan } from "@/modules/auth/auth-provider";
import { SwitchField } from "@/modules/organization/components/fields";
import { roles } from "../api";

const schema = z.object({
  name: z.string().trim().min(2, "At least 2 characters").max(60),
  description: z.string().max(300),
  level: z.coerce.number().int().min(1, "1–99").max(99, "1–99"),
  require2FA: z.boolean(),
});

/** mode: { kind: "new" } | { kind: "edit", role } | { kind: "copy", role } */
function RoleDialog({ mode, onClose, maxLevel }) {
  const create = roles.useCreate();
  const update = roles.useUpdate();
  const [error, setError] = useState(null);
  const role = mode?.role;
  const isEdit = mode?.kind === "edit";

  const form = useForm({
    resolver: zodResolver(schema),
    values: mode && {
      name: isEdit ? role.name : role ? `${role.name} (copy)` : "",
      description: role?.description ?? "",
      level: role ? (isEdit ? role.level : Math.min(role.level, maxLevel)) : Math.min(10, maxLevel),
      require2FA: role?.require2FA ?? false,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      if (isEdit) await update.mutateAsync({ id: role.id, ...values });
      else await create.mutateAsync({ ...values, ...(role && { copyFromRoleId: role.id }) });
      toast.success(isEdit ? "Role updated" : "Role created");
      onClose();
    } catch (apiError) {
      if (!applyApiErrors(apiError, form.setError, ["name", "description", "level"]))
        setError(apiError.message);
    }
  });

  return (
    <FormDialog
      open={Boolean(mode)}
      onOpenChange={(open) => !open && onClose()}
      title={isEdit ? `Edit ${role.name}` : role ? `Duplicate ${role.name}` : "New role"}
      description={
        mode?.kind === "copy"
          ? "The new role starts with the same permissions (only those you can grant)."
          : undefined
      }
      onSubmit={onSubmit}
      submitting={form.formState.isSubmitting}
      error={error}
    >
      <FormField control={form.control} name="name" label="Name" />
      <FormField control={form.control} name="description" label="Description" />
      <FormField
        control={form.control}
        name="level"
        label="Level"
        type="number"
        min={1}
        max={maxLevel}
        disabled={role?.slug === "super-admin"}
        description={`Seniority 1–${maxLevel}. People can only manage roles below their own level.`}
      />
      <SwitchField
        control={form.control}
        name="require2FA"
        label="Require two-factor sign-in"
        description="Recommended for finance and management roles."
      />
    </FormDialog>
  );
}

export default function RolesScreen() {
  const router = useRouter();
  const can = useCan();
  const { user: me } = useAuth();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const debouncedSearch = useDebouncedValue(search);
  const remove = roles.useRemove();

  const { data, isLoading, isFetching, error } = roles.useList({
    search: debouncedSearch,
    page,
    limit: 50,
    sortBy: "level",
    sortOrder: "desc",
  });

  const maxLevel = me.isSuperAdmin ? 99 : Math.max(1, me.role.level - 1);
  const manageable = (role) => me.isSuperAdmin || role.level < me.role.level;

  const confirmDelete = async () => {
    try {
      await remove.mutateAsync(deleting.id);
      toast.success(`Role "${deleting.name}" deleted`);
    } catch (apiError) {
      toastError(apiError);
    }
    setDeleting(null);
  };

  const columns = [
    {
      accessorKey: "name",
      header: "Role",
      cell: ({ row }) => (
        <div className="leading-tight">
          <p className="flex items-center gap-2 font-medium">
            {row.original.name}
            {row.original.slug === "super-admin" && <ShieldCheck className="text-primary size-4" />}
          </p>
          {row.original.description && (
            <p className="text-muted-foreground text-xs">{row.original.description}</p>
          )}
        </div>
      ),
    },
    { accessorKey: "level", header: "Level", meta: { className: "w-20 text-right" } },
    {
      accessorKey: "userCount",
      header: "Users",
      meta: { className: "w-20 text-right" },
      cell: ({ getValue }) => formatNumber(getValue()),
    },
    {
      accessorKey: "permissionCount",
      header: "Permissions",
      meta: { className: "hidden md:table-cell w-28 text-right" },
      cell: ({ row }) =>
        row.original.slug === "super-admin" ? "All" : formatNumber(row.original.permissionCount),
    },
    {
      id: "flags",
      header: "",
      meta: { className: "hidden lg:table-cell" },
      cell: ({ row }) => (
        <div className="flex gap-1">
          {row.original.isSystem && <StatusBadge>System</StatusBadge>}
          {row.original.require2FA && <StatusBadge tone="amber">2FA required</StatusBadge>}
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      meta: { className: "w-12" },
      cell: ({ row }) => {
        const role = row.original;
        return (
          <RowActions
            items={[
              {
                label: "Permissions",
                icon: ShieldCheck,
                onSelect: () => router.push(`/roles/${role.id}`),
              },
              {
                label: "Edit details",
                icon: Pencil,
                onSelect: () => setDialog({ kind: "edit", role }),
                hidden: !can("role.edit") || !manageable(role),
              },
              {
                label: "Duplicate",
                icon: Copy,
                onSelect: () => setDialog({ kind: "copy", role }),
                hidden: !can("role.create") || role.slug === "super-admin",
              },
              {
                label: "Delete",
                icon: Trash2,
                destructive: true,
                separator: true,
                onSelect: () => setDeleting(role),
                hidden: !can("role.delete") || role.isSystem || !manageable(role),
              },
            ]}
          />
        );
      },
    },
  ];

  return (
    <>
      <PageHeader
        title="Roles & Permissions"
        description="Each role decides what people can do in every module and how much data they see (own, team, department, branch or all)."
        actions={
          can("role.create") && (
            <Button onClick={() => setDialog({ kind: "new" })}>
              <Plus /> New role
            </Button>
          )
        }
      />
      <RequirePermission permission="role.view">
        <div className="space-y-4">
          <div className="relative sm:w-64">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              placeholder="Search roles"
              className="pl-8"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
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
              onRowClick={(role) => router.push(`/roles/${role.id}`)}
            />
          )}
        </div>
      </RequirePermission>

      <RoleDialog mode={dialog} onClose={() => setDialog(null)} maxLevel={maxLevel} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete role "${deleting?.name ?? ""}"?`}
        description="Only roles with no users can be deleted."
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
