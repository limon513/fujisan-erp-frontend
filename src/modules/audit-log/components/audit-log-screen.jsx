"use client";

import { useState } from "react";
import DataTable from "@/components/common/data-table";
import PageHeader from "@/components/common/page-header";
import RequirePermission from "@/components/common/require-permission";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDateTime } from "@/lib/format";
import { useAuditLogs } from "../api";
import ActionBadge from "./action-badge";
import AuditEntrySheet from "./audit-entry-sheet";
import AuditLogFilters, { EMPTY_FILTERS } from "./audit-log-filters";

const columns = [
  {
    accessorKey: "createdAt",
    header: "When",
    cell: ({ getValue }) => <span className="whitespace-nowrap">{formatDateTime(getValue())}</span>,
  },
  {
    id: "user",
    header: "User",
    cell: ({ row }) =>
      row.original.user ? (
        <div className="leading-tight">
          <p>{row.original.user.name}</p>
          {row.original.user.username && (
            <p className="text-muted-foreground text-xs">{row.original.user.username}</p>
          )}
        </div>
      ) : (
        <span className="text-muted-foreground">System</span>
      ),
  },
  {
    accessorKey: "action",
    header: "Action",
    cell: ({ getValue }) => <ActionBadge action={getValue()} />,
  },
  {
    accessorKey: "description",
    header: "Description",
    meta: { className: "min-w-64" },
    cell: ({ row }) => (
      <div className="leading-tight">
        <p>{row.original.description ?? row.original.entityType}</p>
        {row.original.changedFields.length > 0 && row.original.action === "UPDATE" && (
          <p className="text-muted-foreground text-xs">
            Changed: {row.original.changedFields.join(", ")}
          </p>
        )}
      </div>
    ),
  },
  {
    accessorKey: "ip",
    header: "IP address",
    meta: { className: "hidden lg:table-cell" },
    cell: ({ getValue }) => <span className="text-muted-foreground">{getValue() ?? "—"}</span>,
  },
];

function AuditLogContent() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const search = useDebouncedValue(filters.search);

  const { data, isLoading, isFetching, error } = useAuditLogs({
    ...filters,
    search,
    page,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  const changeFilters = (next) => {
    setFilters(next);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <AuditLogFilters value={filters} onChange={changeFilters} />
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
          onRowClick={(entry) => setSelectedId(entry.id)}
          emptyMessage="No audit entries match these filters."
        />
      )}
      <AuditEntrySheet entryId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}

export default function AuditLogScreen() {
  return (
    <>
      <PageHeader
        title="Audit Log"
        description="Who changed what, when and from where. Click an entry to see the old and new values."
      />
      <RequirePermission permission="audit-log.view">
        <AuditLogContent />
      </RequirePermission>
    </>
  );
}
