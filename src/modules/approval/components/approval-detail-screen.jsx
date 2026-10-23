"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleMinus,
  CircleX,
  Clock,
  ExternalLink,
  Undo2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import ConfirmDialog from "@/components/common/confirm-dialog";
import PageHeader from "@/components/common/page-header";
import StatusBadge from "@/components/common/status-badge";
import { formatBDT, formatDateTime } from "@/lib/format";
import { toastError } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { approvals } from "../api";
import { APPROVAL_STATUS, stepDetail } from "../constants";

const STEP_STATE = {
  APPROVED: { icon: CircleCheck, className: "text-emerald-600", label: "Approved" },
  REJECTED: { icon: CircleX, className: "text-red-600", label: "Rejected" },
  CURRENT: { icon: Clock, className: "text-amber-600", label: "Waiting" },
  SKIPPED: { icon: CircleMinus, className: "text-muted-foreground", label: "Skipped" },
  WAITING: { icon: CircleDashed, className: "text-muted-foreground", label: "Next" },
  NOT_REACHED: { icon: CircleDashed, className: "text-muted-foreground", label: "Not reached" },
  NOT_NEEDED: { icon: CircleDashed, className: "text-muted-foreground/60", label: "Not needed" },
};

const DECISION_TEXT = {
  SUBMITTED: "asked for approval",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELLED: "withdrew the request",
  SKIPPED: "skipped",
};

