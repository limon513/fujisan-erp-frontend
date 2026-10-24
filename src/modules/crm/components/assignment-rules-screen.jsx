"use client";

import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Ellipsis, Pencil, Plus, Shuffle, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import ConfirmDialog from "@/components/common/confirm-dialog";
import FormDialog from "@/components/common/form-dialog";
import FormField, { applyApiErrors } from "@/components/common/form-field";
import PageHeader from "@/components/common/page-header";
import RequirePermission from "@/components/common/require-permission";
import ResourceSelect from "@/components/common/resource-select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { http } from "@/lib/api-client";
import { formatNumber, formatTimeAgo } from "@/lib/format";
import { toastError } from "@/lib/notify";
import { useCan } from "@/modules/auth/auth-provider";
import { projects } from "@/modules/project/api";
import { assignmentRules, leads, leadSources, useAssignees, useAssignmentRules } from "../api";

const schema = z
  .object({
    name: z.string().trim().min(2, "Name the rule").max(80),
    priority: z.coerce.number().int().min(0).max(1000),
    isActive: z.boolean(),
    sourceId: z.string(),
    projectId: z.string(),
    locations: z.string().max(400),
    poolType: z.enum(["TEAM", "EMPLOYEES"]),
    teamId: z.string(),
    employeeIds: z.array(z.string()),
  })
  .refine((v) => v.poolType !== "TEAM" || v.teamId, { message: "Choose a team", path: ["teamId"] })
  .refine((v) => v.poolType !== "EMPLOYEES" || v.employeeIds.length, {
    message: "Choose at least one person",
    path: ["employeeIds"],
  });

const toValues = (rule) =>
  rule
    ? {
        name: rule.name,
        priority: rule.priority,
        isActive: rule.isActive,
        sourceId: rule.source?.id ?? "",
        projectId: rule.project?.id ?? "",
        locations: rule.locationKeywords.join(", "),
        poolType: rule.poolType,
        teamId: rule.team?.id ?? "",
        employeeIds: rule.poolType === "EMPLOYEES" ? rule.pool.map((p) => p.id) : [],
      }
    : {
        name: "",
        priority: 100,
        isActive: true,
        sourceId: "",
        projectId: "",
        locations: "",
        poolType: "TEAM",
        teamId: "",
        employeeIds: [],
      };

const toBody = ({ locations, ...values }) => ({
  ...values,
  locationKeywords: locations
    .split(",")
    .map((word) => word.trim())
    .filter((word) => word.length >= 2),
  ...(values.poolType === "TEAM" ? { employeeIds: [] } : { teamId: null }),
});

