import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatNumber } from "@/lib/format";
import { PLOT_STATUS } from "../constants";

/** Stacked bar of plot counts by status (blueprint colours). */
export default function PlotStatusBar({ counts, showLegend = true }) {
  const total = counts?.total ?? 0;

  return (
    <div className="space-y-2">
      <div className="bg-muted flex h-2.5 overflow-hidden rounded-full">
        {total > 0 &&
          Object.entries(PLOT_STATUS).map(([status, { label, color }]) =>
            counts[status] ? (
              <Tooltip key={status}>
                <TooltipTrigger asChild>
                  <div
                    style={{ width: `${(counts[status] / total) * 100}%`, backgroundColor: color }}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  {label}: {formatNumber(counts[status])}
                </TooltipContent>
              </Tooltip>
            ) : null,
          )}
      </div>
      {showLegend && (
        <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-xs">
          {Object.entries(PLOT_STATUS).map(([status, { label, color }]) => (
            <span key={status} className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
              {label}{" "}
              <span className="text-foreground tabular-nums">
                {formatNumber(counts?.[status] ?? 0)}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
