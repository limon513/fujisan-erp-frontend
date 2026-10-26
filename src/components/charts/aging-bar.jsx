/** Not yet due in a neutral, then a light→dark ramp the later the money is. */
const COLORS = {
  current: "var(--chart-neutral)",
  d1_30: "var(--chart-late-1)",
  d31_60: "var(--chart-late-2)",
  d61_90: "var(--chart-late-3)",
  d90: "var(--chart-late-4)",
};

/**
 * Receivables aging: one stacked bar (2px gaps between segments) and a labelled legend with the
 * amounts, so no bucket is told apart by colour alone.
 */
export default function AgingBar({ aging, format }) {
  const total = aging.reduce((sum, b) => sum + Number(b.amount), 0);
  return (
    <div className="space-y-3">
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Aging">
        {total > 0 ? (
          aging
            .filter((b) => Number(b.amount) > 0)
            .map((b) => (
              <div
                key={b.key}
                title={`${b.label}: ${format(b.amount)}`}
                style={{
                  width: `${(Number(b.amount) / total) * 100}%`,
                  backgroundColor: COLORS[b.key],
                }}
              />
            ))
        ) : (
          <div className="bg-muted w-full" />
        )}
      </div>
      <dl className="space-y-1.5 text-sm">
        {aging.map((b) => (
          <div key={b.key} className="flex items-center justify-between gap-3">
            <dt className="text-muted-foreground flex items-center gap-2">
              <span className="size-2.5 rounded-sm" style={{ backgroundColor: COLORS[b.key] }} />
              {b.label}
            </dt>
            <dd className="font-medium tabular-nums">{format(b.amount)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
