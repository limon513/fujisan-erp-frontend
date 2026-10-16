"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/format";
import { useAuditEntry } from "../api";
import ActionBadge from "./action-badge";

const show = (value) => {
  if (value === undefined) return "—";
  if (value === null) return <span className="text-muted-foreground italic">empty</span>;
  if (typeof value === "object") return <code className="text-xs">{JSON.stringify(value)}</code>;
  return String(value);
};

function Changes({ entry }) {
  const oldValues = entry.oldValues ?? {};
  const newValues = entry.newValues ?? {};
  const fields = entry.changedFields.length
    ? entry.changedFields
    : [...new Set([...Object.keys(oldValues), ...Object.keys(newValues)])];

  if (!fields.length) {
    return <p className="text-muted-foreground text-sm">No field values recorded.</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border text-sm">
      <div className="bg-muted/50 text-muted-foreground grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.3fr)] gap-3 px-3 py-2 text-xs font-medium">
        <span>Field</span>
        <span>Before</span>
        <span>After</span>
      </div>
      {fields.map((field) => (
        <div
          key={field}
          className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.3fr)] gap-3 border-t px-3 py-2 break-words"
        >
          <span className="font-medium">{field}</span>
          <span className="text-muted-foreground">{show(oldValues[field])}</span>
          <span>{show(newValues[field])}</span>
        </div>
      ))}
    </div>
  );
}

const Row = ({ label, children }) => (
  <div className="grid grid-cols-[7rem_1fr] gap-2 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="min-w-0 break-words">{children ?? "—"}</span>
  </div>
);

export default function AuditEntrySheet({ entryId, onClose }) {
  const { data: entry, isLoading } = useAuditEntry(entryId);

  return (
    <Sheet open={Boolean(entryId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Audit entry</SheetTitle>
          <SheetDescription>{entry?.description ?? " "}</SheetDescription>
        </SheetHeader>
        <div className="space-y-6 px-4 pb-6">
          {isLoading || !entry ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Row label="Action">
                  <ActionBadge action={entry.action} />
                </Row>
                <Row label="When">{formatDateTime(entry.createdAt)}</Row>
                <Row label="By">
                  {entry.user
                    ? [entry.user.name, entry.user.username && `(${entry.user.username})`]
                        .filter(Boolean)
                        .join(" ")
                    : "System"}
                </Row>
                <Row label="Record">
                  {entry.entityType}
                  {entry.entityId && (
                    <code className="text-muted-foreground ml-2 text-xs">{entry.entityId}</code>
                  )}
                </Row>
                <Row label="IP address">{entry.ip}</Row>
                <Row label="Device">
                  <span className="text-muted-foreground text-xs">{entry.userAgent}</span>
                </Row>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Changes</h3>
                <Changes entry={entry} />
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
