"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { CalendarClock, Ellipsis, List, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import FormDialog from "@/components/common/form-dialog";
import FormField from "@/components/common/form-field";
import PageHeader from "@/components/common/page-header";
import RequirePermission from "@/components/common/require-permission";
import ResourceSelect from "@/components/common/resource-select";
import StatusBadge from "@/components/common/status-badge";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatBDTShort, formatDateTime, formatNumber } from "@/lib/format";
import { toastError } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { useCan } from "@/modules/auth/auth-provider";
import { projects } from "@/modules/project/api";
import { leads, leadSources, usePipeline } from "../api";
import { budgetText, LEAD_STATUS } from "../constants";

const OPEN_STAGES = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "FOLLOW_UP",
  "SITE_VISIT",
  "NEGOTIATION",
  "BOOKING",
];

function LeadCard({ lead, canMove, onMove, onDragStart }) {
  const overdue = lead.nextFollowUpAt && new Date(lead.nextFollowUpAt) < new Date();
  const budget = budgetText(lead, formatBDTShort);
  return (
    <li
      draggable={canMove}
      onDragStart={(event) => onDragStart(event, lead)}
      className={cn(
        "bg-card group relative rounded-lg border p-3 text-sm shadow-xs",
        canMove && "cursor-grab active:cursor-grabbing",
      )}
    >
      <div className="flex items-start gap-2">
        <Link href={`/crm/leads/${lead.id}`} className="min-w-0 flex-1 font-medium hover:underline">
          {lead.fullName}
        </Link>
        {canMove && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label={`Move ${lead.fullName}`}
                className="-mt-1 -mr-1"
              >
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Move to</DropdownMenuLabel>
              {[...OPEN_STAGES, "LOST"]
                .filter((status) => status !== lead.status)
                .map((status) => (
                  <DropdownMenuItem key={status} onSelect={() => onMove(lead, status)}>
                    {LEAD_STATUS[status].label}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <p className="text-muted-foreground text-xs">
        {lead.leadCode} · {lead.source.name}
      </p>
      {(lead.preferredProject || budget !== "—") && (
        <p className="text-muted-foreground mt-1 text-xs">
          {[lead.preferredProject?.name, budget !== "—" && budget].filter(Boolean).join(" · ")}
        </p>
      )}
      <div className="mt-2 flex items-center justify-between gap-2 text-xs">
        <span className={cn("truncate", !lead.owner && "text-muted-foreground")}>
          {lead.owner?.fullName ?? "Nobody yet"}
        </span>
        {lead.nextFollowUpAt && (
          <span
            className={cn(
              "flex shrink-0 items-center gap-1",
              overdue ? "text-destructive" : "text-muted-foreground",
            )}
          >
            <CalendarClock className="size-3" aria-hidden />
            {formatDateTime(lead.nextFollowUpAt)}
          </span>
        )}
      </div>
    </li>
  );
}

function Column({ status, count, children, dropping, onDrop, onDragOver, onDragLeave, footer }) {
  return (
    <section
      aria-label={`${LEAD_STATUS[status].label}, ${count} leads`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "bg-muted/40 flex w-[80vw] max-w-72 shrink-0 flex-col rounded-xl border p-2 transition-colors sm:w-72",
        dropping && "border-primary bg-primary/5",
      )}
    >
      <header className="flex items-center justify-between px-1 pb-2">
        <StatusBadge tone={LEAD_STATUS[status].tone}>{LEAD_STATUS[status].label}</StatusBadge>
        <span className="text-muted-foreground text-xs tabular-nums">{formatNumber(count)}</span>
      </header>
      {children}
      {footer}
    </section>
  );
}

function LostDialog({ lead, onDone }) {
  const move = leads.usePostAction("status");
  const form = useForm({ values: { lostReason: "" } });
  const [error, setError] = useState(null);
  const onSubmit = form.handleSubmit(async ({ lostReason }) => {
    if (lostReason.trim().length < 3) {
      form.setError("lostReason", { message: "Say why the lead was lost" });
      return;
    }
    try {
      await move.mutateAsync({ id: lead.id, status: "LOST", lostReason });
      toast.success(`${lead.fullName} marked as lost`);
      onDone();
    } catch (apiError) {
      setError(apiError.message);
    }
  });
  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onDone()}
      title={`Why was ${lead.fullName} lost?`}
      description="Open follow-ups and visits are cancelled."
      onSubmit={onSubmit}
      submitting={form.formState.isSubmitting}
      error={error}
      submitLabel="Mark as lost"
    >
      <FormField
        control={form.control}
        name="lostReason"
        label="Reason"
        placeholder="Bought elsewhere, budget too low, …"
      />
    </FormDialog>
  );
}

export default function PipelineScreen() {
  const can = useCan();
  const canMove = can("lead.edit");
  const [search, setSearch] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [dropTarget, setDropTarget] = useState(null);
  const [losing, setLosing] = useState(null);
  const debouncedSearch = useDebouncedValue(search);
  const { data, isLoading, isFetching, error } = usePipeline({
    search: debouncedSearch,
    sourceId,
    projectId,
    limit: 50,
  });
  const move = leads.usePostAction("status");

  const moveLead = async (lead, status) => {
    if (status === lead.status) return;
    if (status === "LOST") {
      setLosing(lead);
      return;
    }
    try {
      await move.mutateAsync({ id: lead.id, status });
      toast.success(`${lead.fullName} → ${LEAD_STATUS[status].label}`);
    } catch (apiError) {
      toastError(apiError);
    }
  };

  const dragStart = (event, lead) => {
    event.dataTransfer.setData("application/json", JSON.stringify(lead));
    event.dataTransfer.effectAllowed = "move";
  };
  const dropHandlers = (status) => ({
    dropping: dropTarget === status,
    onDragOver: (event) => {
      if (!canMove) return;
      event.preventDefault();
      setDropTarget(status);
    },
    onDragLeave: () => setDropTarget((current) => (current === status ? null : current)),
    onDrop: (event) => {
      event.preventDefault();
      setDropTarget(null);
      const raw = event.dataTransfer.getData("application/json");
      if (raw) moveLead(JSON.parse(raw), status);
    },
  });

  return (
    <>
      <PageHeader
        title="Pipeline"
        description={
          canMove ? "Drag a lead to another stage, or use its ⋯ menu." : "Open leads by stage."
        }
        actions={
          <Button variant="outline" asChild>
            <Link href="/crm/leads">
              <List /> List view
            </Link>
          </Button>
        }
      />
      <RequirePermission permission="lead.view">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <div className="relative sm:w-64">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                placeholder="Name, code, mobile or email"
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="sm:w-44">
              <ResourceSelect
                resource={leadSources}
                params={{ sortBy: "sortOrder", sortOrder: "asc" }}
                value={sourceId}
                onChange={setSourceId}
                emptyLabel="All sources"
                placeholder="All sources"
              />
            </div>
            <div className="sm:w-48">
              <ResourceSelect
                resource={projects}
                value={projectId}
                onChange={setProjectId}
                emptyLabel="All projects"
                placeholder="All projects"
              />
            </div>
          </div>

          {error ? (
            <p className="text-destructive text-sm">{error.message}</p>
          ) : isLoading ? (
            <div className="flex gap-3 overflow-hidden">
              {OPEN_STAGES.slice(0, 4).map((status) => (
                <Skeleton key={status} className="h-96 w-72 shrink-0" />
              ))}
            </div>
          ) : (
            <div
              className={cn(
                "flex gap-3 overflow-x-auto pb-3 transition-opacity",
                isFetching && "opacity-70",
              )}
            >
              {data.columns.map((column) => (
                <Column
                  key={column.status}
                  status={column.status}
                  count={column.count}
                  {...dropHandlers(column.status)}
                  footer={
                    column.count > column.leads.length && (
                      <p className="text-muted-foreground px-1 pt-2 text-xs">
                        +{formatNumber(column.count - column.leads.length)} more in the{" "}
                        <Link href="/crm/leads" className="underline">
                          list
                        </Link>
                      </p>
                    )
                  }
                >
                  <ul className="flex min-h-16 flex-col gap-2">
                    {column.leads.map((lead) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        canMove={canMove}
                        onMove={moveLead}
                        onDragStart={dragStart}
                      />
                    ))}
                  </ul>
                </Column>
              ))}
              <Column status="LOST" count={data.closed.lost} {...dropHandlers("LOST")}>
                <p className="text-muted-foreground px-1 text-xs">
                  {canMove ? "Drop a lead here to mark it lost. " : ""}
                  {formatNumber(data.closed.converted)} converted to customers so far.
                </p>
              </Column>
            </div>
          )}
        </div>
      </RequirePermission>
      {losing && <LostDialog lead={losing} onDone={() => setLosing(null)} />}
    </>
  );
}
