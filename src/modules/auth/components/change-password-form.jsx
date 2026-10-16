"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CircleAlert, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import FormField, { applyApiErrors } from "@/components/common/form-field";
import { useAuth } from "../auth-provider";
import { authApi } from "../api";
import { changePasswordSchema } from "../schemas";
import { safeNext } from "./login-form";

export default function ChangePasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, reloadUser, logout } = useAuth();
  const [formError, setFormError] = useState(null);
  const forced = Boolean(user?.mustChangePassword);
  const next = safeNext(searchParams.get("next"));

  const form = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async ({ currentPassword, newPassword }) => {
    setFormError(null);
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      await reloadUser();
      toast.success("Password changed. Other devices were signed out.");
      router.replace(next);
    } catch (error) {
      if (!applyApiErrors(error, form.setError, ["currentPassword", "newPassword"])) {
        setFormError(error.message);
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Change password</CardTitle>
        <CardDescription>
          At least 8 characters with an uppercase letter, a lowercase letter and a number.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            {forced && (
              <Alert>
                <ShieldAlert />
                <AlertDescription>
                  You need to set a new password before you can continue.
                </AlertDescription>
              </Alert>
            )}
            {formError && (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <FormField
              control={form.control}
              name="currentPassword"
              label="Current password"
              type="password"
              autoComplete="current-password"
              autoFocus
            />
            <FormField
              control={form.control}
              name="newPassword"
              label="New password"
              type="password"
              autoComplete="new-password"
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
            />
            <div className="flex gap-2">
              {forced ? (
                <Button type="button" variant="outline" className="flex-1" onClick={() => logout()}>
                  Sign out
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
              )}
              <Button type="submit" className="flex-1" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Spinner />}
                Save password
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
