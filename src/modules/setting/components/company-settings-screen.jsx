"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CircleAlert, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import FormField, { applyApiErrors } from "@/components/common/form-field";
import PageHeader from "@/components/common/page-header";
import { formatDateTime } from "@/lib/format";
import { useCan } from "@/modules/auth/auth-provider";
import { useCompany, useUpdateCompany } from "../api";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const FIELDS = [
  "name",
  "legalName",
  "address",
  "phone",
  "email",
  "website",
  "tin",
  "bin",
  "fiscalYearStartMonth",
];

const schema = z.object({
  name: z.string().trim().min(2, "Enter the company name"),
  legalName: z.string(),
  address: z.string(),
  phone: z.string(),
  email: z.string(),
  website: z.string(),
  tin: z.string(),
  bin: z.string(),
  fiscalYearStartMonth: z.coerce.number().int().min(1).max(12),
});

function CompanyForm({ company, readOnly }) {
  const update = useUpdateCompany();
  const [error, setError] = useState(null);
  const form = useForm({
    resolver: zodResolver(schema),
    values: Object.fromEntries(FIELDS.map((key) => [key, company[key] ?? ""])),
  });
  const { control } = form;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await update.mutateAsync(values);
      toast.success("Company profile saved");
    } catch (apiError) {
      if (!applyApiErrors(apiError, form.setError, FIELDS)) setError(apiError.message);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Company profile</CardTitle>
          <CardDescription>
            Shown on the sign-in page, money receipts, agreements and reports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <fieldset disabled={readOnly} className="contents">
            <FieldGroup>
              {error && (
                <Alert variant="destructive">
                  <CircleAlert />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                <FormField control={control} name="name" label="Company name" />
                <FormField
                  control={control}
                  name="legalName"
                  label="Legal name"
                  description="As registered (RJSC)"
                />
              </div>
              <FormField control={control} name="address" label="Registered address" />
              <div className="grid gap-4 md:grid-cols-3">
                <FormField control={control} name="phone" label="Phone" />
                <FormField control={control} name="email" label="Email" type="email" />
                <FormField
                  control={control}
                  name="website"
                  label="Website"
                  placeholder="https://"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={control}
                  name="tin"
                  label="e-TIN"
                  inputMode="numeric"
                  description="12 digits"
                />
                <FormField control={control} name="bin" label="BIN (VAT)" />
                <FormField
                  control={control}
                  name="fiscalYearStartMonth"
                  label="Fiscal year starts in"
                  render={(field) => (
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(Number(v))}
                      disabled={readOnly}
                    >
                      <SelectTrigger id="fiscalYearStartMonth" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((month, index) => (
                          <SelectItem key={month} value={String(index + 1)}>
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="text-muted-foreground grid gap-1 text-sm md:grid-cols-2">
                <p>
                  Currency: <span className="text-foreground">{company.currency}</span>
                </p>
                <p>
                  Time zone: <span className="text-foreground">{company.timezone}</span>
                </p>
              </div>
            </FieldGroup>
          </fieldset>
        </CardContent>
        {!readOnly && (
          <CardFooter className="justify-between gap-2 border-t">
            <p className="text-muted-foreground text-xs">
              Last updated {formatDateTime(company.updatedAt)}
            </p>
            <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
              {form.formState.isSubmitting && <Spinner />}
              Save changes
            </Button>
          </CardFooter>
        )}
      </Card>
    </form>
  );
}

export default function CompanySettingsScreen() {
  const can = useCan();
  const { data: company, isLoading, error } = useCompany();
  const readOnly = !can("setting.edit");

  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader title="Settings" description="Company-wide configuration." />
      {readOnly && (
        <Alert>
          <Lock />
          <AlertDescription>You can view these settings but not change them.</AlertDescription>
        </Alert>
      )}
      {error ? (
        <p className="text-destructive text-sm">{error.message}</p>
      ) : isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <CompanyForm company={company} readOnly={readOnly} />
      )}
    </div>
  );
}
