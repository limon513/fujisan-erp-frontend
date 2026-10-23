"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DataTable from "@/components/common/data-table";
import PageHeader from "@/components/common/page-header";
import RequirePermission from "@/components/common/require-permission";
import ResourceSelect from "@/components/common/resource-select";
import StatusBadge from "@/components/common/status-badge";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDate, formatDateTime, formatMobile } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth, useCan } from "@/modules/auth/auth-provider";
import { leads, leadSources, useAssignees } from "../api";
import { LEAD_STATUS } from "../constants";
import LeadFormSheet from "./lead-form-sheet";

const UNASSIGNED = "__pool__";

function FollowUpCell({ value }) {
  if (!value) return <span className="text-muted-foreground">—</span>;
  const overdue = new Date(value) < new Date();
  return (
    <span className={cn(overdue && "text-destructive font-medium")}>
      {formatDateTime(value)}
      {overdue && <span className="sr-only"> (overdue)</span>}
    </span>
  );
}

const columns = [
  {
    accessorKey: "fullName",
    header: "Lead",
    cell: ({ row }) => (
      <div className="leading-tight">
        <p className="font-medium">{row.original.fullName}</p>
        <p className="text-muted-foreground text-xs">
          {row.original.leadCode} · {row.original.source.name}
          {row.original.preferredProject && ` · ${row.original.preferredProject.name}`}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "mobile",
    header: "Mobile",
    meta: { className: "hidden sm:table-cell whitespace-nowrap" },
    cell: ({ getValue }) => formatMobile(getValue()),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => (
      <StatusBadge tone={LEAD_STATUS[getValue()].tone}>{LEAD_STATUS[getValue()].label}</StatusBadge>
    ),
  },
  {
    id: "owner",
    header: "Assigned to",
    meta: { className: "hidden lg:table-cell" },
    cell: ({ row }) =>
      row.original.owner ? (
        row.original.owner.fullName
      ) : (
        <span className="text-muted-foreground">Nobody yet</span>
      ),
  },
  {
    accessorKey: "nextFollowUpAt",
    header: "Next follow-up",
    meta: { className: "hidden md:table-cell whitespace-nowrap" },
    cell: ({ getValue }) => <FollowUpCell value={getValue()} />,
  },
  {
    accessorKey: "createdAt",
    header: "Added",
    meta: { className: "hidden xl:table-cell whitespace-nowrap" },
    cell: ({ getValue }) => formatDate(getValue()),
  },
];

const SORTS = {
  newest: { sortBy: "createdAt", sortOrder: "desc" },
  followUp: { sortBy: "nextFollowUpAt", sortOrder: "asc" },
  activity: { sortBy: "lastActivityAt", sortOrder: "desc" },
};

export default function LeadsScreen() {
  const router = useRouter();
  const can = useCan();
  const { user: me } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("OPEN");
  const [sourceId, setSourceId] = useState("");
  const [owner, setOwner] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const debouncedSearch = useDebouncedValue(search);
  const scope = me.isSuperAdmin ? "ALL" : me.permissions["lead.view"];

  const { data, isLoading, isFetching, error } = leads.useList({
    search: debouncedSearch,
    status,
    sourceId,
    ...(owner === UNASSIGNED ? { unassigned: true } : { ownerId: owner }),
    page,
    limit: 20,
    ...SORTS[sort],
  });

  const filter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Leads"
        description={
          scope === "OWN"
            ? "People interested in a plot, assigned to you."
            : "People interested in a plot, and who is working each one."
        }
        actions={
          can("lead.create") && (
            <Button onClick={() => setAdding(true)}>
              <Plus /> New lead
            </Button>
          )
        }
      />
      <RequirePermission permission="lead.view">
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <div className="relative sm:w-64">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                placeholder="Name, code, mobile or email"
                className="pl-8"
                value={search}
                onChange={(e) => filter(setSearch)(e.target.value)}
              />
            </div>
            <Select value={status} onValueChange={filter(setStatus)}>
              <SelectTrigger className="sm:w-40" aria-label="Status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPEN">Open leads</SelectItem>
                <SelectItem value="all">Any status</SelectItem>
                {Object.entries(LEAD_STATUS).map(([value, { label }]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="sm:w-40">
              <ResourceSelect
                resource={leadSources}
                params={{ sortBy: "sortOrder", sortOrder: "asc" }}
                value={sourceId}
                onChange={filter(setSourceId)}
                emptyLabel="All sources"
                placeholder="All sources"
              />
            </div>
            {can("lead.assign") && <OwnerFilter value={owner} onChange={filter(setOwner)} />}
            <Select value={sort} onValueChange={setSort}>
              <SelectTrigger className="sm:w-44" aria-label="Sort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="followUp">Follow-up due first</SelectItem>
                <SelectItem value="activity">Recently worked</SelectItem>
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
              onRowClick={(lead) => router.push(`/crm/leads/${lead.id}`)}
              emptyMessage="No leads match."
            />
          )}
        </div>
      </RequirePermission>
      <LeadFormSheet
        open={adding}
        onOpenChange={setAdding}
        lead={null}
        onSaved={(lead) => router.push(`/crm/leads/${lead.id}`)}
      />
    </>
  );
}

function OwnerFilter({ value, onChange }) {
  const { data = [] } = useAssignees();
  return (
    <Select value={value || "all"} onValueChange={(v) => onChange(v === "all" ? "" : v)}>
      <SelectTrigger className="sm:w-48" aria-label="Assigned to">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Anyone</SelectItem>
        <SelectItem value={UNASSIGNED}>Nobody yet (pool)</SelectItem>
        {data.map((employee) => (
          <SelectItem key={employee.id} value={employee.id}>
            {employee.fullName}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
