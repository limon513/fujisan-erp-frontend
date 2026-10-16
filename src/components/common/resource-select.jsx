"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NONE = "__none__";

/**
 * Select whose options come from a resource list (createResource().useList).
 *
 *   <ResourceSelect resource={branches} params={{ isActive: true }} value={id} onChange={setId} />
 *
 * `emptyLabel` adds a "none" option that maps to "". `getLabel(item)` customises option text.
 */
export default function ResourceSelect({
  resource,
  params = {},
  value,
  onChange,
  placeholder = "Select…",
  emptyLabel,
  getLabel = (item) => item.name,
  disabled,
  invalid,
  id,
  className,
}) {
  const { data, isLoading } = resource.useList({
    limit: 100,
    sortBy: "name",
    sortOrder: "asc",
    ...params,
  });
  const items = data?.data ?? [];

  return (
    <Select
      value={value ? value : emptyLabel ? NONE : ""}
      onValueChange={(next) => onChange(next === NONE ? "" : next)}
      disabled={disabled || isLoading}
    >
      <SelectTrigger id={id} aria-invalid={invalid} className={className ?? "w-full"}>
        <SelectValue placeholder={isLoading ? "Loading…" : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {emptyLabel && <SelectItem value={NONE}>{emptyLabel}</SelectItem>}
        {items.map((item) => (
          <SelectItem key={item.id} value={item.id}>
            {getLabel(item)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
