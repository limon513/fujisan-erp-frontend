import Link from "next/link";

/**
 * Ranked horizontal bars with the name and value as text beside each bar (one series, one
 * colour). Rows: [{ id, name, amount, count?, href? }].
 */
export default function BarList({ rows, format, countLabel, empty = "Nothing in this period." }) {
  if (!rows.length) return <p className="text-muted-foreground text-sm">{empty}</p>;
  const max = Math.max(...rows.map((r) => Number(r.amount)), 0) || 1;
  return (
    <ul className="space-y-2.5">
      {rows.map((row) => {
        const name = row.href ? (
          <Link href={row.href} className="hover:underline">
            {row.name}
          </Link>
        ) : (
          row.name
        );
        return (
          <li
            key={row.id ?? row.key ?? row.name}
            className="space-y-1"
            title={`${row.name}: ${format(row.amount)}${row.count != null ? ` (${row.count} ${countLabel ?? ""})` : ""}`}
          >
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">{name}</span>
              <span className="shrink-0 tabular-nums">
                {format(row.amount)}
                {row.count != null && countLabel && (
                  <span className="text-muted-foreground ml-1.5 text-xs">
                    {row.count} {row.count === 1 ? countLabel.replace(/s$/, "") : countLabel}
                  </span>
                )}
              </span>
            </div>
            <div className="bg-muted h-2 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(1, (Number(row.amount) / max) * 100)}%`,
                  backgroundColor: "var(--chart-1)",
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
