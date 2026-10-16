"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, CircleCheck, MailCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";
import FormField, { applyApiErrors } from "@/components/common/form-field";
import { authApi } from "../api";
import { forgotPasswordSchema, resetPasswordSchema } from "../schemas";

const backToLogin = (
  <Link
    href="/login"
    className="text-muted-foreground hover:text-foreground text-center text-sm underline-offset-4 hover:underline"
  >
    Back to sign in
  </Link>
);

function RequestCodeStep({ onSent }) {
  const [formError, setFormError] = useState(null);
  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { identifier: "" },
  });

  const onSubmit = async ({ identifier }) => {
    setFormError(null);
    try {
      await authApi.forgotPassword({ identifier });
      onSent(identifier);
    } catch (error) {
      setFormError(error.message);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        {formError && (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <FormField
          control={form.control}
          name="identifier"
          label="Username, email or mobile"
          autoComplete="username"
          autoFocus
        />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner />}
          Send reset code
        </Button>
        {backToLogin}
      </FieldGroup>
    </form>
  );
}

function ResetStep({ identifier, onDone }) {
  const [formError, setFormError] = useState(null);
  const form = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { code: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async ({ code, newPassword }) => {
    setFormError(null);
    try {
      await authApi.resetPassword({ identifier, code, newPassword });
      onDone();
    } catch (error) {
      if (!applyApiErrors(error, form.setError, ["code", "newPassword"])) {
        setFormError(error.message);
      }
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Alert>
          <MailCheck />
          <AlertDescription>
            If the account has an email address, a 6-digit code is on its way. It expires in 10
            minutes.
          </AlertDescription>
        </Alert>
        {formError && (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
        <FormField
          control={form.control}
          name="code"
          label="Reset code"
          render={(field, invalid) => (
            <InputOTP
              maxLength={6}
              inputMode="numeric"
              autoFocus
              aria-invalid={invalid}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
            >
              <InputOTPGroup>
                {Array.from({ length: 6 }, (_, index) => (
                  <InputOTPSlot key={index} index={index} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          )}
        />
        <FormField
          control={form.control}
          name="newPassword"
          label="New password"
          type="password"
          autoComplete="new-password"
          description="At least 8 characters with uppercase, lowercase and a number."
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
        />
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner />}
          Reset password
        </Button>
        {backToLogin}
      </FieldGroup>
    </form>
  );
}

export default function ForgotPasswordForm() {
  const [identifier, setIdentifier] = useState(null);
  const [done, setDone] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Reset password</CardTitle>
        <CardDescription>
          {identifier ? "Enter the code from the email." : "We'll email you a reset code."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {done ? (
          <FieldGroup>
            <Alert>
              <CircleCheck />
              <AlertDescription>
                Password reset. You were signed out everywhere; sign in with the new password.
              </AlertDescription>
            </Alert>
            <Button asChild className="w-full">
              <Link href="/login">Sign in</Link>
            </Button>
          </FieldGroup>
        ) : identifier ? (
          <ResetStep identifier={identifier} onDone={() => setDone(true)} />
        ) : (
          <RequestCodeStep onSent={setIdentifier} />
        )}
      </CardContent>
    </Card>
  );
}
