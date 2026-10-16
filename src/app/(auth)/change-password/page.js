import { Suspense } from "react";
import AuthGate from "@/modules/auth/components/auth-gate";
import ChangePasswordForm from "@/modules/auth/components/change-password-form";

export const metadata = { title: "Change password" };

export default function ChangePasswordPage() {
  return (
    <AuthGate allowPasswordChange>
      <Suspense>
        <ChangePasswordForm />
      </Suspense>
    </AuthGate>
  );
}