/** The approval chain, top to bottom, with where the request stands on each step. */
function Chain({ request }) {
  const lastAction = new Map(
    request.actions
      .filter((a) => a.stepOrder != null && a.decision !== "SUBMITTED")
      .map((a) => [a.stepOrder, a]),
  );
  return (
    <ol className="space-y-4">
      {request.steps.map((step) => {
        const state = STEP_STATE[step.state];
        const Icon = state.icon;
        const action = lastAction.get(step.stepOrder);
        const detail = stepDetail(step, formatBDT);
        return (
          <li key={step.stepOrder} className="flex gap-3">
            <Icon className={cn("mt-0.5 size-5 shrink-0", state.className)} aria-hidden />
            <div
              className={cn("min-w-0 flex-1 text-sm", step.state === "NOT_NEEDED" && "opacity-60")}
            >
              <p className="font-medium">
                {step.name}
                <span className="text-muted-foreground font-normal"> · {state.label}</span>
              </p>
              {detail && <p className="text-muted-foreground text-xs">{detail}</p>}
              {step.state === "CURRENT" && (
                <p className="mt-1 text-xs">
                  Waiting for{" "}
                  <span className="font-medium">
                    {request.currentApprovers.map((person) => person.name).join(", ")}
                  </span>
                </p>
              )}
              {action && (
                <p className="mt-1 text-xs">
                  {action.actor ? (
                    <>
                      <span className="font-medium">{action.actor.name}</span> ·{" "}
                    </>
                  ) : null}
                  {formatDateTime(action.createdAt)}
                  {action.comment && (
                    <span className="text-muted-foreground block">“{action.comment}”</span>
                  )}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function History({ actions }) {
  return (
    <ol className="space-y-3 text-sm">
      {actions.map((action) => (
        <li key={action.id} className="flex gap-3">
          <CircleDot className="text-muted-foreground mt-1 size-3 shrink-0" aria-hidden />
          <div className="min-w-0">
            <p>
              <span className="font-medium">{action.actor?.name ?? "System"}</span>{" "}
              {DECISION_TEXT[action.decision]}
            </p>
            {action.comment && <p className="text-muted-foreground">“{action.comment}”</p>}
            <p className="text-muted-foreground text-xs">{formatDateTime(action.createdAt)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Decision({ request }) {
  const approve = approvals.usePostAction("approve");
  const reject = approvals.usePostAction("reject");
  const [comment, setComment] = useState("");
  const [error, setError] = useState(null);
  const busy = approve.isPending || reject.isPending;

  const run = async (decision) => {
    setError(null);
    if (decision === "reject" && comment.trim().length < 3) {
      setError("Say why you're rejecting it.");
      return;
    }
    try {
      const mutation = decision === "approve" ? approve : reject;
      const result = await mutation.mutateAsync({ id: request.id, comment: comment.trim() });
      setComment("");
      toast.success(
        decision === "reject"
          ? `${request.requestNo} rejected`
          : result.status === "APPROVED"
            ? `${request.requestNo} approved`
            : `Approved — sent on to ${result.currentStep.name}`,
      );
    } catch (apiError) {
      toastError(apiError);
    }
  };

  return (
    <Card className="border-amber-500/40">
      <CardHeader>
        <CardTitle>Your decision</CardTitle>
        <CardDescription>
          You&apos;re deciding as <span className="font-medium">{request.currentStep?.name}</span>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          aria-label="Comment"
          placeholder="Comment (required when rejecting)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          aria-invalid={Boolean(error)}
        />
        {error && <p className="text-destructive text-sm">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => run("approve")} disabled={busy}>
            <Check /> Approve
          </Button>
          <Button variant="outline" onClick={() => run("reject")} disabled={busy}>
            <X /> Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Snapshot = what the requester submitted, as label → value pairs. */
function Snapshot({ snapshot }) {
  const entries = Object.entries(snapshot ?? {}).filter(
    ([, value]) => value == null || typeof value !== "object",
  );
  if (!entries.length) return null;
  return (
    <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
      {entries.map(([label, value]) => (
        <div key={label}>
          <dt className="text-muted-foreground text-xs">{label}</dt>
          <dd className="font-medium">{value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function ApprovalDetailScreen() {
  const { id } = useParams();
  const { data: request, isLoading, error } = approvals.useItem(id);
  const cancel = approvals.usePostAction("cancel");
  const [withdrawing, setWithdrawing] = useState(false);

  const withdraw = async () => {
    try {
      await cancel.mutateAsync({ id });
      toast.success("Request withdrawn");
      setWithdrawing(false);
    } catch (apiError) {
      toastError(apiError);
    }
  };

  return (
    <>
      <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
        <Link href="/approvals">
          <ArrowLeft /> All approvals
        </Link>
      </Button>
      {error ? (
        <p className="text-destructive text-sm">
          {error.status === 404 ? "This request doesn't exist or you can't see it." : error.message}
        </p>
      ) : isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          <PageHeader
            title={request.title}
            description={`${request.requestNo} · ${request.workflow.name} · asked by ${request.requestedBy.name} on ${formatDateTime(request.createdAt)}`}
            actions={
              <>
                <StatusBadge tone={APPROVAL_STATUS[request.status].tone}>
                  {APPROVAL_STATUS[request.status].label}
                </StatusBadge>
                {request.canCancel && (
                  <Button variant="outline" size="sm" onClick={() => setWithdrawing(true)}>
                    <Undo2 /> Withdraw
                  </Button>
                )}
              </>
            }
          />
          {/* Chain sits beside on wide screens, right after the details on phones */}
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="space-y-6">
              {request.canDecide && <Decision request={request} />}
              <Card>
                <CardHeader>
                  <CardTitle>Details</CardTitle>
                  {request.summary && <CardDescription>{request.summary}</CardDescription>}
                </CardHeader>
                <CardContent className="space-y-4">
                  {(request.percent != null || request.amount != null) && (
                    <div className="flex flex-wrap gap-6">
                      {request.percent != null && (
                        <div>
                          <p className="text-muted-foreground text-xs">Percentage</p>
                          <p className="text-xl font-semibold">{Number(request.percent)}%</p>
                        </div>
                      )}
                      {request.amount != null && (
                        <div>
                          <p className="text-muted-foreground text-xs">Amount</p>
                          <p className="text-xl font-semibold">{formatBDT(request.amount)}</p>
                        </div>
                      )}
                    </div>
                  )}
                  <Snapshot snapshot={request.snapshot} />
                  {request.link && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={request.link}>
                        <ExternalLink /> Open the {request.entityType.toLowerCase()}
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
            <Card className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
              <CardHeader>
                <CardTitle>Approval chain</CardTitle>
                <CardDescription>
                  {request.steps.length
                    ? "Who decides, in order."
                    : "Approval was switched off for this process."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Chain request={request} />
              </CardContent>
            </Card>
            <Card className="lg:col-start-1">
              <CardHeader>
                <CardTitle>History</CardTitle>
              </CardHeader>
              <CardContent>
                <History actions={request.actions} />
              </CardContent>
            </Card>
          </div>
          <ConfirmDialog
            open={withdrawing}
            onOpenChange={setWithdrawing}
            title={`Withdraw ${request.requestNo}?`}
            description="The approvers won't see it any more. You can ask again later."
            confirmLabel="Withdraw"
            destructive
            loading={cancel.isPending}
            onConfirm={withdraw}
          />
        </>
      )}
    </>
  );
}
