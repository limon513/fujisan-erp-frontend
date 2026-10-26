"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FolderTree, Pencil, Plus, Power, Trash2 } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import ConfirmDialog from "@/components/common/confirm-dialog";
import FormDialog from "@/components/common/form-dialog";
import FormField, { applyApiErrors } from "@/components/common/form-field";
import PageHeader from "@/components/common/page-header";
import RequirePermission from "@/components/common/require-permission";
import RowActions from "@/components/common/row-actions";
import StatusBadge from "@/components/common/status-badge";
import { formatBDT, toDateInput } from "@/lib/format";
import { toastError } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { useCan } from "@/modules/auth/auth-provider";
import { SwitchField } from "@/modules/organization/components/fields";
import { accounts, useAccounts } from "../api";
import { ACCOUNT_TYPES, bankLabel, withDepth } from "../constants";

const TOP = "__top__";

const schema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^\d{3,8}$/, "3–8 digits"),
    name: z.string().trim().min(2, "Name the account").max(120),
    parentId: z.string(),
    type: z.string(),
    isGroup: z.boolean(),
    description: z.string().max(300),
    bankName: z.string().max(120),
    bankBranch: z.string().max(120),
    accountTitle: z.string().max(150),
    accountNumber: z.string().regex(/^([0-9 -]{6,30})?$/, "Digits only (6–30)"),
    routingNumber: z.string().regex(/^(\d{9})?$/, "9 digits"),
    swiftCode: z
      .string()
      .regex(/^([A-Za-z0-9]{8}([A-Za-z0-9]{3})?)?$/, "8 or 11 letters and digits"),
  })
  .refine((v) => v.parentId !== TOP || v.type, { message: "Choose the type", path: ["type"] });

const BANK_FIELDS = [
  "bankName",
  "bankBranch",
  "accountTitle",
  "accountNumber",
  "routingNumber",
  "swiftCode",
];
const bankValues = (account) => Object.fromEntries(BANK_FIELDS.map((k) => [k, account?.[k] ?? ""]));

function AccountDialog({ account, parent, groups, onDone }) {
  const create = accounts.useCreate();
  const update = accounts.useUpdate();
  const [error, setError] = useState(null);
  const editing = Boolean(account);
  const form = useForm({
    resolver: zodResolver(schema),
    values: account
      ? {
          code: account.code,
          name: account.name,
          parentId: account.parentId ?? TOP,
          type: account.type,
          isGroup: account.isGroup,
          description: account.description ?? "",
          ...bankValues(account),
        }
      : {
          code: "",
          name: "",
          parentId: parent?.id ?? TOP,
          type: "",
          isGroup: false,
          description: "",
          ...bankValues(null),
        },
  });
  const parentId = useWatch({ control: form.control, name: "parentId" });
  const isGroup = useWatch({ control: form.control, name: "isGroup" });
  // Bank details belong on bank accounts: under a bank group, or one already marked as a bank
  const isBank = editing
    ? account.isBank && !account.isGroup
    : !isGroup && Boolean(groups.find((g) => g.id === parentId)?.isBank);
  const bankBody = (values) =>
    isBank ? Object.fromEntries(BANK_FIELDS.map((k) => [k, values[k].trim() || null])) : {};

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      if (editing) {
        await update.mutateAsync({
          id: account.id,
          code: values.code,
          name: values.name,
          description: values.description,
          ...bankBody(values),
        });
      } else {
        await create.mutateAsync({
          code: values.code,
          name: values.name,
          isGroup: values.isGroup,
          description: values.description,
          ...bankBody(values),
          ...(values.parentId === TOP ? { type: values.type } : { parentId: values.parentId }),
        });
      }
      toast.success(editing ? "Account updated" : `${values.code} ${values.name} added`);
      onDone();
    } catch (apiError) {
      if (
        !applyApiErrors(apiError, form.setError, [
          "code",
          "name",
          "parentId",
          "type",
          ...BANK_FIELDS,
        ])
      )
        setError(apiError.message);
    }
  });

  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onDone()}
      title={
        editing
          ? `Edit ${account.code}`
          : parent
            ? `New account under ${parent.name}`
            : "New account"
      }
      onSubmit={onSubmit}
      submitting={form.formState.isSubmitting}
      error={error}
    >
      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <FormField
          control={form.control}
          name="code"
          label="Code"
          inputMode="numeric"
          placeholder="1122"
        />
        <FormField
          control={form.control}
          name="name"
          label="Name"
          placeholder="Dutch-Bangla Bank, Gulshan"
        />
      </div>
      {!editing && (
        <>
          <FormField
            control={form.control}
            name="parentId"
            label="Under"
            render={(field) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="parentId" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TOP}>Top level</SelectItem>
                  {groups.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {"  ".repeat(g.depth)}
                      {g.code} {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {parentId === TOP && (
            <FormField
              control={form.control}
              name="type"
              label="Type"
              render={(field, invalid) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="type" className="w-full" aria-invalid={invalid}>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ACCOUNT_TYPES).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          )}
          <SwitchField
            control={form.control}
            name="isGroup"
            label="Group"
            description="Groups organise accounts; postings go to the accounts under them."
          />
        </>
      )}
      {isBank && (
        <fieldset className="space-y-4 rounded-lg border p-3">
          <legend className="px-1 text-sm font-medium">Bank details</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="bankName"
              label="Bank"
              placeholder="Eastern Bank PLC"
            />
            <FormField
              control={form.control}
              name="bankBranch"
              label="Branch"
              placeholder="Gulshan"
            />
          </div>
          <FormField
            control={form.control}
            name="accountTitle"
            label="Account title"
            placeholder="Fujisan Properties Ltd."
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="accountNumber"
              label="Account number"
              inputMode="numeric"
            />
            <FormField
              control={form.control}
              name="routingNumber"
              label="Routing number"
              inputMode="numeric"
            />
            <FormField control={form.control} name="swiftCode" label="SWIFT" />
          </div>
        </fieldset>
      )}
      <FormField control={form.control} name="description" label="Note" description="Optional" />
    </FormDialog>
  );
}

