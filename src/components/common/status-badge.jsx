import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TONES = {
  green: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  red: "bg-red-500/10 text-red-700 dark:text-red-400",
  blue: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  gray: "bg-muted text-muted-foreground",
};

/** Small colored status pill. */
export default function StatusBadge({ tone = "gray", children, className }) {
  return (
    <Badge variant="secondary" className={cn("font-medium", TONES[tone], className)}>
      {children}
    </Badge>
  );
}

export const ActiveBadge = ({ active }) => (
  <StatusBadge tone={active ? "green" : "gray"}>{active ? "Active" : "Inactive"}</StatusBadge>
);
