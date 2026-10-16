"use client";

import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * "⋯" menu for a table row. items: [{ label, icon: Icon, onSelect, destructive, hidden, separator }]
 * Clicks don't bubble to the row (rows may be clickable).
 */
export default function RowActions({ items, label = "Actions" }) {
  const visible = items.filter((item) => !item.hidden);
  if (!visible.length) return null;

  return (
    <div onClick={(event) => event.stopPropagation()} className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={label}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {visible.map(
            ({ label: itemLabel, icon: Icon, onSelect, destructive, separator }, index) => (
              <div key={itemLabel}>
                {separator && index > 0 && <DropdownMenuSeparator />}
                <DropdownMenuItem
                  variant={destructive ? "destructive" : "default"}
                  onSelect={onSelect}
                >
                  {Icon && <Icon />} {itemLabel}
                </DropdownMenuItem>
              </div>
            ),
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
