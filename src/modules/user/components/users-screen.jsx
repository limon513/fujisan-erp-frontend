"use client";

import { useState } from "react";
import { KeyRound, LockOpen, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
import { formatDateTime } from "@/lib/format";
import { toastError } from "@/lib/notify";
import { useAuth, useCan } from "@/modules/auth/auth-provider";
import { roles, users } from "../api";
import CreateLoginDialog from "./create-login-dialog";
import EditUserDialog from "./edit-user-dialog";
import TemporaryPasswordDialog from "./temporary-password-dialog";

const statusOf = (user) =>
  user.isLocked
    ? { label: "Locked", tone: "red" }
    : user.status === "ACTIVE"
      ? { label: "Active", tone: "green" }
      : { label: "Inactive", tone: "gray" };

export default function UsersScreen() {
  const can = useCan();
  const { user: me } = useAuth();
  const [search, setSearch] = useState("");
  const [roleId, setRoleId] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [password, setPassword] = useState(null);
  const [confirm, setConfirm] = useState(null); // { kind: "reset" | "delete", user }
  const debouncedSearch = useDebouncedValue(search);

  const { data, isLoading, isFetching, error } = users.useList({
    search: debouncedSearch,
    roleId,
    status,
    page,
    limit: 20,
    sortBy: "username",
    sortOrder: "asc",
  });
  const resetPassword = users.usePostAction("reset-password");
  const unlock = users.usePostAction("unlock");
  const remove = users.useRemove();

  // Mirrors the API's level guard so the menu only offers what will work
  const canManage = (user) => me.isSuperAdmin || user.role.level < me.role.level;

  const runConfirm = async () => {
    const { kind, user } = confirm;
    try {
      if (kind === "reset") {
        const result = await resetPassword.mutateAsync({ id: user.id });
        setPassword({ username: user.username, password: result.temporaryPassword });
      } else {
        await remove.mutateAsync(user.id);
        toast.success(`${user.username} deleted`);
      }
    } catch (apiError) {
      toastError(apiError);
    }
    setConfirm(null);
  };

  const doUnlock = async (user) => {
    try {
      await unlock.mutateAsync({ id: user.id });
      toast.success(`${user.username} unlocked`);
    } catch (apiError) {
      toastError(apiError);
    }
  };

  const columns = [
    {
      accessorKey: "username",
      header: "User",
      cell: ({ row }) => (
        <div className="leading-tight">
          <p className="font-medium">
            {row.original.username}
            {row.original.id === me.id && (
              <span className="text-muted-foreground font-normal"> (you)</span>
            )}
          </p>
          <p className="text-muted-foreground text-xs">{row.original.email ?? "—"}</p>
        </div>
      ),
    },
    {
      id: "employee",
      header: "Employee",
      meta: { className: "hidden md:table-cell" },
      cell: ({ row }) =>
        row.original.employee ? (
          <div className="leading-tight">
            <p>{row.original.employee.fullName}</p>
            <p className="text-muted-foreground text-xs">
              {row.original.employee.employeeCode} · {row.original.employee.branch.name}
            </p>
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    { id: "role", header: "Role", cell: ({ row }) => row.original.role.name },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = statusOf(row.original);
        return (
          <div className="flex flex-wrap gap-1">
            <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
            {row.original.mustChangePassword && (
              <StatusBadge tone="amber">Must change password</StatusBadge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "lastLoginAt",
      header: "Last sign-in",
      meta: { className: "hidden lg:table-cell whitespace-nowrap" },
      cell: ({ getValue }) =>
        getValue() ? (
          formatDateTime(getValue())
        ) : (
          <span className="text-muted-foreground">Never</span>
        ),
    },
    {
      id: "actions",
      header: "",
      meta: { className: "w-12" },
      cell: ({ row }) => {
        const user = row.original;
        const manageable = canManage(user);
        const self = user.id === me.id;
        return (
          <RowActions
            items={[
              {
                label: "Edit",
                icon: Pencil,
                onSelect: () => setEditing(user),
                hidden: !can("user.edit") || !manageable,
              },
              {
                label: "Unlock",
                icon: LockOpen,
                onSelect: () => doUnlock(user),
                hidden: !user.isLocked || !can("user.edit") || !manageable,
              },
              {
                label: "Reset password",
                icon: KeyRound,
                onSelect: () => setConfirm({ kind: "reset", user }),
                hidden: self || !can("user.reset-password") || !manageable,
              },
              {
                label: "Delete",
                icon: Trash2,
                destructive: true,
                separator: true,
                onSelect: () => setConfirm({ kind: "delete", user }),
                hidden: self || !can("user.delete") || !manageable,
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
        title="User Accounts"
        description="ERP logins and their roles. Create logins for employees from the Employees screen."
        actions={
          can("user.create") && (
            <Button variant="outline" onClick={() => setCreating(true)}>
              <Plus /> New user without employee
            </Button>
          )
        }
      />
      <RequirePermission permission="user.view">
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <div className="relative sm:w-64">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                placeholder="Username, email, name or ID"
                className="pl-8"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="sm:w-48">
              <ResourceSelect
                resource={roles}
                params={{ sortBy: "level", sortOrder: "desc" }}
                value={roleId}
                onChange={(value) => {
                  setRoleId(value);
                  setPage(1);
                }}
                emptyLabel="All roles"
                placeholder="All roles"
              />
            </div>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="sm:w-36" aria-label="Status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
                <SelectItem value="LOCKED">Locked</SelectItem>
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
              onRowClick={
                can("user.edit") ? (user) => canManage(user) && setEditing(user) : undefined
              }
              emptyMessage="No user accounts match these filters."
            />
          )}
        </div>
      </RequirePermission>

      <CreateLoginDialog open={creating} onOpenChange={setCreating} onCreated={setPassword} />
      <EditUserDialog
        user={editing}
        isSelf={editing?.id === me.id}
        onClose={() => setEditing(null)}
      />
      <TemporaryPasswordDialog result={password} onClose={() => setPassword(null)} />
      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={
          confirm?.kind === "reset"
            ? `Reset the password of ${confirm.user.username}?`
            : `Delete ${confirm?.user.username ?? ""}?`
        }
        description={
          confirm?.kind === "reset"
            ? "A temporary password is generated, the account is unlocked and the user is signed out everywhere."
            : "The login stops working immediately. The employee record stays, and can get a new login later."
        }
        confirmLabel={confirm?.kind === "reset" ? "Reset password" : "Delete"}
        destructive={confirm?.kind === "delete"}
        loading={resetPassword.isPending || remove.isPending}
        onConfirm={runConfirm}
      />
    </>
  );
}
