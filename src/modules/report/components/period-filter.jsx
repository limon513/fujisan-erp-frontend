"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ResourceSelect from "@/components/common/resource-select";
import { projects } from "@/modules/project/api";

const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Preset → { from, to } as YYYY-MM-DD (calendar dates, Bangladesh fiscal year July–June). */
export function presetRange(preset, now = new Date()) {
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (preset) {
    case "last-month":
      return { from: ymd(new Date(y, m - 1, 1)), to: ymd(new Date(y, m, 0)) };
    case "last-3-months":
      return { from: ymd(new Date(y, m - 2, 1)), to: ymd(now) };
    case "fiscal-year":
      return { from: ymd(new Date(m >= 6 ? y : y - 1, 6, 1)), to: ymd(now) };
    case "today":
      return { from: ymd(now), to: ymd(now) };
    default:
      return { from: ymd(new Date(y, m, 1)), to: ymd(now) };
  }
}

export const PRESETS = {
  today: "Today",
  "this-month": "This month",
  "last-month": "Last month",
  "last-3-months": "Last 3 months",
  "fiscal-year": "This fiscal year",
  custom: "Custom dates",
};

/** One row: period preset, from/to dates (custom), project. */
export default function PeriodFilter({ value, onChange, showPeriod = true }) {
  const set = (patch) => onChange({ ...value, ...patch });
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      {showPeriod && (
        <>
          <Select
            value={value.preset}
            onValueChange={(preset) =>
              set(preset === "custom" ? { preset } : { preset, ...presetRange(preset) })
            }
          >
            <SelectTrigger className="w-44" aria-label="Period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PRESETS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            aria-label="From"
            className="w-40"
            value={value.from}
            onChange={(e) => e.target.value && set({ preset: "custom", from: e.target.value })}
          />
          <span className="text-muted-foreground text-sm">to</span>
          <Input
            type="date"
            aria-label="To"
            className="w-40"
            value={value.to}
            onChange={(e) => e.target.value && set({ preset: "custom", to: e.target.value })}
          />
        </>
      )}
      <div className="w-52">
        <ResourceSelect
          resource={projects}
          params={{ sortBy: "name", sortOrder: "asc" }}
          value={value.projectId}
          onChange={(projectId) => set({ projectId })}
          emptyLabel="All projects"
          placeholder="All projects"
        />
      </div>
    </div>
  );
}
