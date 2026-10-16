"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CircleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import FormField, { applyApiErrors } from "@/components/common/form-field";
import ResourceSelect from "@/components/common/resource-select";
import { formatMobile, toDateInput } from "@/lib/format";
import { branches, departments, designations, employees, teams } from "../api";
import { EMPLOYMENT_STATUS, EMPLOYMENT_TYPES } from "./employee-labels";

const schema = z.object({
  employeeCode: z.string(),
  fullName: z.string().trim().min(2, "Enter the full name"),
  mobile: z.string().trim().min(11, "Enter a mobile number"),
  email: z.string(),
  gender: z.string(),
  dateOfBirth: z.string(),
  nidNumber: z.string(),
  bloodGroup: z.string(),
  branchId: z.string().min(1, "Choose a branch"),
  departmentId: z.string().min(1, "Choose a department"),
  designationId: z.string().min(1, "Choose a designation"),
  teamId: z.string(),
  reportingManagerId: z.string(),
  joiningDate: z.string().min(1, "Choose the joining date"),
  employmentType: z.string(),
  employmentStatus: z.string(),
  presentAddress: z.string(),
  permanentAddress: z.string(),
  emergencyName: z.string(),
  emergencyRelation: z.string(),
  emergencyMobile: z.string(),
});

const EMPTY = {
  employeeCode: "",
  fullName: "",
  mobile: "",
  email: "",
  gender: "",
  dateOfBirth: "",
  nidNumber: "",
  bloodGroup: "",
  branchId: "",
  departmentId: "",
  designationId: "",
  teamId: "",
  reportingManagerId: "",
  joiningDate: "",
  employmentType: "PERMANENT",
  employmentStatus: "ACTIVE",
  presentAddress: "",
  permanentAddress: "",
  emergencyName: "",
  emergencyRelation: "",
  emergencyMobile: "",
};

const toFormValues = (e) => ({
  ...EMPTY,
  employeeCode: e.employeeCode,
  fullName: e.fullName,
  mobile: formatMobile(e.mobile).replace("-", ""),
  email: e.email ?? "",
  gender: e.gender ?? "",
  dateOfBirth: toDateInput(e.dateOfBirth),
  nidNumber: e.nidNumber ?? "",
  bloodGroup: e.bloodGroup ?? "",
  branchId: e.branch.id,
  departmentId: e.department.id,
  designationId: e.designation.id,
  teamId: e.team?.id ?? "",
  reportingManagerId: e.reportingManager?.id ?? "",
  joiningDate: toDateInput(e.joiningDate),
  employmentType: e.employmentType,
  employmentStatus: e.employmentStatus,
  presentAddress: e.presentAddress ?? "",
  permanentAddress: e.permanentAddress ?? "",
  emergencyName: e.emergencyContact?.name ?? "",
  emergencyRelation: e.emergencyContact?.relation ?? "",
  emergencyMobile: e.emergencyContact?.mobile
    ? formatMobile(e.emergencyContact.mobile).replace("-", "")
    : "",
});

const toBody = (
  { employeeCode, emergencyName, emergencyRelation, emergencyMobile, ...values },
  isNew,
) => ({
  ...values,
  ...(isNew && employeeCode.trim() && { employeeCode }),
  gender: values.gender || null,
  bloodGroup: values.bloodGroup || null,
  emergencyContact: emergencyName.trim()
    ? { name: emergencyName, relation: emergencyRelation, mobile: emergencyMobile }
    : null,
});

// Emergency contact fields map to the nested API field
const API_FIELD_MAP = {
  "emergencyContact.name": "emergencyName",
  "emergencyContact.mobile": "emergencyMobile",
};

