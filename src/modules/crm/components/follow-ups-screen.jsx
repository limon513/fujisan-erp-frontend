"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Ellipsis } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CellActions from "@/components/common/cell-actions";
import DataTable from "@/components/common/data-table";
import PageHeader from "@/components/common/page-header";
import RequirePermission from "@/components/common/require-permission";
import { formatDateTime, formatMobile } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth, useCan } from "@/modules/auth/auth-provider";
import { followUps, useFollowUpCounts } from "../api";
import { FOLLOW_UP_TYPES } from "../constants";
import { CancelDialog, CompleteFollowUpDialog, FollowUpDialog } from "./schedule-dialogs";

const TABS = [
  ["overdue", "Overdue"],
  ["today", "Today"],
  ["upcoming", "Later"],
  ["done", "Done"],
];

const EMPTY = {
  overdue: "Nothing overdue. Well done.",
  today: "No follow-ups due today.",
  upcoming: "Nothing planned after today.",
  done: "No follow-ups done in the last 30 days.",
};

export default function FollowUpsScreen() {
  const router = useRouter();
  const can = useCan();
  const { user: me } = useAuth();
  const [tab, setTab] = useState("today");
  const [mine, setMine] = useState(Boolean(me.employee));
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState(null);
  const scope = me.isSuperAdmin ? "ALL" : me.permissions["follow-up.view"];
  const { data: counts } = useFollowUpCounts({ mine });
  const { data, isLoading, isFetching, error } = followUps.useList({
    when: tab,
    mine: mine || undefined,
    page,
    limit: 25,
  });

  const columns = useMemo(
    () => [
      {
        accessorKey: "dueAt",
        header: tab === "done" ? "Done" : "When",
        meta: { className: "whitespace-nowrap" },
        cell: ({ row }) => {
          const f = row.original;
          if (tab === "done") return formatDateTime(f.doneAt);
          const overdue = new Date(f.dueAt) < new Date();
          return (
            <span className={cn(overdue && "text-destructive font-medium")}>
              {formatDateTime(f.dueAt)}
            </span>
          );
        },
      },
      {
        id: "lead",
        header: "Lead",
        cell: ({ row }) => (
          <div className="leading-tight">
            <p className="font-medium">
              {FOLLOW_UP_TYPES[row.original.type]} · {row.original.lead.fullName}
            </p>
            <p className="text-muted-foreground text-xs">
              {row.original.lead.leadCode} · {formatMobile(row.original.lead.mobile)}
            </p>
          </div>
        ),
      },
      {
        id: "about",
        header: tab === "done" ? "What happened" : "About",
        meta: { className: "hidden md:table-cell max-w-80" },
        cell: ({ row }) => (
          <span className="line-clamp-2">
            {(tab === "done" ? row.original.outcome : row.original.purpose) ?? (
              <span className="text-muted-foreground">—</span>
            )}
          </span>
        ),
      },
      ...(mine
        ? []
        : [
            {
              id: "owner",
              header: "Who",
              meta: { className: "hidden lg:table-cell" },
              cell: ({ row }) =>
                row.original.owner?.fullName ?? (
                  <span className="text-muted-foreground">Nobody</span>
                ),
            },
          ]),
      ...(tab !== "done" && can("follow-up.edit")
        ? [
            {
              id: "actions",
              header: "",
              meta: { className: "w-32" },
              cell: ({ row }) => (
                <CellActions>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDialog({ name: "done", item: row.original })}
                  >
                    <Check /> Done
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon-sm" variant="ghost" aria-label="Follow-up options">
                        <Ellipsis />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={() => setDialog({ name: "edit", item: row.original })}
                      >
                        Reschedule
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => setDialog({ name: "cancel", item: row.original })}
                      >
                        Cancel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CellActions>
              ),
            },
          ]
        : []),
    ],
    [tab, mine, can],
  );

  const close = (isOpen) => !isOpen && setDialog(null);
  const label = (value, text) =>
    counts && value !== "done" && counts[value] ? `${text} (${counts[value]})` : text;

  return (
    <>
      <PageHeader
        title="Follow-ups"
        description="Calls and messages planned with leads. Reminders go out 15 minutes before."
      />
      <RequirePermission permission="follow-up.view">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs
              value={tab}
              onValueChange={(value) => {
                setTab(value);
                setPage(1);
              }}
            >
              <TabsList>
                {TABS.map(([value, text]) => (
                  <TabsTrigger key={value} value={value}>
                    {label(value, text)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            {me.employee && scope !== "OWN" && (
              <div className="flex items-center gap-2">
                <Switch
                  id="mine"
                  checked={mine}
                  onCheckedChange={(value) => {
                    setMine(value);
                    setPage(1);
                  }}
                />
                <Label htmlFor="mine">Only mine</Label>
              </div>
            )}
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
              onRowClick={(f) => router.push(`/crm/leads/${f.lead.id}`)}
              emptyMessage={EMPTY[tab]}
            />
          )}
        </div>
      </RequirePermission>
      {dialog?.name === "done" && (
        <CompleteFollowUpDialog followUp={dialog.item} open onOpenChange={close} />
      )}
      {dialog?.name === "edit" && (
        <FollowUpDialog lead={dialog.item.lead} followUp={dialog.item} open onOpenChange={close} />
      )}
      {dialog?.name === "cancel" && (
        <CancelDialog kind="followUp" item={dialog.item} open onOpenChange={close} />
      )}
    </>
  );
}
