"use client";

import { useState } from "react";
import { CalendarClock, Car, Check, Ellipsis, MapPin, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCan } from "@/modules/auth/auth-provider";
import { FOLLOW_UP_TYPES, TRANSPORTS } from "../constants";
import {
  CancelDialog,
  CompleteFollowUpDialog,
  CompleteVisitDialog,
  FollowUpDialog,
  SiteVisitDialog,
} from "./schedule-dialogs";

function MoreMenu({ label, onEdit, onCancel }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon-sm" variant="ghost" aria-label={label}>
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onEdit}>Change</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={onCancel}>
          Cancel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Pending follow-ups and booked site visits of a lead, with their actions. */
export default function NextSteps({ lead }) {
  const can = useCan();
  const [dialog, setDialog] = useState(null); // { name, item }
  const open =
    (name, item = null) =>
    () =>
      setDialog({ name, item });
  const close = (isOpen) => !isOpen && setDialog(null);
  const is = (name) => dialog?.name === name;

  const canFollowUp = can("follow-up.edit");
  const canVisit = can("site-visit.edit");
  const workable = lead.status !== "LOST";
  const now = new Date();
  const empty = !lead.followUps.length && !lead.siteVisits.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Next steps</CardTitle>
        <CardDescription>
          {empty ? "Nothing planned yet." : "Planned follow-ups and site visits."}
        </CardDescription>
        {workable && (
          <CardAction className="flex flex-wrap gap-2">
            {can("follow-up.create") && (
              <Button size="sm" variant="outline" onClick={open("followUp")}>
                <Plus /> Follow-up
              </Button>
            )}
            {can("site-visit.create") && (
              <Button size="sm" variant="outline" onClick={open("visit")}>
                <Plus /> Site visit
              </Button>
            )}
          </CardAction>
        )}
      </CardHeader>
      {!empty && (
        <CardContent>
          <ul className="divide-y rounded-lg border">
            {lead.siteVisits.map((visit) => (
              <li key={visit.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                <MapPin className="text-muted-foreground size-4 shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    Site visit · {visit.project.name}
                    <span className="text-muted-foreground font-normal">
                      {" "}
                      · {formatDateTime(visit.scheduledAt)}
                    </span>
                  </p>
                  <p className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Car className="size-3" aria-hidden />
                    {TRANSPORTS[visit.transport]}
                    {visit.pickupPoint && ` from ${visit.pickupPoint}`} · {visit.visitors}{" "}
                    {visit.visitors === 1 ? "person" : "people"}
                    {visit.owner && ` · with ${visit.owner.fullName}`}
                  </p>
                </div>
                {canVisit && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={open("visitResult", { ...visit, lead })}
                    >
                      <Check /> Record
                    </Button>
                    <MoreMenu
                      label="Visit options"
                      onEdit={open("visitEdit", visit)}
                      onCancel={open("visitCancel", visit)}
                    />
                  </>
                )}
              </li>
            ))}
            {lead.followUps.map((followUp) => {
              const overdue = new Date(followUp.dueAt) < now;
              return (
                <li key={followUp.id} className="flex items-center gap-3 px-3 py-2.5 text-sm">
                  <CalendarClock
                    className={cn(
                      "size-4 shrink-0",
                      overdue ? "text-destructive" : "text-muted-foreground",
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {FOLLOW_UP_TYPES[followUp.type]}
                      <span
                        className={cn(
                          "font-normal",
                          overdue ? "text-destructive" : "text-muted-foreground",
                        )}
                      >
                        {" "}
                        · {formatDateTime(followUp.dueAt)}
                        {overdue && " (overdue)"}
                      </span>
                    </p>
                    {(followUp.purpose || followUp.owner) && (
                      <p className="text-muted-foreground truncate text-xs">
                        {followUp.purpose}
                        {followUp.purpose && followUp.owner && " · "}
                        {followUp.owner && followUp.owner.fullName}
                      </p>
                    )}
                  </div>
                  {canFollowUp && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={open("followUpDone", { ...followUp, lead })}
                      >
                        <Check /> Done
                      </Button>
                      <MoreMenu
                        label="Follow-up options"
                        onEdit={open("followUpEdit", followUp)}
                        onCancel={open("followUpCancel", followUp)}
                      />
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      )}

      {is("followUp") && <FollowUpDialog lead={lead} open onOpenChange={close} />}
      {is("followUpEdit") && (
        <FollowUpDialog lead={lead} followUp={dialog.item} open onOpenChange={close} />
      )}
      {is("followUpDone") && (
        <CompleteFollowUpDialog followUp={dialog.item} open onOpenChange={close} />
      )}
      {is("followUpCancel") && (
        <CancelDialog kind="followUp" item={dialog.item} open onOpenChange={close} />
      )}
      {is("visit") && <SiteVisitDialog lead={lead} open onOpenChange={close} />}
      {is("visitEdit") && (
        <SiteVisitDialog lead={lead} visit={dialog.item} open onOpenChange={close} />
      )}
      {is("visitResult") && <CompleteVisitDialog visit={dialog.item} open onOpenChange={close} />}
      {is("visitCancel") && (
        <CancelDialog kind="visit" item={dialog.item} open onOpenChange={close} />
      )}
    </Card>
  );
}
