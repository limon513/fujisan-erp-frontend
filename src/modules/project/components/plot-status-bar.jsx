import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatNumber } from "@/lib/format";
import { PLOT_STATUS } from "../constants";

/**
 * Stacked bar of plot counts by status (blueprint colours). Segments are separated by a 2px gap
 * of the surface colour so neighbouring statuses stay distinct; the colours always come with the
 * text legend (status is never shown by colour alone).
 */
export default function PlotStatusBar({ counts, showLegend = true }) {
  const total = counts?.total ?? 0;

  return (
    <div className="space-y-2">
      <div
        className={`flex h-2.5 gap-[2px] overflow-hidden rounded-full ${total > 0 ? "" : "bg-muted"}`}
        role="img"
        aria-label={Object.entries(PLOT_STATUS)
          .map(([status, { label }]) => `${label} ${counts?.[status] ?? 0}`)
          .join(", ")}
      >
        {total > 0 &&
          Object.entries(PLOT_STATUS).map(([status, { label, color }]) =>
            counts[status] ? (
              <Tooltip key={status}>
                <TooltipTrigger asChild>
                  <div
                    className="min-w-1"
                    style={{ flexGrow: counts[status], flexBasis: 0, backgroundColor: color }}
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
