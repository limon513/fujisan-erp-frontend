import { Building } from "lucide-react";

export default function AuthLayout({ children }) {
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Real Estate ERP";
  const company = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "";

  return (
    <div className="bg-muted/40 flex min-h-svh flex-col items-center justify-center gap-6 p-4 md:p-10">
      <div className="flex items-center gap-3">
        <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-lg">
          <Building className="size-5" />
        </div>
        <div className="leading-tight">
          <p className="font-semibold">{appName}</p>
          {company && <p className="text-muted-foreground text-sm">{company}</p>}
        </div>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