function EnumSelect({ field, invalid, options, placeholder, id, allowEmpty }) {
  return (
    <Select
      value={field.value || (allowEmpty ? "__none__" : "")}
      onValueChange={(v) => field.onChange(v === "__none__" ? "" : v)}
    >
      <SelectTrigger id={id} aria-invalid={invalid} className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowEmpty && <SelectItem value="__none__">Not set</SelectItem>}
        {Object.entries(options).map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const GENDERS = { MALE: "Male", FEMALE: "Female", OTHER: "Other" };
const BLOOD_GROUPS = Object.fromEntries(
  ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => [g, g]),
);

/** Create / edit an employee in a side sheet. `employee` = full record from GET /employees/:id. */
export default function EmployeeFormSheet({ open, onOpenChange, employee }) {
  const isNew = !employee;
  const create = employees.useCreate();
  const update = employees.useUpdate();
  const [error, setError] = useState(null);

  const form = useForm({
    resolver: zodResolver(schema),
    values: employee ? toFormValues(employee) : EMPTY,
  });
  const { control } = form;
  const [branchId, departmentId] = useWatch({ control, name: ["branchId", "departmentId"] });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const body = toBody(values, isNew);
      if (isNew) await create.mutateAsync(body);
      else await update.mutateAsync({ id: employee.id, ...body });
      toast.success(isNew ? "Employee added" : "Employee updated");
      onOpenChange(false);
    } catch (apiError) {
      const mapped = {
        ...apiError,
        errors: apiError.errors.map((e) => ({ ...e, path: API_FIELD_MAP[e.path] ?? e.path })),
      };
      if (!applyApiErrors(mapped, form.setError, Object.keys(EMPTY))) setError(apiError.message);
    }
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-3xl">
        <form onSubmit={onSubmit} noValidate className="flex h-full flex-col">
          <SheetHeader className="border-b">
            <SheetTitle>{isNew ? "New employee" : `Edit ${employee.fullName}`}</SheetTitle>
          </SheetHeader>

          <div className="flex-1 space-y-8 overflow-y-auto p-4">
            {error && (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <FieldSet>
              <FieldLegend>Personal</FieldLegend>
              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
                  <FormField control={control} name="fullName" label="Full name" />
                  <FormField
                    control={control}
                    name="employeeCode"
                    label="Employee ID"
                    placeholder={isNew ? "Auto" : undefined}
                    disabled={!isNew}
                    description={isNew ? "Leave empty to auto-number" : undefined}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={control}
                    name="mobile"
                    label="Mobile"
                    placeholder="01711-000000"
                  />
                  <FormField control={control} name="email" label="Email" type="email" />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField
                    control={control}
                    name="gender"
                    label="Gender"
                    render={(field, invalid) => (
                      <EnumSelect
                        id="gender"
                        field={field}
                        invalid={invalid}
                        options={GENDERS}
                        placeholder="Not set"
                        allowEmpty
                      />
                    )}
                  />
                  <FormField
                    control={control}
                    name="dateOfBirth"
                    label="Date of birth"
                    type="date"
                  />
                  <FormField
                    control={control}
                    name="bloodGroup"
                    label="Blood group"
                    render={(field, invalid) => (
                      <EnumSelect
                        id="bloodGroup"
                        field={field}
                        invalid={invalid}
                        options={BLOOD_GROUPS}
                        placeholder="Not set"
                        allowEmpty
                      />
                    )}
                  />
                </div>
                <FormField
                  control={control}
                  name="nidNumber"
                  label="NID number"
                  inputMode="numeric"
                  description="10, 13 or 17 digits"
                />
              </FieldGroup>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Job</FieldLegend>
              <FieldGroup>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={control}
                    name="branchId"
                    label="Branch"
                    render={(field, invalid) => (
                      <ResourceSelect
                        id="branchId"
                        resource={branches}
                        params={{ isActive: true }}
                        value={field.value}
                        onChange={field.onChange}
                        invalid={invalid}
                      />
                    )}
                  />
                  <FormField
                    control={control}
                    name="departmentId"
                    label="Department"
                    render={(field, invalid) => (
                      <ResourceSelect
                        id="departmentId"
                        resource={departments}
                        params={{ isActive: true }}
                        value={field.value}
                        onChange={(value) => {
                          field.onChange(value);
                          form.setValue("designationId", "");
                          form.setValue("teamId", "");
                        }}
                        invalid={invalid}
                      />
                    )}
                  />
                  <FormField
                    control={control}
                    name="designationId"
                    label="Designation"
                    render={(field, invalid) => (
                      <ResourceSelect
                        id="designationId"
                        resource={designations}
                        params={{
                          isActive: true,
                          departmentId,
                          sortBy: "level",
                          sortOrder: "desc",
                        }}
                        disabled={!departmentId}
                        value={field.value}
                        onChange={field.onChange}
                        invalid={invalid}
                        placeholder={departmentId ? "Select…" : "Choose a department first"}
                      />
                    )}
                  />
                  <FormField
                    control={control}
                    name="teamId"
                    label="Team"
                    render={(field, invalid) => (
                      <ResourceSelect
                        id="teamId"
                        resource={teams}
                        params={{ isActive: true, branchId, departmentId }}
                        disabled={!branchId || !departmentId}
                        value={field.value}
                        onChange={field.onChange}
                        invalid={invalid}
                        emptyLabel="No team"
                      />
                    )}
                  />
                </div>
                <FormField
                  control={control}
                  name="reportingManagerId"
                  label="Reporting manager"
                  render={(field, invalid) => (
                    <ResourceSelect
                      id="reportingManagerId"
                      resource={employees}
                      params={{ sortBy: "fullName", employmentStatus: "ACTIVE" }}
                      value={field.value}
                      onChange={field.onChange}
                      invalid={invalid}
                      emptyLabel="None"
                      getLabel={(e) => `${e.fullName} — ${e.designation.name}`}
                    />
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField
                    control={control}
                    name="joiningDate"
                    label="Joining date"
                    type="date"
                  />
                  <FormField
                    control={control}
                    name="employmentType"
                    label="Type"
                    render={(field, invalid) => (
                      <EnumSelect
                        id="employmentType"
                        field={field}
                        invalid={invalid}
                        options={EMPLOYMENT_TYPES}
                      />
                    )}
                  />
                  <FormField
                    control={control}
                    name="employmentStatus"
                    label="Status"
                    render={(field, invalid) => (
                      <EnumSelect
                        id="employmentStatus"
                        field={field}
                        invalid={invalid}
                        options={Object.fromEntries(
                          Object.entries(EMPLOYMENT_STATUS).map(([k, v]) => [k, v.label]),
                        )}
                      />
                    )}
                  />
                </div>
              </FieldGroup>
            </FieldSet>

            <FieldSet>
              <FieldLegend>Address & emergency contact</FieldLegend>
              <FieldGroup>
                <FormField control={control} name="presentAddress" label="Present address" />
                <FormField control={control} name="permanentAddress" label="Permanent address" />
                <div className="grid gap-4 sm:grid-cols-3">
                  <FormField control={control} name="emergencyName" label="Contact name" />
                  <FormField control={control} name="emergencyRelation" label="Relation" />
                  <FormField control={control} name="emergencyMobile" label="Contact mobile" />
                </div>
              </FieldGroup>
            </FieldSet>
          </div>

          <SheetFooter className="flex-row justify-end border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Spinner />}
              {isNew ? "Add employee" : "Save changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
