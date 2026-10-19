"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import PageHeader from "@/components/common/page-header";
import RequirePermission from "@/components/common/require-permission";
import StatusBadge from "@/components/common/status-badge";
import { toastError } from "@/lib/notify";
import { useAuth, useCan } from "@/modules/auth/auth-provider";
import { roles, usePermissionCatalog, useSetRolePermissions } from "../api";
import PermissionMatrix from "./permission-matrix";
import { SCOPE_HINTS, SCOPE_LABELS, SCOPES } from "./scope";

const SUPER_ADMIN = "super-admin";

function Editor({ role, catalog }) {
  const { user: me } = useAuth();
  const can = useCan();
  const save = useSetRolePermissions();
  const [draft, setDraft] = useState(role.permissions);

  const readOnlyReason =
    role.slug === SUPER_ADMIN
      ? "Super Admin always has full access."
      : !can("role.edit")
        ? "You can view this role but not change it."
        : !me.isSuperAdmin && role.level >= me.role.level
          ? "You can only edit roles below your own level."
          : null;

  const changes = useMemo(() => {
    const keys = new Set([...Object.keys(draft), ...Object.keys(role.permissions)]);
    return [...keys].filter((key) => draft[key] !== role.permissions[key]).length;
  }, [draft, role.permissions]);

  const onChange = (key, scope) =>
    setDraft((current) => {
      const next = { ...current };
      if (scope) next[key] = scope;
      else delete next[key];
      return next;
    });

  const onSave = async () => {
    try {
      await save.mutateAsync({
        id: role.id,
        permissions: Object.entries(draft).map(([key, scope]) => ({ key, scope })),
      });
      toast.success("Permissions saved. Users of this role get them on their next action.");
    } catch (error) {
      toastError(error);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      {readOnlyReason && (
        <Alert>
          <Lock />
          <AlertDescription>{readOnlyReason}</AlertDescription>
        </Alert>
      )}
      {role.slug !== SUPER_ADMIN && (
        <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span className="text-foreground font-medium">Data scope:</span>
          {SCOPES.map((scope) => (
            <span key={scope}>
              <span className="text-foreground">{SCOPE_LABELS[scope]}</span> —{" "}
              {SCOPE_HINTS[scope].toLowerCase()}
            </span>
          ))}
        </div>
      )}
      {role.slug === SUPER_ADMIN ? null : (
        <PermissionMatrix
          catalog={catalog}
          value={draft}
          onChange={onChange}
          me={me}
          readOnly={Boolean(readOnlyReason)}
        />
      )}

      {changes > 0 && (
        <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed inset-x-0 bottom-0 z-20 border-t backdrop-blur md:left-[var(--sidebar-width)]">
          <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
            <p className="text-sm">
              <span className="font-medium">{changes}</span> unsaved change
              {changes === 1 ? "" : "s"}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setDraft(role.permissions)}
                disabled={save.isPending}
              >
                Discard
              </Button>
              <Button onClick={onSave} disabled={save.isPending}>
                {save.isPending && <Spinner />}
                Save permissions
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RolePermissionsScreen() {
  const { id } = useParams();
  const { data: role, isLoading, error } = roles.useItem(id);
  const { data: catalog } = usePermissionCatalog();

  return (
    <RequirePermission permission="role.view">
      <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
        <Link href="/roles">
          <ArrowLeft /> All roles
        </Link>
      </Button>
      {error ? (
        <p className="text-destructive text-sm">{error.message}</p>
      ) : isLoading || !catalog ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          <PageHeader
            title={role.name}
            description={
              role.description ?? "Choose what this role can do and how much data it sees."
            }
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone="gray">Level {role.level}</StatusBadge>
                <StatusBadge tone="blue">
                  {role.userCount} user{role.userCount === 1 ? "" : "s"}
                </StatusBadge>
                {role.isSystem && <StatusBadge tone="gray">System role</StatusBadge>}
                {role.slug === "super-admin" && (
                  <StatusBadge tone="green">
                    <ShieldCheck className="size-3" /> Full access
                  </StatusBadge>
                )}
              </div>
            }
          />
          {/* key: reset the draft whenever the saved permissions change */}
          <Editor key={`${role.id}:${role.permissionsVersion}`} role={role} catalog={catalog} />
        </>
      )}
    </RequirePermission>
  );
}
