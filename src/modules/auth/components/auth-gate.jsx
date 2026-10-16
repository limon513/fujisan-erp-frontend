"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "../auth-provider";

const currentPath = () => window.location.pathname + window.location.search;

/**
 * Renders children only for a signed-in user. Sends signed-out users to /login and users who must
 * change their password to /change-password (unless `allowPasswordChange`).
 */
export default function AuthGate({ children, allowPasswordChange = false }) {
  const router = useRouter();
  const { status, user } = useAuth();
  const mustChange = status === "authenticated" && user.mustChangePassword && !allowPasswordChange;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace(`/login?next=${encodeURIComponent(currentPath())}`);
    } else if (mustChange) {
      router.replace(`/change-password?next=${encodeURIComponent(currentPath())}`);
    }
  }, [status, mustChange, router]);

  if (status !== "authenticated" || mustChange) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner className="text-muted-foreground size-6" />
      </div>
    );
  }

  return children;
}
