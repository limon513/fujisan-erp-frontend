"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { toastError } from "@/lib/notify";
import { useMarkAllRead, useMarkRead, useNotifications, useUnreadCount } from "../api";
import NotificationItem from "./notification-item";

/** Top-bar bell: unread badge, latest notifications, mark all read, link to the full list. */
export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data: unread = 0 } = useUnreadCount();
  const { data, isLoading } = useNotifications({ limit: 8 }, { enabled: open });
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();

  const openNotification = (notification) => {
    if (!notification.readAt) markRead.mutate(notification.id);
    setOpen(false);
    if (notification.link) router.push(notification.link);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        >
          <Bell />
          {unread > 0 && (
            <span className="bg-destructive absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold text-white tabular-nums">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] gap-0 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-medium">Notifications</p>
          {unread > 0 && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              disabled={markAll.isPending}
              onClick={() => markAll.mutate(undefined, { onError: toastError })}
            >
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-[60vh] divide-y overflow-y-auto">
          {isLoading ? (
            Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="space-y-1.5 px-3 py-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))
          ) : data?.data.length ? (
            data.data.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onOpen={openNotification}
                compact
              />
            ))
          ) : (
            <p className="text-muted-foreground px-3 py-8 text-center text-sm">
              You&apos;re all caught up.
            </p>
          )}
        </div>
        <div className="border-t px-3 py-2 text-center">
          <Link
            href="/notifications"
            className="text-sm hover:underline"
            onClick={() => setOpen(false)}
          >
            See all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
