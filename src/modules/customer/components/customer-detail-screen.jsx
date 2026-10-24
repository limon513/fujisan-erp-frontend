"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, FileText, FileUp, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ConfirmDialog from "@/components/common/confirm-dialog";
import FormDialog from "@/components/common/form-dialog";
import FormField, { applyApiErrors } from "@/components/common/form-field";
import RequirePermission from "@/components/common/require-permission";
import RowActions from "@/components/common/row-actions";
import StatusBadge from "@/components/common/status-badge";
import {
  formatDateOnly,
  formatDateTime,
  formatFileSize,
  formatMobile,
  formatNumber,
} from "@/lib/format";
import { toastError } from "@/lib/notify";
import { useCan } from "@/modules/auth/auth-provider";
import {
  customers,
  useAddDocument,
  useRemoveDocument,
  useRemoveNominee,
  useSaveNominee,
} from "../api";
import CustomerFormSheet from "./customer-form-sheet";

const Detail = ({ label, children }) => (
  <div className="grid grid-cols-[9rem_1fr] gap-2 py-1.5 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="min-w-0 break-words">{children || "—"}</span>
  </div>
);

const initials = (name) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

// --- nominees ---------------------------------------------------------------------------------

const nomineeSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the nominee's name"),
  relation: z.string().trim().min(2, "e.g. Wife, Son"),
  nidNumber: z.string(),
  mobile: z.string(),
  sharePercent: z.coerce.number().positive("More than 0").max(100, "At most 100"),
});

function NomineeDialog({ customerId, nominee, remaining, onClose }) {
  const save = useSaveNominee(customerId);
  const [error, setError] = useState(null);
  const form = useForm({
    resolver: zodResolver(nomineeSchema),
    values:
      nominee === "new"
        ? { fullName: "", relation: "", nidNumber: "", mobile: "", sharePercent: remaining }
        : nominee && {
            fullName: nominee.fullName,
            relation: nominee.relation,
            nidNumber: nominee.nidNumber ?? "",
            mobile: nominee.mobile ? formatMobile(nominee.mobile).replace("-", "") : "",
            sharePercent: Number(nominee.sharePercent),
          },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await save.mutateAsync({ ...(nominee !== "new" && { id: nominee.id }), ...values });
      toast.success("Nominee saved");
      onClose();
    } catch (apiError) {
      if (!applyApiErrors(apiError, form.setError, Object.keys(nomineeSchema.shape)))
        setError(apiError.message);
    }
  });

  return (
    <FormDialog
      open={Boolean(nominee)}
      onOpenChange={(open) => !open && onClose()}
      title={nominee === "new" ? "Add nominee" : "Edit nominee"}
      description="Shares of all nominees can add up to at most 100%."
      onSubmit={onSubmit}
      submitting={form.formState.isSubmitting}
      error={error}
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
        <FormField control={form.control} name="fullName" label="Full name" />
        <FormField control={form.control} name="relation" label="Relation" placeholder="Wife" />
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_1fr_7rem]">
        <FormField control={form.control} name="nidNumber" label="NID" inputMode="numeric" />
        <FormField control={form.control} name="mobile" label="Mobile" />
        <FormField
          control={form.control}
          name="sharePercent"
          label="Share %"
          type="number"
          min={1}
          max={100}
          step="0.01"
        />
      </div>
    </FormDialog>
  );
}

