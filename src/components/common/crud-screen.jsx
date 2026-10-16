"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, Plus, Power, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ConfirmDialog from "@/components/common/confirm-dialog";
import DataTable from "@/components/common/data-table";
import FormDialog from "@/components/common/form-dialog";
import { applyApiErrors } from "@/components/common/form-field";
import PageHeader from "@/components/common/page-header";
import RequirePermission from "@/components/common/require-permission";
import RowActions from "@/components/common/row-actions";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { toastError } from "@/lib/notify";
import { useCan } from "@/modules/auth/auth-provider";

function EditDialog({ config, item, open, onOpenChange }) {
  const { resource, schema, defaults, toFormValues, toBody, Form, singular, formFields } = config;
  const create = resource.useCreate();
  const update = resource.useUpdate();
  const [error, setError] = useState(null);

  const form = useForm({
    resolver: zodResolver(schema),
    values: item ? toFormValues(item) : defaults,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const body = toBody(values, item);
      if (item) await update.mutateAsync({ id: item.id, ...body });
      else await create.mutateAsync(body);
      toast.success(`${capitalize(singular)} ${item ? "updated" : "created"}`);
      onOpenChange(false);
    } catch (apiError) {
      if (!applyApiErrors(apiError, form.setError, formFields)) setError(apiError.message);
    }
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setError(null);
        onOpenChange(next);
      }}
      title={item ? `Edit ${singular}` : `New ${singular}`}
      onSubmit={onSubmit}
      submitting={form.formState.isSubmitting}
      error={error}
      className={config.dialogClassName}
    >
      <Form control={form.control} form={form} item={item} />
    </FormDialog>
  );
}

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

/**
 * List + create/edit/activate/delete screen for simple master data.
 *
 * config: {
 *   resource, permission: "branch", title, description, singular: "branch",
 *   columns, Form, schema, defaults, toFormValues(item), toBody(values, item), formFields,
 *   sortBy, deleteHint, dialogClassName, Filters?: ({ value, onChange }) => JSX
 * }
 */
export default function CrudScreen({ config }) {
  const { resource, permission, title, description, singular, columns } = config;
  const can = useCan();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [extraFilters, setExtraFilters] = useState({});
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // null | "new" | item
  const [deleting, setDeleting] = useState(null);
  const debouncedSearch = useDebouncedValue(search);

  const { data, isLoading, isFetching, error } = resource.useList({
    page,
    limit: 20,
    search: debouncedSearch,
    isActive: status === "all" ? undefined : status === "active",
    sortBy: config.sortBy ?? "name",
    sortOrder: "asc",
    ...extraFilters,
  });
  const update = resource.useUpdate();
  const remove = resource.useRemove();

  const toggleActive = async (item) => {
    try {
      await update.mutateAsync({ id: item.id, isActive: !item.isActive });
      toast.success(`${capitalize(singular)} ${item.isActive ? "deactivated" : "activated"}`);
    } catch (apiError) {
      toastError(apiError);
    }
  };

  const confirmDelete = async () => {
    try {
      await remove.mutateAsync(deleting.id);
      toast.success(`${capitalize(singular)} deleted`);
      setDeleting(null);
    } catch (apiError) {
      toastError(apiError);
      setDeleting(null);
    }
  };

  const allColumns = useMemo(
    () => [
      ...columns,
      {
        id: "actions",
        header: "",
        meta: { className: "w-12" },
        cell: ({ row }) => (
          <RowActions
            items={[
              {
                label: "Edit",
                icon: Pencil,
                onSelect: () => setEditing(row.original),
                hidden: !can(`${permission}.edit`),
              },
              {
                label: row.original.isActive ? "Deactivate" : "Activate",
                icon: Power,
                onSelect: () => toggleActive(row.original),
                hidden: !can(`${permission}.edit`) || row.original.isActive === undefined,
              },
              {
                label: "Delete",
                icon: Trash2,
                destructive: true,
                separator: true,
                onSelect: () => setDeleting(row.original),
                hidden: !can(`${permission}.delete`),
              },
            ]}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers only use setters + current mutation
    [columns, can, permission],
  );

  const changeFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          can(`${permission}.create`) && (
            <Button onClick={() => setEditing("new")}>
              <Plus /> New {singular}
            </Button>
          )
        }
      />
      <RequirePermission permission={`${permission}.view`}>
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <div className="relative sm:w-64">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                placeholder={`Search ${title.toLowerCase()}`}
                className="pl-8"
                value={search}
                onChange={(e) => changeFilter(setSearch)(e.target.value)}
              />
            </div>
            {config.Filters && (
              <config.Filters value={extraFilters} onChange={changeFilter(setExtraFilters)} />
            )}
            <Select value={status} onValueChange={changeFilter(setStatus)}>
              <SelectTrigger className="sm:w-36" aria-label="Status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error ? (
            <p className="text-destructive text-sm">{error.message}</p>
          ) : (
            <DataTable
              columns={allColumns}
              data={data?.data}
              meta={data?.meta}
              isLoading={isLoading}
              isFetching={isFetching}
              onPageChange={setPage}
              onRowClick={can(`${permission}.edit`) ? setEditing : undefined}
              emptyMessage={`No ${title.toLowerCase()} yet.`}
            />
          )}
        </div>
      </RequirePermission>

      <EditDialog
        config={config}
        item={editing === "new" ? null : editing}
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${singular} "${deleting?.name ?? ""}"?`}
        description={config.deleteHint ?? "This can't be undone."}
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={confirmDelete}
      />
    </>
  );
}
