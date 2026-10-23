"use client";

import { Fragment, useState } from "react";
import { ChevronRight, Pencil, Workflow } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import PageHeader from "@/components/common/page-header";
import RequirePermission from "@/components/common/require-permission";
import { formatBDT } from "@/lib/format";
import { toastError } from "@/lib/notify";
import { useCan } from "@/modules/auth/auth-provider";
import { useWorkflows, workflows } from "../api";
import { stepDetail } from "../constants";
import WorkflowEditorSheet from "./workflow-editor-sheet";

/** The chain as a row of steps: "1 Team Leader → 2 Sales Manager → 3 Director". */
function ChainPreview({ steps }) {
  if (!steps.length) {
    return <p className="text-muted-foreground text-sm">No steps: approved as soon as asked.</p>;
  }
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {steps.map((step, index) => {
        const detail = stepDetail(step, formatBDT);
        return (
          <Fragment key={step.id}>
            {index > 0 && <ChevronRight className="text-muted-foreground size-4" aria-hidden />}
            <li className="rounded-lg border px-3 py-2 text-sm">
              <p className="font-medium">
                <span className="text-muted-foreground mr-1.5">{step.stepOrder}</span>
                {step.name}
              </p>
              {detail && <p className="text-muted-foreground text-xs">{detail}</p>}
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}

function WorkflowCard({ workflow, canEdit, onEdit }) {
  const update = workflows.useUpdate();

  const toggle = async (isActive) => {
    try {
      await update.mutateAsync({ id: workflow.id, isActive });
      toast.success(`${workflow.name} approval switched ${isActive ? "on" : "off"}`);
    } catch (error) {
      toastError(error);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-1.5">
          <CardTitle>{workflow.name}</CardTitle>
          <CardDescription>
            {workflow.description ?? `Requests from the ${workflow.module} module.`}
          </CardDescription>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={workflow.isActive}
              onCheckedChange={toggle}
              disabled={!canEdit || update.isPending}
              aria-label={`Require approval for ${workflow.name}`}
            />
            <span className="hidden sm:inline">{workflow.isActive ? "On" : "Off"}</span>
          </label>
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => onEdit(workflow)}>
              <Pencil /> Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {workflow.isActive ? (
          <ChainPreview steps={workflow.steps} />
        ) : (
          <p className="text-muted-foreground text-sm">
            Off: requests are approved as soon as they&apos;re made.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function WorkflowsScreen() {
  const can = useCan();
  const { data, isLoading, error } = useWorkflows();
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="Approval chains"
        description="Who approves what, in which order, and up to which limit."
      />
      <RequirePermission permission="approval-workflow.view">
        {error ? (
          <p className="text-destructive text-sm">{error.message}</p>
        ) : isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
          </div>
        ) : data.length ? (
          <div className="space-y-4">
            {data.map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                canEdit={can("approval-workflow.edit")}
                onEdit={(w) => {
                  setEditing(w);
                  setOpen(true);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
            <Workflow className="text-muted-foreground size-10" />
            <p className="font-medium">No processes need approval yet.</p>
            <p className="text-muted-foreground max-w-md text-sm">
              Discount, booking and cancellation add their approval chains here when those modules
              are built.
            </p>
          </div>
        )}
      </RequirePermission>
      <WorkflowEditorSheet workflow={editing} open={open} onOpenChange={setOpen} />
    </>
  );
}
