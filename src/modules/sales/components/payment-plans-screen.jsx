"use client";

import { useState } from "react";
import { Calculator, Ellipsis, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import ConfirmDialog from "@/components/common/confirm-dialog";
import PageHeader from "@/components/common/page-header";
import RequirePermission from "@/components/common/require-permission";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { toDateInput } from "@/lib/format";
import { toastError } from "@/lib/notify";
import { useCan } from "@/modules/auth/auth-provider";
import { paymentPlans, usePlanSchedule } from "../api";
import { planTerms } from "../constants";
import PlanEditorSheet from "./plan-editor-sheet";
import ScheduleView from "./schedule-view";

/** Try a saved plan against any price and booking date. */
function CalculatorDialog({ plan, open, onOpenChange }) {
  const [price, setPrice] = useState("5000000");
  const [startDate, setStartDate] = useState(() => toDateInput(new Date().toISOString()));
  const debouncedPrice = useDebouncedValue(price, 300);
  const { data, error, isLoading } = usePlanSchedule(plan.id, {
    price: Number(debouncedPrice),
    startDate: startDate || undefined,
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{plan.name}</DialogTitle>
          <DialogDescription>{planTerms(plan).payment}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="calcPrice">Plot price (৳)</Label>
            <Input
              id="calcPrice"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="calcDate">Booking date</Label>
            <Input
              id="calcDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
        </div>
        {error ? (
          <p className="text-destructive text-sm">{error.message}</p>
        ) : isLoading || !data ? (
          <Skeleton className="h-64" />
        ) : (
          <ScheduleView schedule={data} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function PlanCard({ plan, canEdit, canDelete, onEdit, onDelete, onCalculate }) {
  const update = paymentPlans.useUpdate();
  const terms = planTerms(plan);
  const toggle = async (isActive) => {
    try {
      await update.mutateAsync({ id: plan.id, isActive });
      toast.success(`${plan.name} ${isActive ? "offered again" : "no longer offered"}`);
    } catch (apiError) {
      toastError(apiError);
    }
  };
  return (
    <Card className={plan.isActive ? "h-full" : "h-full opacity-60"}>
      <CardHeader className="flex flex-row items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <CardTitle>{plan.name}</CardTitle>
          <CardDescription>{plan.project ? plan.project.name : "Every project"}</CardDescription>
        </div>
        <Switch
          checked={plan.isActive}
          onCheckedChange={toggle}
          disabled={!canEdit || update.isPending}
          aria-label={`Offer ${plan.name}`}
        />
        {(canEdit || canDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon-sm" variant="ghost" aria-label={`Options for ${plan.name}`}>
                <Ellipsis />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canEdit && (
                <DropdownMenuItem onSelect={() => onEdit(plan)}>
                  <Pencil /> Edit
                </DropdownMenuItem>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onSelect={() => onDelete(plan)}>
                    <Trash2 /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      <CardContent className="flex-1 space-y-1 text-sm">
        <p className="font-medium">{terms.payment}</p>
        <p className="text-muted-foreground">{terms.interest}</p>
        <p className="text-muted-foreground">{terms.lateFee}</p>
        <p className="text-muted-foreground">{terms.cancellation}</p>
        {plan.description && (
          <p className="text-muted-foreground pt-1 italic">{plan.description}</p>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm" onClick={() => onCalculate(plan)}>
          <Calculator /> Calculate for a price
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function PaymentPlansScreen() {
  const can = useCan();
  const { data, isLoading, error } = paymentPlans.useList({
    limit: 100,
    sortBy: "sortOrder",
    sortOrder: "asc",
  });
  const remove = paymentPlans.useRemove();
  const [editing, setEditing] = useState(null); // null | "new" | plan
  const [deleting, setDeleting] = useState(null);
  const [calculating, setCalculating] = useState(null);

  return (
    <>
      <PageHeader
        title="Payment plans"
        description="Ready-made payment terms chosen at booking: down payment, installments, interest, late fee and cancellation charge."
        actions={
          can("payment-plan.create") && (
            <Button onClick={() => setEditing("new")}>
              <Plus /> New plan
            </Button>
          )
        }
      />
      <RequirePermission permission="payment-plan.view">
        {error ? (
          <p className="text-destructive text-sm">{error.message}</p>
        ) : isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
          </div>
        ) : data.data.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.data.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                canEdit={can("payment-plan.edit")}
                canDelete={can("payment-plan.delete")}
                onEdit={setEditing}
                onDelete={setDeleting}
                onCalculate={setCalculating}
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground rounded-xl border border-dashed px-6 py-12 text-center text-sm">
            No payment plans yet.
          </p>
        )}
      </RequirePermission>
      {editing && (
        <PlanEditorSheet
          plan={editing === "new" ? null : editing}
          open
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
      {calculating && (
        <CalculatorDialog
          plan={calculating}
          open
          onOpenChange={(open) => !open && setCalculating(null)}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete "${deleting?.name}"?`}
        description="It can no longer be chosen. Bookings made with it keep their terms."
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(deleting.id);
            toast.success("Plan deleted");
            setDeleting(null);
          } catch (apiError) {
            toastError(apiError);
          }
        }}
      />
    </>
  );
}
