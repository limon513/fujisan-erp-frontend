"use client";

import { ShieldOff } from "lucide-react";
import { useCan } from "@/modules/auth/auth-provider";

/** Page-level guard: shows a friendly message when the user lacks the permission. */
export default function RequirePermission({ permission, children }) {
  const can = useCan();
  if (can(permission)) return children;

  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
      <ShieldOff className="text-muted-foreground size-10" />
      <p className="font-medium">You don&apos;t have access to this page.</p>
      <p className="text-muted-foreground text-sm">Ask an administrator if you need it.</p>
    </div>
  );
}
