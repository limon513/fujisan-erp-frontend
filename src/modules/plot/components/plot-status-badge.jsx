import { PLOT_STATUS } from "@/modules/project/constants";
import StatusBadge from "@/components/common/status-badge";

export default function PlotStatusBadge({ status }) {
  const { label, color } = PLOT_STATUS[status];
  return (
    <StatusBadge className="gap-1.5">
      <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </StatusBadge>
  );
}
