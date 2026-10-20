"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Plus, Power, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/common/confirm-dialog";
import DataTable from "@/components/common/data-table";
import FormDialog from "@/components/common/form-dialog";
import FormField, { applyApiErrors } from "@/components/common/form-field";
import RowActions from "@/components/common/row-actions";
import { ActiveBadge } from "@/components/common/status-badge";
import { formatNumber } from "@/lib/format";
import { toastError } from "@/lib/notify";
import { SwitchField } from "@/modules/organization/components/fields";
import { useProjectChildren, useRemoveProjectChild, useSaveProjectChild } from "../api";

/** Per-kind config: blocks and roads share this tab. */
const KINDS = {
  blocks: {
    singular: "block",
    schema: z.object({
      code: z.string().trim().min(1, "Required").max(10),
      name: z.string().trim().min(1, "Required"),
      sortOrder: z.coerce.number().int().min(0),
      isActive: z.boolean(),
    }),
    empty: { code: "", name: "", sortOrder: 0, isActive: true },
    toValues: (b) => ({ code: b.code, name: b.name, sortOrder: b.sortOrder, isActive: b.isActive }),
    label: (b) => b.name,
    columns: [
      { accessorKey: "code", header: "Code", meta: { className: "w-24" } },
      {
        accessorKey: "name",
        header: "Block",
        cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
      },
    ],
    Fields: ({ control }) => (
      <>
        <div className="grid gap-4 sm:grid-cols-[7rem_1fr]">
          <FormField
            control={control}
            name="code"
            label="Code"
            placeholder="A"
            className="uppercase"
          />
          <FormField control={control} name="name" label="Name" placeholder="Block A" />
        </div>
        <FormField control={control} name="sortOrder" label="Display order" type="number" min={0} />
      </>
    ),
  },
  roads: {
    singular: "road",
    schema: z.object({
      name: z.string().trim().min(1, "Required"),
      widthFeet: z.string(),
      isActive: z.boolean(),
    }),
    empty: { name: "", widthFeet: "", isActive: true },
    toValues: (r) => ({ name: r.name, widthFeet: r.widthFeet ?? "", isActive: r.isActive }),
    label: (r) => r.name,
    columns: [
      {
        accessorKey: "name",
        header: "Road",
        cell: ({ getValue }) => <span className="font-medium">{getValue()}</span>,
      },
      {
        accessorKey: "widthFeet",
        header: "Width",
        meta: { className: "w-28" },
        cell: ({ getValue }) => (getValue() ? `${formatNumber(getValue())} ft` : "—"),
      },
    ],
    Fields: ({ control }) => (
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField control={control} name="name" label="Name" placeholder="Road 3" />
        <FormField control={control} name="widthFeet" label="Width (feet)" inputMode="decimal" />
      </div>
    ),
  },
};

function ChildDialog({ projectId, kind, item, open, onOpenChange }) {
  const config = KINDS[kind];
  const save = useSaveProjectChild(projectId, kind);
  const [error, setError] = useState(null);
  const form = useForm({
    resolver: zodResolver(config.schema),
    values: item ? config.toValues(item) : config.empty,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await save.mutateAsync({ ...(item && { id: item.id }), ...values });
      toast.success(`${config.singular[0].toUpperCase()}${config.singular.slice(1)} saved`);
      onOpenChange(false);
    } catch (apiError) {
      const conflict =
        apiError.status === 409 && !item
          ? `This ${config.singular} already exists in the project.`
          : null;
      if (!applyApiErrors(apiError, form.setError, Object.keys(config.empty)))
        setError(conflict ?? apiError.message);
    }
  });

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={item ? `Edit ${config.label(item)}` : `New ${config.singular}`}
      onSubmit={onSubmit}
      submitting={form.formState.isSubmitting}
      error={error}
    >
      <config.Fields control={form.control} />
      <SwitchField control={form.control} name="isActive" label="Active" />
    </FormDialog>
  );
}

/** Blocks or roads of a project: table + add/edit/activate/delete. */
export default function ProjectChildrenTab({ projectId, kind, canEdit }) {
  const config = KINDS[kind];
  const { data, isLoading } = useProjectChildren(projectId, kind);
  const save = useSaveProjectChild(projectId, kind);
  const remove = useRemoveProjectChild(projectId, kind);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const columns = [
    ...config.columns,
    {
      accessorKey: "plotCount",
      header: "Plots",
      meta: { className: "w-24 text-right" },
      cell: ({ getValue }) => formatNumber(getValue()),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      meta: { className: "w-28" },
      cell: ({ getValue }) => <ActiveBadge active={getValue()} />,
    },
    {
      id: "actions",
      header: "",
      meta: { className: "w-12" },
      cell: ({ row }) =>
        canEdit && (
          <RowActions
            items={[
              { label: "Edit", icon: Pencil, onSelect: () => setEditing(row.original) },
              {
                label: row.original.isActive ? "Deactivate" : "Activate",
                icon: Power,
                onSelect: () =>
                  save
                    .mutateAsync({ id: row.original.id, isActive: !row.original.isActive })
                    .catch(toastError),
              },
              {
                label: "Delete",
                icon: Trash2,
                destructive: true,
                separator: true,
                onSelect: () => setDeleting(row.original),
              },
            ]}
          />
        ),
    },
  ];

  return (
    <div className="space-y-3">
      {canEdit && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus /> Add {config.singular}
          </Button>
        </div>
      )}
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        onRowClick={canEdit ? setEditing : undefined}
        emptyMessage={`No ${kind} yet.`}
      />
      <ChildDialog
        projectId={projectId}
        kind={kind}
        item={editing === "new" ? null : editing}
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting ? config.label(deleting) : ""}?`}
        description={`Only ${kind} without plots can be deleted.`}
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(deleting.id);
            toast.success("Deleted");
          } catch (apiError) {
            toastError(apiError);
          }
          setDeleting(null);
        }}
      />
    </div>
  );
}
