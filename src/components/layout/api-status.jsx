"use client";

import { useQuery } from "@tanstack/react-query";
import { http } from "@/lib/api-client";
import { cn } from "@/lib/utils";

/** Small backend health indicator for the sidebar footer. */
export default function ApiStatus() {
  const { data, isError, isPending } = useQuery({
    queryKey: ["health"],
    queryFn: () => http.get("/health").then((res) => res.data),
    refetchInterval: 60_000,
    retry: false,
  });

  const ok = !isError && data?.status === "ok";
  const label = isPending ? "Checking API…" : ok ? "API online" : "API unreachable";

  return (
    <div className="text-muted-foreground flex items-center gap-2 px-2 py-1 text-xs group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
      <span
        className={cn(
          "size-2 shrink-0 rounded-full",
          isPending ? "bg-muted-foreground" : ok ? "bg-emerald-500" : "bg-red-500",
        )}
      />
      <span className="truncate group-data-[collapsible=icon]:hidden">{label}</span>
    </div>
  );
}
