"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DataTable from "@/components/common/data-table";
import PageHeader from "@/components/common/page-header";
import RequirePermission from "@/components/common/require-permission";
import ResourceSelect from "@/components/common/resource-select";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDate, formatMobile } from "@/lib/format";
import { useAuth, useCan } from "@/modules/auth/auth-provider";
import { employees } from "@/modules/organization/api";
import { customers } from "../api";
import CustomerFormSheet from "./customer-form-sheet";

const columns = [
  {
    accessorKey: "fullName",
    header: "Customer",
    cell: ({ row }) => (
      <div className="leading-tight">
        <p className="font-medium">{row.original.fullName}</p>
        <p className="text-muted-foreground text-xs">
          {row.original.customerCode}
          {row.original.profession && ` · ${row.original.profession}`}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "mobile",
    header: "Mobile",
    meta: { className: "whitespace-nowrap" },
    cell: ({ getValue }) => formatMobile(getValue()),
  },
  {
    accessorKey: "nidNumber",
    header: "NID",
    meta: { className: "hidden md:table-cell" },
    cell: ({ getValue }) => getValue() ?? <span className="text-muted-foreground">—</span>,
  },
  {
    id: "owner",
    header: "Handled by",
    meta: { className: "hidden lg:table-cell" },
    cell: ({ row }) =>
      row.original.owner ? (
        <div className="leading-tight">
          <p>{row.original.owner.fullName}</p>
          <p className="text-muted-foreground text-xs">
            {row.original.owner.team?.name ?? row.original.owner.designation.name}
          </p>
        </div>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: "createdAt",
    header: "Added",
    meta: { className: "hidden xl:table-cell whitespace-nowrap" },
    cell: ({ getValue }) => formatDate(getValue()),
  },
];

export default function CustomersScreen() {
  const router = useRouter();
  const can = useCan();
  const { user: me } = useAuth();
  const [search, setSearch] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const debouncedSearch = useDebouncedValue(search);
  const scope = me.isSuperAdmin ? "ALL" : me.permissions["customer.view"];

  const { data, isLoading, isFetching, error } = customers.useList({
    search: debouncedSearch,
    ownerId,
    page,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  return (
    <>
      <PageHeader
        title="Customers"
        description={
          scope === "OWN"
            ? "Customers you look after."
            : "Customers and the salesperson who looks after each one."
        }
        actions={
          can("customer.create") && (
            <Button onClick={() => setAdding(true)}>
              <Plus /> New customer
            </Button>
          )
        }
      />
      <RequirePermission permission="customer.view">
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative sm:w-72">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                placeholder="Name, code, mobile or NID"
                className="pl-8"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            {scope !== "OWN" && (
              <div className="sm:w-56">
                <ResourceSelect
                  resource={employees}
                  params={{ sortBy: "fullName" }}
                  value={ownerId}
                  onChange={(value) => {
                    setOwnerId(value);
                    setPage(1);
                  }}
                  emptyLabel="Everyone"
                  placeholder="Handled by anyone"
                  getLabel={(e) => e.fullName}
                />
              </div>
            )}
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
              onRowClick={(customer) => router.push(`/customers/${customer.id}`)}
              emptyMessage="No customers yet."
            />
          )}
        </div>
      </RequirePermission>
      <CustomerFormSheet
        open={adding}
        onOpenChange={setAdding}
        onSaved={(customer) => router.push(`/customers/${customer.id}`)}
      />
    </>
  );
}
