"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuditFilterOptions } from "../api";
import { actionLabel } from "./action-badge";

export const EMPTY_FILTERS = { search: "", entityType: "all", action: "all", from: "", to: "" };

export default function AuditLogFilters({ value, onChange }) {
  const { data: options } = useAuditFilterOptions();
  const set = (patch) => onChange({ ...value, ...patch });
  const dirty = JSON.stringify(value) !== JSON.stringify(EMPTY_FILTERS);

  return (
    <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
      <div className="relative md:w-64">
        <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          placeholder="Search description or record ID"
          className="pl-8"
          value={value.search}
          onChange={(e) => set({ search: e.target.value })}
        />
      </div>

      <Select value={value.entityType} onValueChange={(entityType) => set({ entityType })}>
        <SelectTrigger className="md:w-44" aria-label="Record type">
          <SelectValue placeholder="Record type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All records</SelectItem>
          {options?.entityTypes.map((type) => (
            <SelectItem key={type} value={type}>
              {type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={value.action} onValueChange={(action) => set({ action })}>
        <SelectTrigger className="md:w-48" aria-label="Action">
          <SelectValue placeholder="Action" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All actions</SelectItem>
          {options?.actions.map((action) => (
            <SelectItem key={action} value={action}>
              {actionLabel(action)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Input
          type="date"
          aria-label="From date"
          className="md:w-40"
          value={value.from}
          max={value.to || undefined}
          onChange={(e) => set({ from: e.target.value })}
        />
        <span className="text-muted-foreground text-sm">to</span>
        <Input
          type="date"
          aria-label="To date"
          className="md:w-40"
          value={value.to}
          min={value.from || undefined}
          onChange={(e) => set({ to: e.target.value })}
        />
      </div>

      {dirty && (
        <Button variant="ghost" onClick={() => onChange(EMPTY_FILTERS)}>
          <X /> Clear
        </Button>
      )}
    </div>
  );
}