function RuleDialog({ rule, open, onOpenChange }) {
  const create = assignmentRules.useCreate();
  const update = assignmentRules.useUpdate();
  const { data: people = [] } = useAssignees(open);
  const teams = useMemo(
    () =>
      [...new Map(people.filter((p) => p.team).map((p) => [p.team.id, p.team])).values()].sort(
        (a, b) => a.name.localeCompare(b.name),
      ),
    [people],
  );
  const [error, setError] = useState(null);
  const form = useForm({ resolver: zodResolver(schema), values: toValues(rule) });
  const poolType = useWatch({ control: form.control, name: "poolType" });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const body = toBody(values);
      if (rule) await update.mutateAsync({ id: rule.id, ...body });
      else await create.mutateAsync(body);
      toast.success(rule ? "Rule updated" : "Rule created");
      onOpenChange(false);
    } catch (apiError) {
      const fields = ["name", "priority", "sourceId", "projectId", "teamId", "employeeIds"];
      if (!applyApiErrors(apiError, form.setError, fields)) setError(apiError.message);
    }
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={rule ? `Edit "${rule.name}"` : "New assignment rule"}
      description="Leave a condition empty to match every lead."
      onSubmit={onSubmit}
      submitting={form.formState.isSubmitting}
      error={error}
      className="sm:max-w-xl"
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
        <FormField
          control={form.control}
          name="name"
          label="Name"
          placeholder="Facebook leads to Team Alpha"
        />
        <FormField
          control={form.control}
          name="priority"
          label="Order"
          type="number"
          min={0}
          max={1000}
          description="Lower first"
        />
      </div>
      <p className="text-sm font-medium">When a new lead…</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="sourceId"
          label="comes from"
          render={(field) => (
            <ResourceSelect
              id="sourceId"
              resource={leadSources}
              params={{ sortBy: "sortOrder", sortOrder: "asc" }}
              value={field.value}
              onChange={field.onChange}
              emptyLabel="Any source"
            />
          )}
        />
        <FormField
          control={form.control}
          name="projectId"
          label="is interested in"
          render={(field) => (
            <ResourceSelect
              id="projectId"
              resource={projects}
              value={field.value}
              onChange={field.onChange}
              emptyLabel="Any project"
            />
          )}
        />
      </div>
      <FormField
        control={form.control}
        name="locations"
        label="lives in an area containing"
        placeholder="Uttara, Diabari, Mirpur"
        description="Comma separated. Empty = anywhere."
      />
      <p className="text-sm font-medium">…give it, in turn, to</p>
      <FormField
        control={form.control}
        name="poolType"
        render={(field) => (
          <ToggleGroup
            type="single"
            variant="outline"
            value={field.value}
            onValueChange={(v) => v && field.onChange(v)}
            aria-label="Pool"
          >
            <ToggleGroupItem value="TEAM">A team</ToggleGroupItem>
            <ToggleGroupItem value="EMPLOYEES">Chosen people</ToggleGroupItem>
          </ToggleGroup>
        )}
      />
      {poolType === "TEAM" ? (
        <FormField
          control={form.control}
          name="teamId"
          label="Team"
          description="Its active members, one after another."
          render={(field, invalid) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="teamId" className="w-full" aria-invalid={invalid}>
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      ) : (
        <FormField
          control={form.control}
          name="employeeIds"
          label="People"
          description="In the order you tick them."
          render={(field) => (
            <div className="max-h-52 space-y-2 overflow-y-auto rounded-lg border p-3">
              {people.map((person) => {
                const checked = field.value.includes(person.id);
                return (
                  <div key={person.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`p-${person.id}`}
                      checked={checked}
                      onCheckedChange={(on) =>
                        field.onChange(
                          on
                            ? [...field.value, person.id]
                            : field.value.filter((id) => id !== person.id),
                        )
                      }
                    />
                    <Label htmlFor={`p-${person.id}`} className="font-normal">
                      {person.fullName}
                      <span className="text-muted-foreground">
                        {" "}
                        · {person.designation.name}
                        {person.team && ` · ${person.team.name}`}
                      </span>
                    </Label>
                    {checked && (
                      <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                        #{field.value.indexOf(person.id) + 1}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        />
      )}
    </FormDialog>
  );
}

function conditionText(rule) {
  const parts = [
    rule.source && `comes from ${rule.source.name}`,
    rule.project && `wants ${rule.project.name}`,
    rule.locationKeywords.length && `lives in ${rule.locationKeywords.join(" / ")}`,
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "any new lead";
}

function RuleCard({ rule, position, canEdit, onEdit, onDelete }) {
  const update = assignmentRules.useUpdate();
  const toggle = async (isActive) => {
    try {
      await update.mutateAsync({ id: rule.id, isActive });
      toast.success(`"${rule.name}" ${isActive ? "on" : "off"}`);
    } catch (apiError) {
      toastError(apiError);
    }
  };
  const poolName =
    rule.poolType === "TEAM" ? (rule.team?.name ?? "a deleted team") : "chosen people";
  return (
    <Card className={rule.isActive ? undefined : "opacity-60"}>
      <CardHeader className="flex flex-row items-start gap-3">
        <span className="bg-muted flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium">
          {position}
        </span>
        <div className="min-w-0 flex-1">
          <CardTitle className="leading-7">{rule.name}</CardTitle>
        </div>
        <Switch
          checked={rule.isActive}
          onCheckedChange={toggle}
          disabled={!canEdit || update.isPending}
          aria-label={`Rule ${rule.name} active`}
        />
        {canEdit && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon-sm" variant="ghost" aria-label={`Options for ${rule.name}`}>
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => onEdit(rule)}>
                <Pencil /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={() => onDelete(rule)}>
                <Trash2 /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>
            When <span className="font-medium">{conditionText(rule)}</span>
          </span>
          <ArrowRight className="text-muted-foreground size-4" aria-hidden />
          <span>
            {poolName}
            {rule.pool.length > 0 && (
              <span className="text-muted-foreground">
                {" "}
                ({rule.pool.map((p) => p.fullName).join(" → ")})
              </span>
            )}
          </span>
        </p>
        {rule.pool.length === 0 && (
          <p className="text-destructive flex items-center gap-1.5 text-xs">
            <TriangleAlert className="size-3.5" aria-hidden /> Nobody active in this pool, so the
            rule is skipped.
          </p>
        )}
        <p className="text-muted-foreground text-xs">
          {rule.assignedCount
            ? `${formatNumber(rule.assignedCount)} lead${rule.assignedCount === 1 ? "" : "s"} assigned, last ${formatTimeAgo(rule.lastAssignedAt)}`
            : "No leads assigned yet"}
        </p>
      </CardContent>
    </Card>
  );
}

export default function AssignmentRulesScreen() {
  const can = useCan();
  const queryClient = useQueryClient();
  const { data: rules, isLoading, error } = useAssignmentRules();
  const { data: waiting } = leads.useList(
    { unassigned: true, status: "OPEN", limit: 1 },
    { enabled: can("lead.view") },
  );
  const remove = assignmentRules.useRemove();
  const distribute = useMutation({
    mutationFn: () => http.post("/lead-assignment-rules/distribute").then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries(),
  });
  const [editing, setEditing] = useState(null); // null | "new" | rule
  const [deleting, setDeleting] = useState(null);
  const canEdit = can("lead-assignment-rule.edit");
  const waitingCount = waiting?.meta.total ?? 0;

  const runDistribute = async () => {
    try {
      const { assigned, left } = await distribute.mutateAsync();
      toast.success(
        assigned
          ? `${assigned} lead${assigned === 1 ? "" : "s"} assigned${left ? `, ${left} still in the pool (no rule matched)` : ""}`
          : "No rule matched the waiting leads",
      );
    } catch (apiError) {
      toastError(apiError);
    }
  };

  return (
    <>
      <PageHeader
        title="Assignment rules"
        description="Who gets new leads that nobody is assigned to."
        actions={
          <>
            {canEdit && waitingCount > 0 && (
              <Button variant="outline" onClick={runDistribute} disabled={distribute.isPending}>
                <Shuffle /> Assign {formatNumber(waitingCount)} waiting
              </Button>
            )}
            {can("lead-assignment-rule.create") && (
              <Button onClick={() => setEditing("new")}>
                <Plus /> New rule
              </Button>
            )}
          </>
        }
      />
      <RequirePermission permission="lead-assignment-rule.view">
        <div className="space-y-4">
          <Alert>
            <AlertDescription>
              Rules are tried from the top. The first one that fits the lead hands it to the next
              person in its pool, then the next person after that, and so on. If no rule fits, the
              lead waits in the pool for someone to assign it.
            </AlertDescription>
          </Alert>
          {error ? (
            <p className="text-destructive text-sm">{error.message}</p>
          ) : isLoading ? (
            <Skeleton className="h-32" />
          ) : rules.length ? (
            rules.map((rule, index) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                position={index + 1}
                canEdit={canEdit}
                onEdit={setEditing}
                onDelete={setDeleting}
              />
            ))
          ) : (
            <p className="text-muted-foreground rounded-xl border border-dashed px-6 py-12 text-center text-sm">
              No rules yet: every unassigned lead waits in the pool.
            </p>
          )}
        </div>
      </RequirePermission>
      {editing && (
        <RuleDialog
          rule={editing === "new" ? null : editing}
          open
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete "${deleting?.name}"?`}
        description="Leads it already assigned keep their owner."
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(deleting.id);
            toast.success("Rule deleted");
            setDeleting(null);
          } catch (apiError) {
            toastError(apiError);
          }
        }}
      />
    </>
  );
}