function Nominees({ customer, canEdit }) {
  const remove = useRemoveNominee(customer.id);
  const [editing, setEditing] = useState(null);
  const total = customer.nominees.reduce((sum, n) => sum + Number(n.sharePercent), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Nominees</CardTitle>
        {canEdit && total < 100 && (
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus /> Add nominee
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {customer.nominees.length ? (
          <div className="divide-y rounded-lg border">
            {customer.nominees.map((n) => (
              <div key={n.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {n.fullName}{" "}
                    <span className="text-muted-foreground font-normal">· {n.relation}</span>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {[n.nidNumber && `NID ${n.nidNumber}`, n.mobile && formatMobile(n.mobile)]
                      .filter(Boolean)
                      .join(" · ") || "No ID details"}
                  </p>
                </div>
                <span className="font-medium tabular-nums">{formatNumber(n.sharePercent)}%</span>
                {canEdit && (
                  <RowActions
                    items={[
                      { label: "Edit", icon: Pencil, onSelect: () => setEditing(n) },
                      {
                        label: "Remove",
                        icon: Trash2,
                        destructive: true,
                        onSelect: () => remove.mutateAsync(n.id).catch(toastError),
                      },
                    ]}
                  />
                )}
              </div>
            ))}
            <div className="text-muted-foreground flex justify-between px-3 py-2 text-xs">
              <span>Total</span>
              <span className={total === 100 ? "text-emerald-600" : ""}>
                {formatNumber(total)}%
              </span>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No nominees yet.</p>
        )}
      </CardContent>
      <NomineeDialog
        customerId={customer.id}
        nominee={editing}
        remaining={Math.max(0, 100 - total)}
        onClose={() => setEditing(null)}
      />
    </Card>
  );
}

// --- documents --------------------------------------------------------------------------------

const DOCUMENT_LABELS = {
  NID: "NID copy",
  PHOTO: "Photo",
  PASSPORT: "Passport",
  TIN: "TIN certificate",
  DOCUMENT: "Document",
  OTHER: "Other",
};

function Documents({ customer, canEdit }) {
  const input = useRef(null);
  const [category, setCategory] = useState("NID");
  const add = useAddDocument(customer.id);
  const remove = useRemoveDocument(customer.id);

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      await add.mutateAsync({ file, category });
      toast.success(`${DOCUMENT_LABELS[category]} uploaded`);
    } catch (error) {
      toastError(error);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>Documents</CardTitle>
        {canEdit && (
          <div className="flex gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-40" size="sm" aria-label="Document type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DOCUMENT_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              ref={input}
              type="file"
              accept={
                category === "PHOTO"
                  ? "image/jpeg,image/png,image/webp"
                  : "image/jpeg,image/png,image/webp,application/pdf"
              }
              className="hidden"
              onChange={onFile}
            />
            <Button size="sm" onClick={() => input.current?.click()} disabled={add.isPending}>
              <FileUp /> {add.isPending ? "Uploading…" : "Upload"}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {customer.documents.length ? (
          <div className="divide-y rounded-lg border">
            {customer.documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <FileText className="text-muted-foreground size-4 shrink-0" />
                <div className="min-w-0 flex-1">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate font-medium hover:underline"
                  >
                    {doc.originalName}
                  </a>
                  <p className="text-muted-foreground text-xs">
                    {DOCUMENT_LABELS[doc.category] ?? doc.category} · {formatFileSize(doc.size)} ·{" "}
                    {formatDateTime(doc.createdAt)}
                  </p>
                </div>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${doc.originalName}`}
                    onClick={() => remove.mutateAsync(doc.id).catch(toastError)}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            No documents yet. Upload the NID copy and a photo.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// --- holds ------------------------------------------------------------------------------------

const HOLD_STATUS = {
  ACTIVE: ["On hold", "amber"],
  RELEASED: ["Released", "gray"],
  EXPIRED: ["Expired", "gray"],
  CONVERTED: ["Booked", "blue"],
};

function Holds({ customer }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Plot holds</CardTitle>
      </CardHeader>
      <CardContent>
        {customer.holds.length ? (
          <div className="divide-y rounded-lg border">
            {customer.holds.map((hold) => (
              <div key={hold.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    <Link
                      href={`/plot-map?project=${hold.plot.project.id}`}
                      className="hover:underline"
                    >
                      Plot {hold.plot.code}
                    </Link>{" "}
                    <span className="text-muted-foreground font-normal">
                      · {hold.plot.project.name}
                    </span>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatDateTime(hold.createdAt)} · {hold.days} day{hold.days === 1 ? "" : "s"} ·{" "}
                    {hold.reason}
                  </p>
                </div>
                <StatusBadge tone={HOLD_STATUS[hold.status][1]}>
                  {HOLD_STATUS[hold.status][0]}
                </StatusBadge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            No plots have been held for this customer.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// --- screen -----------------------------------------------------------------------------------

export default function CustomerDetailScreen() {
  const { id } = useParams();
  const router = useRouter();
  const can = useCan();
  const { data: customer, isLoading, error } = customers.useItem(id);
  const remove = customers.useRemove();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const canEdit = can("customer.edit");

  return (
    <RequirePermission permission="customer.view">
      <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
        <Link href="/customers">
          <ArrowLeft /> All customers
        </Link>
      </Button>
      {error ? (
        <p className="text-destructive text-sm">
          {error.status === 404
            ? "This customer doesn't exist or isn't in your access scope."
            : error.message}
        </p>
      ) : isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="size-16">
                {customer.photoUrl && (
                  <AvatarImage
                    src={customer.photoUrl}
                    alt={customer.fullName}
                    className="object-cover"
                  />
                )}
                <AvatarFallback className="text-lg">{initials(customer.fullName)}</AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{customer.fullName}</h1>
                <p className="text-muted-foreground text-sm">
                  {customer.customerCode} · {formatMobile(customer.mobile)}
                  {customer.owner && ` · handled by ${customer.owner.fullName}`}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {can("booking.create") && (
                <Button asChild>
                  <Link href={`/bookings/new?customerId=${customer.id}`}>
                    <FileText /> New booking
                  </Link>
                </Button>
              )}
              {canEdit && (
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <Pencil /> Edit
                </Button>
              )}
              {can("customer.delete") && (
                <Button
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => setDeleting(true)}
                >
                  <Trash2 /> Delete
                </Button>
              )}
            </div>
          </div>

          <Tabs defaultValue="profile">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="nominees">Nominees ({customer.nominees.length})</TabsTrigger>
              <TabsTrigger value="documents">Documents ({customer.documents.length})</TabsTrigger>
              <TabsTrigger value="holds">Holds ({customer.holds.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="profile" className="pt-2">
              <Card>
                <CardContent className="grid gap-x-8 md:grid-cols-2">
                  <div>
                    <Detail label="Father's name">{customer.fatherName}</Detail>
                    <Detail label="Mother's name">{customer.motherName}</Detail>
                    <Detail label="Spouse's name">{customer.spouseName}</Detail>
                    <Detail label="Date of birth">
                      {customer.dateOfBirth && formatDateOnly(customer.dateOfBirth)}
                    </Detail>
                    <Detail label="Profession">
                      {[customer.profession, customer.organization].filter(Boolean).join(", ")}
                    </Detail>
                    <Detail label="Notes">{customer.notes}</Detail>
                  </div>
                  <div>
                    <Detail label="NID">{customer.nidNumber}</Detail>
                    <Detail label="Passport">{customer.passportNumber}</Detail>
                    <Detail label="e-TIN">{customer.tin}</Detail>
                    <Detail label="Other mobile">
                      {customer.altMobile && formatMobile(customer.altMobile)}
                    </Detail>
                    <Detail label="Email">{customer.email}</Detail>
                    <Detail label="Present address">{customer.presentAddress}</Detail>
                    <Detail label="Permanent address">{customer.permanentAddress}</Detail>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="nominees" className="pt-2">
              <Nominees customer={customer} canEdit={canEdit} />
            </TabsContent>
            <TabsContent value="documents" className="pt-2">
              <Documents customer={customer} canEdit={canEdit} />
            </TabsContent>
            <TabsContent value="holds" className="pt-2">
              <Holds customer={customer} />
            </TabsContent>
          </Tabs>

          <CustomerFormSheet open={editing} onOpenChange={setEditing} customer={customer} />
          <ConfirmDialog
            open={deleting}
            onOpenChange={setDeleting}
            title={`Delete ${customer.fullName}?`}
            description="The record is hidden from lists; its history is kept. Customers with a plot on hold can't be deleted."
            confirmLabel="Delete"
            destructive
            loading={remove.isPending}
            onClosed={() => deleted && router.push("/customers")}
            onConfirm={async () => {
              try {
                await remove.mutateAsync(customer.id);
                toast.success(`${customer.fullName} deleted`);
                setDeleted(true);
                setDeleting(false);
              } catch (apiError) {
                toastError(apiError);
                setDeleting(false);
              }
            }}
          />
        </div>
      )}
    </RequirePermission>
  );
}
