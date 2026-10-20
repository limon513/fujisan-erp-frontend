"use client";

import { useState } from "react";
import { BadgeDollarSign, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import ConfirmDialog from "@/components/common/confirm-dialog";
import { formatBDT, formatDateTime, formatNumber } from "@/lib/format";
import { toastError } from "@/lib/notify";
import { useCan } from "@/modules/auth/auth-provider";
import { plots } from "../api";
import { FACING_LABELS, HISTORY_LABELS } from "../constants";
import ChangePriceDialog from "./change-price-dialog";
import PlotFormDialog from "./plot-form-dialog";
import PlotStatusBadge from "./plot-status-badge";

const Row = ({ label, children }) => (
  <div className="grid grid-cols-[8rem_1fr] gap-2 py-1 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="min-w-0 break-words">{children || "—"}</span>
  </div>
);

const LOCKED = ["BOOKED", "SOLD"];

/**
 * Plot details with history. `children` lets callers (e.g. the plot map) add action buttons —
 * hold / release / block arrive in step 2.5.
 */
export default function PlotDetailSheet({ plotId, onClose, children }) {
  const can = useCan();
  const { data: plot, isLoading } = plots.useItem(plotId);
  const remove = plots.useRemove();
  const [editing, setEditing] = useState(false);
  const [pricing, setPricing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const locked = plot && LOCKED.includes(plot.status);

  return (
    <>
      <Sheet open={Boolean(plotId)} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-lg">
          <SheetHeader className="border-b">
            <SheetTitle className="flex items-center gap-2">
              Plot {plot?.code ?? ""} {plot && <PlotStatusBadge status={plot.status} />}
            </SheetTitle>
            <SheetDescription>
              {plot ? `${plot.project.name} · ${plot.block.name}` : " "}
            </SheetDescription>
          </SheetHeader>

          {isLoading || !plot ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-6 p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs">Price</p>
                  <p className="text-lg font-semibold tabular-nums">{formatBDT(plot.price)}</p>
                  <p className="text-muted-foreground text-xs">
                    {formatBDT(plot.ratePerSqft)} / sqft
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs">Area</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatNumber(plot.areaSqft)} sqft
                  </p>
                  <p className="text-muted-foreground text-xs">{plot.dimensions ?? " "}</p>
                </div>
              </div>

              <div>
                <Row label="Block">{plot.block.name}</Row>
                <Row label="Road">{plot.road?.name}</Row>
                <Row label="Facing">{plot.facing && FACING_LABELS[plot.facing]}</Row>
                <Row label="Remarks">{plot.remarks}</Row>
              </div>

              {plot.activeHold && (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
                  <p className="font-medium">
                    On hold until {formatDateTime(plot.activeHold.expiresAt)}
                  </p>
                  <p className="text-muted-foreground">
                    Requested by {plot.activeHold.requestedBy.fullName} · placed by{" "}
                    {plot.activeHold.heldBy.employee?.fullName ?? plot.activeHold.heldBy.username}
                  </p>
                  <p className="text-muted-foreground">{plot.activeHold.reason}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {children?.(plot)}
                {can("plot.edit") && (
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    <Pencil /> Edit
                  </Button>
                )}
                {can("plot.price") && !locked && (
                  <Button variant="outline" size="sm" onClick={() => setPricing(true)}>
                    <BadgeDollarSign /> Change price
                  </Button>
                )}
                {can("plot.delete") && ["AVAILABLE", "BLOCKED"].includes(plot.status) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setDeleting(true)}
                  >
                    <Trash2 /> Delete
                  </Button>
                )}
              </div>

              <section className="space-y-2">
                <h3 className="text-sm font-medium">Status history</h3>
                <ol className="space-y-2 border-l pl-4 text-sm">
                  {plot.statusHistory.map((h) => (
                    <li key={h.id}>
                      <p>
                        {HISTORY_LABELS[h.refType] ?? h.refType} →{" "}
                        <PlotStatusBadge status={h.toStatus} />
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {formatDateTime(h.createdAt)}
                        {h.reason && ` · ${h.reason}`}
                      </p>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-medium">Price history</h3>
                <div className="divide-y rounded-lg border text-sm">
                  {plot.priceHistory.map((h) => (
                    <div key={h.id} className="flex items-start justify-between gap-3 px-3 py-2">
                      <div className="min-w-0">
                        <p className="tabular-nums">
                          {h.oldPrice ? `${formatBDT(h.oldPrice)} → ` : ""}
                          <span className="font-medium">{formatBDT(h.newPrice)}</span>
                        </p>
                        <p className="text-muted-foreground truncate text-xs">{h.reason}</p>
                      </div>
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {formatDateTime(h.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {plot && <PlotFormDialog open={editing} onOpenChange={setEditing} plot={plot} />}
      <ChangePriceDialog plot={pricing ? plot : null} onClose={() => setPricing(false)} />
      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete plot ${plot?.code ?? ""}?`}
        description="Only for plots added by mistake. Plots that were ever held or booked can only be blocked."
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(plot.id);
            toast.success(`Plot ${plot.code} deleted`);
            setDeleting(false);
            onClose();
          } catch (error) {
            toastError(error);
            setDeleting(false);
          }
        }}
      />
    </>
  );
}
