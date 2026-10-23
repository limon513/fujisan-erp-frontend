"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DataTable from "@/components/common/data-table";
import PageHeader from "@/components/common/page-header";
import StatusBadge from "@/components/common/status-badge";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatBDT, formatDateTime } from "@/lib/format";
import { useCan } from "@/modules/auth/auth-provider";
import { approvals, inbox, myRequests, useInboxCount } from "../api";
import { APPROVAL_STATUS } from "../constants";

const valueText = (request) =>
  [
    request.percent != null && `${Number(request.percent)}%`,
    request.amount != null && formatBDT(request.amount),
  ]
    .filter(Boolean)
    .join(" · ") || "—";

const columns = (tab) => [
  {
    accessorKey: "title",
    header: "Request",
    cell: ({ row }) => (
      <div className="leading-tight">
        <p className="font-medium">{row.original.title}</p>
        <p className="text-muted-foreground text-xs">
          {row.original.requestNo} · {row.original.workflow.name}
        </p>
      </div>
    ),
  },
  ...(tab === "mine"
    ? []
    : [
        {
          id: "requestedBy",
          header: "Asked by",
          meta: { className: "hidden md:table-cell" },
          cell: ({ row }) => row.original.requestedBy.name,
        },
      ]),
  {
    id: "value",
    header: "Value",
    meta: { className: "hidden lg:table-cell whitespace-nowrap" },
    cell: ({ row }) => valueText(row.original),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const { status, currentStep } = row.original;
      return (
        <div className="space-y-0.5">
          <StatusBadge tone={APPROVAL_STATUS[status].tone}>
            {APPROVAL_STATUS[status].label}
          </StatusBadge>
          {currentStep && tab !== "inbox" && (
            <p className="text-muted-foreground text-xs">at {currentStep.name}</p>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Asked on",
    meta: { className: "hidden sm:table-cell whitespace-nowrap" },
    cell: ({ getValue }) => formatDateTime(getValue()),
  },
];

const RESOURCES = { inbox, mine: myRequests, all: approvals };

const EMPTY = {
  inbox: "Nothing is waiting for your decision.",
  mine: "You haven't asked for any approvals.",
  all: "No approval requests yet.",
};

export default function ApprovalsScreen() {
  const router = useRouter();
  const can = useCan();
  const { data: waiting } = useInboxCount();
  const [tab, setTab] = useState("inbox");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const { data, isLoading, isFetching, error } = RESOURCES[tab].useList({
    search: debouncedSearch,
    status: tab === "inbox" ? undefined : status,
    page,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: tab === "inbox" ? "asc" : "desc",
  });

  const changeTab = (next) => {
    setTab(next);
    setPage(1);
    setStatus("all");
  };

  return (
    <>
      <PageHeader
        title="Approvals"
        description="Discounts, bookings, cancellations and other requests that need a decision."
      />
      <div className="space-y-4">
        <Tabs value={tab} onValueChange={changeTab}>
          <TabsList>
            <TabsTrigger value="inbox">Waiting for me{waiting ? ` (${waiting})` : ""}</TabsTrigger>
            <TabsTrigger value="mine">My requests</TabsTrigger>
            {can("approval.view") && <TabsTrigger value="all">All</TabsTrigger>}
          </TabsList>
        </Tabs>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative sm:w-72">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              placeholder="Request number or title"
              className="pl-8"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          {tab !== "inbox" && (
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="sm:w-44" aria-label="Status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                {Object.entries(APPROVAL_STATUS).map(([value, { label }]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {error ? (
          <p className="text-destructive text-sm">{error.message}</p>
        ) : (
          <DataTable
            columns={columns(tab)}
            data={data?.data}
            meta={data?.meta}
            isLoading={isLoading}
            isFetching={isFetching}
            onPageChange={setPage}
            onRowClick={(request) => router.push(`/approvals/${request.id}`)}
            emptyMessage={EMPTY[tab]}
          />
        )}
      </div>
    </>
  );
}
