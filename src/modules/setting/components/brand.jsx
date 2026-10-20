"use client";

import { Building } from "lucide-react";
import { useBranding } from "../api";

/** Logo mark + app and company name (from the backend, falling back to env). */
export default function Brand() {
  const { data } = useBranding();
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? data?.appName ?? "Real Estate ERP";
  const company = data?.companyName ?? process.env.NEXT_PUBLIC_COMPANY_NAME ?? "";

  return (
    <div className="flex items-center gap-3">
      <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-lg">
        <Building className="size-5" />
      </div>
      <div className="leading-tight">
        <p className="font-semibold">{appName}</p>
        {company && <p className="text-muted-foreground text-sm">{company}</p>}
      </div>
    </div>
  );
}
