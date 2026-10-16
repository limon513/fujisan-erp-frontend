import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STYLES = {
  CREATE: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  UPDATE: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  DELETE: "bg-red-500/10 text-red-700 dark:text-red-400",
  PERMISSIONS_CHANGED: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  ACCOUNT_LOCKED: "bg-red-500/10 text-red-700 dark:text-red-400",
  SESSION_REVOKED: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

export const actionLabel = (action) =>
  action.charAt(0) + action.slice(1).toLowerCase().replace(/_/g, " ");

export default function ActionBadge({ action }) {
  return (
    <Badge variant="secondary" className={cn("font-medium", STYLES[action])}>
      {actionLabel(action)}
    </Badge>
  );
}
