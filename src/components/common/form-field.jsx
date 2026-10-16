"use client";

import { Controller } from "react-hook-form";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/**
 * Labelled input bound to react-hook-form, with error display.
 * Pass `render` for non-input controls: render={(field, invalid) => <Select ... />}.
 */
export default function FormField({ control, name, label, description, render, ...inputProps }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          {label && <FieldLabel htmlFor={name}>{label}</FieldLabel>}
          {render ? (
            render(field, fieldState.invalid)
          ) : (
            <Input id={name} aria-invalid={fieldState.invalid} {...field} {...inputProps} />
          )}
          {description && <FieldDescription>{description}</FieldDescription>}
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}

/** Copies API field errors ({ path, message }) onto the form. Returns true if any matched. */
export function applyApiErrors(error, setError, fields) {
  let matched = false;
  for (const { path, message } of error?.errors ?? []) {
    if (fields.includes(path)) {
      setError(path, { message });
      matched = true;
    }
  }
  return matched;
}
