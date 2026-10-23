"use client";

import { Bell, CalendarClock, ClipboardCheck, Map, MapPin, UserPlus } from "lucide-react";
import { formatDateTime, formatTimeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Icon by notification type prefix (APPROVAL_PENDING → approvals, ...). */
function TypeIcon({ type }) {
  const props = { className: "text-muted-foreground mt-0.5 size-4 shrink-0", "aria-hidden": true };
  if (type.startsWith("APPROVAL_")) return <ClipboardCheck {...props} />;
  if (type.startsWith("LEAD_")) return <UserPlus {...props} />;
  if (type.startsWith("FOLLOW_UP_")) return <CalendarClock {...props} />;
  if (type.startsWith("SITE_VISIT_")) return <MapPin {...props} />;
  if (type.startsWith("PLOT_")) return <Map {...props} />;
  return <Bell {...props} />;
}

/** One notification row: icon, title, body, time; unread ones are marked. */
export default function NotificationItem({ notification, onOpen, compact = false }) {
  const unread = !notification.readAt;
  return (
    <button
      type="button"
      onClick={() => onOpen(notification)}
      className={cn(
        "hover:bg-muted/60 flex w-full items-start gap-3 px-3 py-2.5 text-left text-sm transition-colors",
        unread && "bg-primary/[0.03]",
      )}
    >
      <TypeIcon type={notification.type} />
      <span className="min-w-0 flex-1">
        <span className={cn("block", unread ? "font-medium" : "text-muted-foreground")}>
          {notification.title}
        </span>
        {notification.body && (
          <span className={cn("text-muted-foreground block text-xs", compact && "truncate")}>
            {notification.body}
          </span>
        )}
        <span
          className="text-muted-foreground block text-xs"
          title={formatDateTime(notification.createdAt)}
        >
          {formatTimeAgo(notification.createdAt)}
        </span>
      </span>
      {unread && (
        <span className="bg-primary mt-1.5 size-2 shrink-0 rounded-full" aria-label="Unread" />
      )}
    </button>
  );
}
