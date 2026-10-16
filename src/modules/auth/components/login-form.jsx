"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import FormField from "@/components/common/form-field";
import { useAuth } from "../auth-provider";
import { loginSchema } from "../schemas";

/** Only same-site paths are allowed as a post-login target. */
export const safeNext = (value) =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [formError, setFormError] = useState(null);

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const onSubmit = async (values) => {
    setFormError(null);
    try {
      const user = await login({ ...values, deviceName: navigator.userAgent.slice(0, 100) });
      const next = safeNext(searchParams.get("next"));
      router.replace(
        user.mustChangePassword ? `/change-password?next=${encodeURIComponent(next)}` : next,
      );
    } catch (error) {
      setFormError(error.message);
      form.setValue("password", "");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Sign in</CardTitle>
        <CardDescription>Use your username, email or mobile number.</CardDescription>
      </CardHeader>
      <CardContent>
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
            <FormField
              control={form.control}
              name="password"
              label="Password"
              type="password"
              autoComplete="current-password"
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Spinner />}
              Sign in
            </Button>
            <Link
              href="/forgot-password"
              className="text-muted-foreground hover:text-foreground text-center text-sm underline-offset-4 hover:underline"
            >
              Forgot your password?
            </Link>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