export default function ChartScreen() {
  const can = useCan();
  const [asOf, setAsOf] = useState(() => toDateInput(new Date().toISOString()));
  const { data, isLoading, error } = useAccounts({ balances: true, asOf });
  const update = accounts.useUpdate();
  const remove = accounts.useRemove();
  const [dialog, setDialog] = useState(null); // { account?, parent? }
  const [deleting, setDeleting] = useState(null);
  const rows = data ? withDepth(data) : [];
  const groups = rows.filter((a) => a.isGroup);

  const toggle = async (account) => {
    try {
      await update.mutateAsync({ id: account.id, isActive: !account.isActive });
      toast.success(`${account.code} ${account.isActive ? "switched off" : "switched on"}`);
    } catch (apiError) {
      toastError(apiError);
    }
  };

  return (
    <>
      <PageHeader
        title="Chart of accounts"
        description="Balances as of the date shown. Open an account for its ledger."
        actions={
          can("account.create") && (
            <Button onClick={() => setDialog({})}>
              <Plus /> New account
            </Button>
          )
        }
      />
      <RequirePermission permission="account.view">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <label htmlFor="asOf" className="text-muted-foreground text-sm">
              As of
            </label>
            <Input
              id="asOf"
              type="date"
              className="w-44"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
            />
          </div>
          {error ? (
            <p className="text-destructive text-sm">{error.message}</p>
          ) : isLoading ? (
            <Skeleton className="h-96" />
          ) : (
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="hidden sm:table-cell">Type</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((a) => (
                    <TableRow
                      key={a.id}
                      className={cn(!a.isActive && "opacity-50", a.isGroup && "bg-muted/30")}
                    >
                      <TableCell>
                        <div
                          className="flex items-center gap-2"
                          style={{ paddingLeft: `${a.depth * 1.25}rem` }}
                        >
                          {a.isGroup && (
                            <FolderTree
                              className="text-muted-foreground size-4 shrink-0"
                              aria-hidden
                            />
                          )}
                          <span className="text-muted-foreground font-mono text-xs">{a.code}</span>
                          {a.isGroup ? (
                            <span className="font-medium">{a.name}</span>
                          ) : (
                            <Link href={`/accounts/${a.id}`} className="hover:underline">
                              {a.name}
                            </Link>
                          )}
                          {bankLabel(a) && (
                            <span className="text-muted-foreground hidden text-xs md:inline">
                              {bankLabel(a)}
                            </span>
                          )}
                          {a.systemKey && (
                            <StatusBadge className="hidden md:inline-flex">auto</StatusBadge>
                          )}
                          {!a.isActive && <StatusBadge>off</StatusBadge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden sm:table-cell">
                        {ACCOUNT_TYPES[a.type]}
                      </TableCell>
                      <TableCell
                        className={cn("text-right tabular-nums", a.isGroup && "font-medium")}
                      >
                        {Number(a.balance) === 0 ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          formatBDT(a.balance)
                        )}
                      </TableCell>
                      <TableCell>
                        <RowActions
                          items={[
                            {
                              label: "Add account under it",
                              icon: Plus,
                              onSelect: () => setDialog({ parent: a }),
                              hidden: !a.isGroup || !can("account.create"),
                            },
                            {
                              label: "Edit",
                              icon: Pencil,
                              onSelect: () => setDialog({ account: a }),
                              hidden: !can("account.edit"),
                            },
                            {
                              label: a.isActive ? "Switch off" : "Switch on",
                              icon: Power,
                              onSelect: () => toggle(a),
                              hidden: !can("account.edit") || Boolean(a.systemKey),
                            },
                            {
                              label: "Delete",
                              icon: Trash2,
                              destructive: true,
                              separator: true,
                              onSelect: () => setDeleting(a),
                              hidden: !can("account.delete") || Boolean(a.systemKey),
                            },
                          ]}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <p className="text-muted-foreground text-xs">
            “auto” accounts receive automatic postings (payments, registrations) and can be renamed
            but not switched off.
          </p>
        </div>
      </RequirePermission>
      {dialog && (
        <AccountDialog
          account={dialog.account}
          parent={dialog.parent}
          groups={groups}
          onDone={() => setDialog(null)}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.code} ${deleting?.name}?`}
        description="Only accounts that were never posted to can be deleted."
        confirmLabel="Delete"
        destructive
        loading={remove.isPending}
        onConfirm={async () => {
          try {
            await remove.mutateAsync(deleting.id);
            toast.success("Account deleted");
            setDeleting(null);
          } catch (apiError) {
            toastError(apiError);
            setDeleting(null);
          }
        }}
      />
    </>
  );
}
