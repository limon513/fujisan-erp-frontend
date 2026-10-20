"use client";

import { useState } from "react";
import { FileUp, Plus, Search } from "lucide-react";
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
import ResourceSelect from "@/components/common/resource-select";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatBDT, formatDateTime, formatNumber } from "@/lib/format";
import { useCan } from "@/modules/auth/auth-provider";
import { projects, useProjectChildren } from "@/modules/project/api";
import { PLOT_STATUS } from "@/modules/project/constants";
import { plots } from "../api";
import { FACING_LABELS } from "../constants";
import ImportPlotsDialog from "./import-plots-dialog";
import PlotDetailSheet from "./plot-detail-sheet";
import PlotFormDialog from "./plot-form-dialog";
import PlotStatusBadge from "./plot-status-badge";

const columns = [
  {
    accessorKey: "code",
    header: "Plot",
    cell: ({ row }) => (
      <div className="leading-tight">
        <p className="font-medium">{row.original.code}</p>
        <p className="text-muted-foreground text-xs">
          {row.original.block.name}
          {row.original.road && ` · ${row.original.road.name}`}
        </p>
      </div>
    ),
  },
  {
    id: "project",
    header: "Project",
    meta: { className: "hidden xl:table-cell" },
    cell: ({ row }) => row.original.project.name,
  },
  {
    accessorKey: "areaSqft",
    header: "Area (sqft)",
    meta: { className: "text-right" },
    cell: ({ getValue }) => <span className="tabular-nums">{formatNumber(getValue())}</span>,
  },
  {
    accessorKey: "price",
    header: "Price",
    meta: { className: "text-right" },
    cell: ({ row }) => (
      <div className="leading-tight tabular-nums">
        <p>{formatBDT(row.original.price)}</p>
        <p className="text-muted-foreground text-xs">{formatBDT(row.original.ratePerSqft)}/sqft</p>
      </div>
    ),
  },
  {
    accessorKey: "facing",
    header: "Facing",
    meta: { className: "hidden md:table-cell" },
    cell: ({ getValue }) => (getValue() ? FACING_LABELS[getValue()] : "—"),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <div className="leading-tight">
        <PlotStatusBadge status={row.original.status} />
        {row.original.activeHold && (
          <p className="text-muted-foreground mt-1 text-xs">
            until {formatDateTime(row.original.activeHold.expiresAt)}
          </p>
        )}
      </div>
    ),
  },
];

function BlockFilter({ projectId, value, onChange }) {
  const { data = [] } = useProjectChildren(projectId, "blocks");
  return (
    <Select
      value={value || "all"}
      onValueChange={(v) => onChange(v === "all" ? "" : v)}
      disabled={!projectId}
    >
      <SelectTrigger className="md:w-40" aria-label="Block">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All blocks</SelectItem>
        {data.map((block) => (
          <SelectItem key={block.id} value={block.id}>
            {block.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Plot list with filters, add, import and a detail sheet.
 * With `project` the list is fixed to that project (project page tab).
 */
export default function PlotsTable({ project }) {
  const can = useCan();
  const [filters, setFilters] = useState({
    projectId: project?.id ?? "",
    blockId: "",
    status: "all",
    search: "",
  });
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const search = useDebouncedValue(filters.search);
  const { data: selectedProject } = projects.useItem(
    !project && filters.projectId ? filters.projectId : null,
  );
  const importProject = project ?? selectedProject;

  const { data, isLoading, isFetching, error } = plots.useList({
    ...filters,
    search,
    page,
    limit: 25,
    sortBy: "code",
    sortOrder: "asc",
  });

  const set = (patch) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
        <div className="relative md:w-52">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            placeholder="Plot code or number"
            className="pl-8"
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
          />
        </div>
        {!project && (
          <div className="md:w-52">
            <ResourceSelect
              resource={projects}
              value={filters.projectId}
              onChange={(projectId) => set({ projectId, blockId: "" })}
              emptyLabel="All projects"
              placeholder="All projects"
            />
          </div>
        )}
        <BlockFilter
          projectId={filters.projectId}
          value={filters.blockId}
          onChange={(blockId) => set({ blockId })}
        />
        <Select value={filters.status} onValueChange={(status) => set({ status })}>
          <SelectTrigger className="md:w-36" aria-label="Status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(PLOT_STATUS).map(([value, { label }]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2 md:ml-auto">
          {can("plot.create") && (
            <>
              <Button
                variant="outline"
                onClick={() => setImporting(true)}
                disabled={!importProject}
                title={importProject ? undefined : "Choose a project first"}
              >
                <FileUp /> Import
              </Button>
              <Button onClick={() => setAdding(true)}>
                <Plus /> New plot
              </Button>
            </>
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
          onRowClick={(plot) => setSelectedId(plot.id)}
          emptyMessage="No plots match these filters."
        />
      )}

      <PlotDetailSheet plotId={selectedId} onClose={() => setSelectedId(null)} />
      <PlotFormDialog
        open={adding}
        onOpenChange={setAdding}
        projectId={project?.id ?? (filters.projectId || undefined)}
      />
      {importProject && (
        <ImportPlotsDialog open={importing} onOpenChange={setImporting} project={importProject} />
      )}
    </div>
  );
}
