"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DataTable from "@/components/common/data-table";
import PageHeader from "@/components/common/page-header";
import RequirePermission from "@/components/common/require-permission";
import ResourceSelect from "@/components/common/resource-select";
import StatusBadge from "@/components/common/status-badge";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatBDT, formatDateOnly } from "@/lib/format";
import { useCan } from "@/modules/auth/auth-provider";
import { projects } from "@/modules/project/api";
import { bookings } from "../api";
import { BOOKING_STATUS } from "../constants";

const columns = [
  {
    accessorKey: "bookingNo",
    header: "Booking",
    cell: ({ row }) => (
      <div className="leading-tight">
        <p className="font-medium">{row.original.bookingNo}</p>
        <p className="text-muted-foreground text-xs">{formatDateOnly(row.original.bookingDate)}</p>
      </div>
    ),
  },
  {
    id: "customer",
    header: "Customer",
    cell: ({ row }) => (
      <div className="leading-tight">
        <p>{row.original.customer.fullName}</p>
        <p className="text-muted-foreground text-xs">{row.original.customer.customerCode}</p>
      </div>
    ),
  },
  {
    id: "plot",
    header: "Plot",
    meta: { className: "hidden sm:table-cell" },
    cell: ({ row }) => (
      <div className="leading-tight">
        <p>{row.original.plot.code}</p>
        <p className="text-muted-foreground text-xs">{row.original.project.name}</p>
      </div>
    ),
  },
  {
    accessorKey: "netPrice",
    header: "Price",
    meta: { className: "hidden md:table-cell text-right whitespace-nowrap" },
    cell: ({ row }) => (
      <div className="leading-tight">
        <p>{formatBDT(row.original.netPrice)}</p>
        {Number(row.original.discountAmount) > 0 && (
          <p className="text-muted-foreground text-xs">
            −{formatBDT(row.original.discountAmount)} discount
          </p>
        )}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => (
      <StatusBadge tone={BOOKING_STATUS[getValue()].tone}>
        {BOOKING_STATUS[getValue()].label}
      </StatusBadge>
    ),
  },
  {
    id: "owner",
    header: "Sold by",
    meta: { className: "hidden lg:table-cell" },
    cell: ({ row }) =>
      row.original.owner?.fullName ?? <span className="text-muted-foreground">—</span>,
  },
];

export default function BookingsScreen() {
  const router = useRouter();
  const can = useCan();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [projectId, setProjectId] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);
  const { data, isLoading, isFetching, error } = bookings.useList({
    search: debouncedSearch,
    status,
    projectId,
    page,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const filter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title="Bookings"
        description="Plots booked by customers, their approval and payment schedule."
        actions={
          can("booking.create") && (
            <Button asChild>
              <Link href="/bookings/new">
                <Plus /> New booking
              </Link>
            </Button>
          )
        }
      />
      <RequirePermission permission="booking.view">
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <div className="relative sm:w-64">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                placeholder="Booking no, customer or plot"
                className="pl-8"
                value={search}
                onChange={(e) => filter(setSearch)(e.target.value)}
              />
            </div>
            <Select value={status} onValueChange={filter(setStatus)}>
              <SelectTrigger className="sm:w-52" aria-label="Status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any status</SelectItem>
                {Object.entries(BOOKING_STATUS).map(([value, { label }]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="sm:w-48">
              <ResourceSelect
                resource={projects}
                value={projectId}
                onChange={filter(setProjectId)}
                emptyLabel="All projects"
                placeholder="All projects"
              />
            </div>
          </div>
          {error ? (
            <p className="text-destructive text-sm">{error.message}</p>
          ) : (
            <DataTable
              columns={columns}
              data={data?.data}
              meta={data?.meta}
              isLoading={isLoading}
              isFetching={isFetching}
              onPageChange={setPage}
              onRowClick={(booking) => router.push(`/bookings/${booking.id}`)}
              emptyMessage="No bookings yet."
            />
          )}
        </div>
      </RequirePermission>
    </>
  );
}
