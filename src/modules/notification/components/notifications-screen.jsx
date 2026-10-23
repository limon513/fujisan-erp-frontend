"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/common/page-header";
import { toastError } from "@/lib/notify";
import { useMarkAllRead, useMarkRead, useNotifications } from "../api";
import NotificationItem from "./notification-item";

export default function NotificationsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useNotifications({
    page,
    limit: 25,
    ...(tab === "unread" && { unread: true }),
  });
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const unread = data?.meta.unread ?? 0;

  const open = (notification) => {
    if (!notification.readAt) markRead.mutate(notification.id);
    if (notification.link) router.push(notification.link);
  };

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Assignments, reminders and approvals. Kept for 90 days after you read them."
        actions={
          unread > 0 && (
            <Button
              variant="outline"
              disabled={markAll.isPending}
              onClick={() => markAll.mutate(undefined, { onError: toastError })}
            >
              <CheckCheck /> Mark all read
            </Button>
          )
        }
      />
      <div className="space-y-4">
        <Tabs
          value={tab}
          onValueChange={(value) => {
            setTab(value);
            setPage(1);
          }}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="unread">Unread{unread ? ` (${unread})` : ""}</TabsTrigger>
          </TabsList>
        </Tabs>
        {error ? (
          <p className="text-destructive text-sm">{error.message}</p>
        ) : (
          <Card className="gap-0 overflow-hidden py-0">
            {isLoading ? (
              <div className="space-y-3 p-4">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : data.data.length ? (
              <div className="divide-y">
                {data.data.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onOpen={open}
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground px-4 py-12 text-center text-sm">
                {tab === "unread" ? "Nothing unread." : "No notifications yet."}
              </p>
            )}
          </Card>
        )}
        {data?.meta.totalPages > 1 && (
          <div className="flex items-center justify-end gap-1 text-sm">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft />
            </Button>
            <span className="text-muted-foreground px-2 tabular-nums">
              {page} / {data.meta.totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next page"
              disabled={page >= data.meta.totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight />
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
