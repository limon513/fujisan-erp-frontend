"use client";

import { useEffect, useRef, useState } from "react";

const HEIGHT = 220;
const PAD = { top: 12, right: 8, bottom: 28, left: 52 };
const MAX_BAR = 24;
const GAP = 2;

/** 0 → max rounded up to a "nice" step, for 4 gridlines. */
function niceTicks(max) {
  if (max <= 0) return [0, 1];
  const raw = max / 4;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= raw);
  return Array.from({ length: 5 }, (_, i) => i * step);
}

/** A column with a 4px rounded data end and a square base. */
function columnPath(x, y, w, h) {
  if (h <= 0) return "";
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/**
 * Grouped columns on one money axis, with a hover tooltip per group and a table view.
 *
 *   <ColumnChart data={[{ label: "Oct", values: { booked: 1, collected: 2 } }]}
 *     series={[{ key: "booked", label: "Booked", color: "var(--chart-1)" }]} format={formatBDTShort} />
 */
export default function ColumnChart({ data, series, format, formatFull = format, label }) {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const max = Math.max(0, ...data.flatMap((d) => series.map((s) => Number(d.values[s.key]) || 0)));
  const ticks = niceTicks(max);
  const top = ticks.at(-1);
  const plotW = Math.max(0, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const band = data.length ? plotW / data.length : 0;
  const barW = Math.max(
    2,
    Math.min(MAX_BAR, (band * 0.7 - GAP * (series.length - 1)) / series.length),
  );
  const groupW = barW * series.length + GAP * (series.length - 1);
  const y = (v) => PAD.top + plotH - (v / top) * plotH;
  // Thin the x labels when they would collide
  const every = Math.ceil(data.length / Math.max(1, Math.floor(plotW / 44)));

  return (
    <figure className="space-y-3">
      {series.length > 1 && (
        <figcaption className="text-muted-foreground flex flex-wrap gap-4 text-xs">
          {series.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
              {s.label}
            </span>
          ))}
        </figcaption>
      )}
      <div ref={ref} className="relative" onMouseLeave={() => setHover(null)}>
        {width > 0 && (
          <svg width={width} height={HEIGHT} role="img" aria-label={label}>
            {ticks.map((t) => (
              <g key={t}>
                <line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={y(t)}
                  y2={y(t)}
                  className={t === 0 ? "stroke-border" : "stroke-border/60"}
                  strokeDasharray={t === 0 ? undefined : "2 3"}
                />
                <text
                  x={PAD.left - 8}
                  y={y(t)}
                  dy="0.32em"
                  textAnchor="end"
                  className="fill-muted-foreground text-[10px] tabular-nums"
                >
                  {format(t)}
                </text>
              </g>
            ))}
            {data.map((d, i) => {
              const x0 = PAD.left + band * i + (band - groupW) / 2;
              return (
                <g key={d.label}>
                  {hover === i && (
                    <rect
                      x={PAD.left + band * i}
                      y={PAD.top}
                      width={band}
                      height={plotH}
                      className="fill-muted/60"
                    />
                  )}
                  {series.map((s, k) => {
                    const v = Number(d.values[s.key]) || 0;
                    return (
                      <path
                        key={s.key}
                        d={columnPath(x0 + k * (barW + GAP), y(v), barW, y(0) - y(v))}
                        fill={s.color}
                      />
                    );
                  })}
                  {i % every === 0 && (
                    <text
                      x={PAD.left + band * i + band / 2}
                      y={HEIGHT - 8}
                      textAnchor="middle"
                      className="fill-muted-foreground text-[10px]"
                    >
                      {d.label}
                    </text>
                  )}
                  {/* Hit target: the whole band, taller than the marks */}
                  <rect
                    x={PAD.left + band * i}
                    y={0}
                    width={band}
                    height={HEIGHT}
                    fill="transparent"
                    onMouseEnter={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    tabIndex={-1}
                  />
                </g>
              );
            })}
          </svg>
        )}
        {hover != null && data[hover] && (
          <div
            className="bg-popover text-popover-foreground pointer-events-none absolute z-10 w-60 rounded-md border px-3 py-2 text-xs shadow-md"
            style={{
              top: 4,
              left: Math.min(
                Math.max(0, PAD.left + band * hover + band / 2 - 120),
                Math.max(0, width - 240),
              ),
            }}
          >
            <p className="mb-1 font-medium">{data[hover].tooltipLabel ?? data[hover].label}</p>
            {series.map((s) => (
              <p key={s.key} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 whitespace-nowrap">
                  <span className="size-2 rounded-sm" style={{ backgroundColor: s.color }} />
                  {s.label}
                </span>
                <span className="tabular-nums">{formatFull(data[hover].values[s.key])}</span>
              </p>
            ))}
          </div>
        )}
      </div>
      <details className="text-xs">
        <summary className="text-muted-foreground hover:text-foreground cursor-pointer select-none">
          Show as a table
        </summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-1 font-normal" />
              {series.map((s) => (
                <th key={s.key} className="py-1 text-right font-normal">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.label} className="border-t">
                <td className="py-1">{d.tooltipLabel ?? d.label}</td>
                {series.map((s) => (
                  <td key={s.key} className="py-1 text-right">
                    {formatFull(d.values[s.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
