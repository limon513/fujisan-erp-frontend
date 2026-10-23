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
import ResourceSelect from "@/components/common/resource-select";
import StatusBadge from "@/components/common/status-badge";
import { formatDateTime, formatMobile } from "@/lib/format";
import { useAuth, useCan } from "@/modules/auth/auth-provider";
import { projects } from "@/modules/project/api";
import { siteVisits, useVisitCounts } from "../api";
import { INTEREST, TRANSPORTS, VISIT_STATUS } from "../constants";
import { CancelDialog, CompleteVisitDialog, SiteVisitDialog } from "./schedule-dialogs";

const TABS = [
  ["today", "Today"],
  ["upcoming", "Later"],
  ["missed", "Not recorded"],
  ["past", "Past"],
];

const EMPTY = {
  today: "No site visits today.",
  upcoming: "No visits booked after today.",
  missed: "Every past visit has been recorded.",
  past: "No visits yet.",
};

export default function SiteVisitsScreen() {
  const router = useRouter();
  const can = useCan();
  const { user: me } = useAuth();
  const [tab, setTab] = useState("today");
  const [mine, setMine] = useState(Boolean(me.employee));
  const [projectId, setProjectId] = useState("");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState(null);
  const scope = me.isSuperAdmin ? "ALL" : me.permissions["site-visit.view"];
  const { data: counts } = useVisitCounts({ mine });
  const { data, isLoading, isFetching, error } = siteVisits.useList({
    when: tab,
    mine: mine || undefined,
    projectId,
    page,
    limit: 25,
  });

  const columns = useMemo(
    () => [
      {
        accessorKey: "scheduledAt",
        header: "When",
        meta: { className: "whitespace-nowrap" },
        cell: ({ getValue }) => formatDateTime(getValue()),
      },
      {
        id: "lead",
        header: "Visitor",
        cell: ({ row }) => (
          <div className="leading-tight">
            <p className="font-medium">{row.original.lead.fullName}</p>
            <p className="text-muted-foreground text-xs">
              {formatMobile(row.original.lead.mobile)} · {row.original.visitors}{" "}
              {row.original.visitors === 1 ? "person" : "people"}
            </p>
          </div>
        ),
      },
      {
        id: "where",
        header: "Project / transport",
        meta: { className: "hidden md:table-cell" },
        cell: ({ row }) => (
          <div className="leading-tight">
            <p>{row.original.project.name}</p>
            <p className="text-muted-foreground text-xs">
              {TRANSPORTS[row.original.transport]}
              {row.original.pickupPoint && ` from ${row.original.pickupPoint}`}
            </p>
          </div>
        ),
      },
      ...(mine
        ? []
        : [
            {
              id: "owner",
              header: "With",
              meta: { className: "hidden lg:table-cell" },
              cell: ({ row }) =>
                row.original.owner?.fullName ?? (
                  <span className="text-muted-foreground">Nobody</span>
                ),
            },
          ]),
      ...(tab === "past"
        ? [
            {
              id: "result",
              header: "Result",
              cell: ({ row }) => (
                <div className="flex flex-wrap gap-1">
                  <StatusBadge tone={VISIT_STATUS[row.original.status].tone}>
                    {VISIT_STATUS[row.original.status].label}
                  </StatusBadge>
                  {row.original.interest && (
                    <StatusBadge tone={INTEREST[row.original.interest].tone}>
                      {INTEREST[row.original.interest].label}
                    </StatusBadge>
                  )}
                </div>
              ),
            },
          ]
        : can("site-visit.edit")
          ? [
              {
                id: "actions",
                header: "",
                meta: { className: "w-36" },
                cell: ({ row }) => (
                  <CellActions>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDialog({ name: "result", item: row.original })}
                    >
                      <Check /> Record
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon-sm" variant="ghost" aria-label="Visit options">
                          <Ellipsis />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onSelect={() => setDialog({ name: "edit", item: row.original })}
                        >
                          Change
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
    counts && value !== "past" && counts[value] ? `${text} (${counts[value]})` : text;

  return (
    <>
      <PageHeader
        title="Site visits"
        description="Customers visiting projects. The person going along is reminded 2 hours before."
      />
      <RequirePermission permission="site-visit.view">
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
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-48">
                <ResourceSelect
                  resource={projects}
                  value={projectId}
                  onChange={(value) => {
                    setProjectId(value);
                    setPage(1);
                  }}
                  emptyLabel="All projects"
                  placeholder="All projects"
                />
              </div>
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
              onRowClick={(visit) => router.push(`/crm/leads/${visit.lead.id}`)}
              emptyMessage={EMPTY[tab]}
            />
          )}
        </div>
      </RequirePermission>
      {dialog?.name === "result" && (
        <CompleteVisitDialog visit={dialog.item} open onOpenChange={close} />
      )}
      {dialog?.name === "edit" && (
        <SiteVisitDialog lead={dialog.item.lead} visit={dialog.item} open onOpenChange={close} />
      )}
      {dialog?.name === "cancel" && (
        <CancelDialog kind="visit" item={dialog.item} open onOpenChange={close} />
      )}
    </>
  );
}
