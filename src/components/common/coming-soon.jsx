"use client";

import { usePathname } from "next/navigation";
import { Construction } from "lucide-react";
import { findNavItem } from "@/config/navigation";
import { Badge } from "@/components/ui/badge";
import PageHeader from "./page-header";

/** Placeholder for screens that belong to a later roadmap phase. */
export default function ComingSoon() {
  const pathname = usePathname();
  const item = findNavItem(pathname);
  const title = item?.trail.at(-1) ?? "Page not found";

  return (
    <>
      <PageHeader title={title} />
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
        <Construction className="text-muted-foreground size-10" />
        {item ? (
          <>
            <p className="font-medium">This module is planned, not built yet.</p>
            <Badge variant="secondary">Roadmap phase {item.phase}</Badge>
          </>
        ) : (
          <p className="text-muted-foreground">There is no page at {pathname}.</p>
        )}
      </div>
    </>
  );
}
