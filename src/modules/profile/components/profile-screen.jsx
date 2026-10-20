"use client";

import { useState } from "react";
import Link from "next/link";
import { KeyRound, LogOut, Monitor, MonitorX, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ConfirmDialog from "@/components/common/confirm-dialog";
import DataTable from "@/components/common/data-table";
import PageHeader from "@/components/common/page-header";
import StatusBadge from "@/components/common/status-badge";
import { formatDateTime, formatMobile } from "@/lib/format";
import { toastError } from "@/lib/notify";
import { describeUserAgent } from "@/lib/user-agent";
import { useAuth } from "@/modules/auth/auth-provider";
import { useMyLoginHistory, useMySessions, useRevokeSession } from "../api";

const Detail = ({ label, children }) => (
  <div className="grid grid-cols-[8rem_1fr] gap-2 py-1.5 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="min-w-0 break-words">{children || "—"}</span>
  </div>
);

const isMobile = (ua) => /Android|iPhone|iPad|Mobile/.test(ua ?? "");

function Sessions() {
  const { data: sessions, isLoading } = useMySessions();
  const revoke = useRevokeSession();

  const signOut = async (session) => {
    try {
      await revoke.mutateAsync(session.id);
      toast.success("Device signed out");
    } catch (error) {
      toastError(error);
    }
  };

  if (isLoading) return <Skeleton className="h-24 w-full" />;

  return (
    <ul className="divide-y">
      {sessions.map((session) => {
        const Icon = isMobile(session.userAgent) ? Smartphone : Monitor;
        return (
          <li key={session.id} className="flex items-center gap-3 py-3">
            <Icon className="text-muted-foreground size-5 shrink-0" />
            <div className="min-w-0 flex-1 text-sm leading-tight">
              <p className="flex flex-wrap items-center gap-2 font-medium">
                {describeUserAgent(session.userAgent)}
                {session.current && <StatusBadge tone="green">This device</StatusBadge>}
              </p>
              <p className="text-muted-foreground text-xs">
                {session.ip ?? "Unknown IP"} · signed in {formatDateTime(session.createdAt)} · last
                active {formatDateTime(session.lastUsedAt)}
              </p>
            </div>
            {!session.current && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut(session)}
                disabled={revoke.isPending}
              >
                Sign out
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

const historyColumns = [
  {
    accessorKey: "createdAt",
    header: "When",
    cell: ({ getValue }) => <span className="whitespace-nowrap">{formatDateTime(getValue())}</span>,
  },
  {
    accessorKey: "success",
    header: "Result",
    cell: ({ row }) =>
      row.original.success ? (
        <StatusBadge tone="green">Signed in</StatusBadge>
      ) : (
        <StatusBadge tone="red">
          Failed{row.original.failureReason === "LOCKED" ? " (locked)" : ""}
        </StatusBadge>
      ),
  },
  { id: "device", header: "Device", cell: ({ row }) => describeUserAgent(row.original.userAgent) },
  {
    accessorKey: "ip",
    header: "IP address",
    meta: { className: "hidden md:table-cell" },
    cell: ({ getValue }) => getValue() ?? "—",
  },
];

function LoginHistory() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching } = useMyLoginHistory(page);
  return (
    <DataTable
      columns={historyColumns}
      data={data?.data}
      meta={data?.meta}
      isLoading={isLoading}
      isFetching={isFetching}
      onPageChange={setPage}
      emptyMessage="No sign-ins yet."
    />
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [confirmAll, setConfirmAll] = useState(false);
  const employee = user.employee;

  return (
    <div className="max-w-5xl space-y-6">
      <PageHeader
        title="My profile"
        description="Your account, the devices you're signed in on, and your recent sign-ins."
        actions={
          <Button variant="outline" asChild>
            <Link href="/change-password">
              <KeyRound /> Change password
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent>
            <Detail label="Username">{user.username}</Detail>
            <Detail label="Email">{user.email}</Detail>
            <Detail label="Mobile">{user.mobile && formatMobile(user.mobile)}</Detail>
            <Detail label="Role">{user.role.name}</Detail>
            <Detail label="Last sign-in">
              {user.lastLoginAt && formatDateTime(user.lastLoginAt)}
            </Detail>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Employee</CardTitle>
            {!employee && (
              <CardDescription>This account isn&apos;t linked to an employee.</CardDescription>
            )}
          </CardHeader>
          {employee && (
            <CardContent>
              <Detail label="Name">{employee.fullName}</Detail>
              <Detail label="Employee ID">{employee.employeeCode}</Detail>
              <Detail label="Designation">{employee.designation?.name}</Detail>
              <Detail label="Department">{employee.department?.name}</Detail>
              <Detail label="Branch">{employee.branch?.name}</Detail>
              <Detail label="Team">{employee.team?.name}</Detail>
            </CardContent>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1.5">
            <CardTitle>Active devices</CardTitle>
            <CardDescription>Sign out any device you don&apos;t recognise.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => setConfirmAll(true)}>
            <MonitorX /> Sign out everywhere
          </Button>
        </CardHeader>
        <CardContent>
          <Sessions />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sign-in history</CardTitle>
          <CardDescription>Including failed attempts.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginHistory />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmAll}
        onOpenChange={setConfirmAll}
        title="Sign out of every device?"
        description="Including this one. You'll need to sign in again."
        confirmLabel={
          <>
            <LogOut /> Sign out everywhere
          </>
        }
        onConfirm={() => logout({ everywhere: true })}
      />
    </div>
  );
}
