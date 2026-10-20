"use client";

import { useMemo, useState } from "react";
import { Check, Hexagon, RectangleHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PLOT_STATUS } from "@/modules/project/constants";

const TOOLS = {
  rect: {
    label: "Rectangle",
    icon: RectangleHorizontal,
    help: "Drag across the plot on the image.",
  },
  polygon: {
    label: "Polygon",
    icon: Hexagon,
    help: "Click each corner. Click the first point (or press Enter) to finish. Backspace removes the last point, Esc cancels.",
  },
};

/** Side panel for outlining plots: choose a plot, pick a tool, draw on the map. */
export default function OutlineEditorPanel({
  plots,
  selectedId,
  onSelect,
  tool,
  onToolChange,
  onRemove,
  removing,
}) {
  const [search, setSearch] = useState("");
  const selected = plots.find((p) => p.id === selectedId);
  const mapped = plots.filter((p) => p.mapShape).length;

  const list = useMemo(() => {
    const term = search.trim().toLowerCase();
    return plots
      .filter((p) => !term || p.code.toLowerCase().includes(term))
      .sort(
        (a, b) =>
          Number(Boolean(a.mapShape)) - Number(Boolean(b.mapShape)) ||
          a.code.localeCompare(b.code, undefined, { numeric: true }),
      );
  }, [plots, search]);

  return (
    <aside className="flex min-h-0 flex-col gap-3 rounded-lg border p-3">
      <div>
        <p className="text-sm font-medium">Outline plots</p>
        <p className="text-muted-foreground text-xs">
          {mapped} of {plots.length} plots outlined
        </p>
        <div className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full transition-all"
            style={{ width: `${plots.length ? (mapped / plots.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-md border p-1">
        {Object.entries(TOOLS).map(([key, { label, icon: Icon }]) => (
          <Button
            key={key}
            size="sm"
            variant={tool === key ? "secondary" : "ghost"}
            onClick={() => onToolChange(key)}
            aria-pressed={tool === key}
          >
            <Icon /> {label}
          </Button>
        ))}
      </div>

      {selected ? (
        <div className="space-y-2 rounded-md border border-blue-500/40 bg-blue-500/5 p-2 text-sm">
          <p>
            Drawing <span className="font-semibold">{selected.code}</span>
            {selected.mapShape && (
              <span className="text-muted-foreground"> (replaces its outline)</span>
            )}
          </p>
          <p className="text-muted-foreground text-xs">{TOOLS[tool].help}</p>
          {selected.mapShape && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive -ml-2"
              onClick={onRemove}
              disabled={removing}
            >
              <Trash2 /> Remove outline
            </Button>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground text-xs">
          Choose a plot below, then draw it on the map.
        </p>
      )}

      <Input
        placeholder="Find plot"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-8"
      />
      <ul className="-mx-1 min-h-0 flex-1 space-y-0.5 overflow-y-auto px-1">
        {list.map((plot) => (
          <li key={plot.id}>
            <button
              type="button"
              onClick={() => onSelect(plot.id)}
              className={cn(
                "hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm",
                plot.id === selectedId && "bg-muted font-medium",
              )}
            >
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: PLOT_STATUS[plot.status].color }}
              />
              <span className="flex-1">{plot.code}</span>
              {plot.mapShape ? (
                <Check className="size-4 text-emerald-600" />
              ) : (
                <span className="text-muted-foreground text-xs">not drawn</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
