"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { canGrant, SCOPE_LABELS, SCOPES } from "./scope";

const ACTIONS = ["view", "create", "edit", "delete", "approve", "export", "print"];
const ACTION_LABELS = {
  view: "View",
  create: "Create",
  edit: "Edit",
  delete: "Delete",
  approve: "Approve",
  export: "Export",
  print: "Print",
};
const NONE = "__none__";

const resourceLabel = (permission) => permission.label.split(":")[0].trim();
const actionLabel = (permission) => permission.label.split(":").slice(1).join(":").trim();

/** Groups a module's permissions by resource → { resource, label, byAction, extras } */
function toRows(permissions) {
  const rows = new Map();
  for (const permission of permissions) {
    if (!rows.has(permission.resource)) {
      rows.set(permission.resource, {
        resource: permission.resource,
        label: resourceLabel(permission),
        byAction: {},
        extras: [],
      });
    }
    const row = rows.get(permission.resource);
    if (ACTIONS.includes(permission.action)) row.byAction[permission.action] = permission;
    else row.extras.push(permission);
  }
  return [...rows.values()];
}

function PermissionCell({ permission, value, onChange, me, readOnly, label }) {
  const current = value[permission.key];

  if (!permission.supportsScope) {
    const allowed = canGrant(me, permission, "ALL", current);
    return (
      <label className="flex items-center justify-center gap-2">
        <Checkbox
          checked={Boolean(current)}
          disabled={readOnly || (!current && !allowed)}
          onCheckedChange={(checked) => onChange(permission.key, checked ? "ALL" : null)}
          aria-label={permission.label}
        />
        {label && <span className="text-xs">{label}</span>}
      </label>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      {label && <span className="text-muted-foreground text-xs">{label}</span>}
      <Select
        value={current ?? NONE}
        onValueChange={(next) => onChange(permission.key, next === NONE ? null : next)}
        disabled={readOnly}
      >
        <SelectTrigger
          size="sm"
          aria-label={permission.label}
          className={cn(
            "h-7 w-[6.5rem] text-xs",
            current ? "border-primary/40 bg-primary/5 font-medium" : "text-muted-foreground",
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>—</SelectItem>
          {SCOPES.map((scope) => (
            <SelectItem
              key={scope}
              value={scope}
              disabled={!canGrant(me, permission, scope, current)}
            >
              {SCOPE_LABELS[scope]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Permission matrix: one table per module, rows = resources, columns = standard actions.
 * `value` is { [permissionKey]: scope }; onChange(key, scope | null).
 */
export default function PermissionMatrix({ catalog, value, onChange, me, readOnly }) {
  return (
    <div className="space-y-6">
      {catalog.map((group) => {
        const rows = toRows(group.permissions);
        const usedActions = ACTIONS.filter((action) => rows.some((row) => row.byAction[action]));
        const hasExtras = rows.some((row) => row.extras.length);
        const grantedCount = group.permissions.filter((p) => value[p.key]).length;

        return (
          <section key={group.module} className="overflow-hidden rounded-lg border">
            <header className="bg-muted/40 flex items-center justify-between border-b px-4 py-2">
              <h3 className="text-sm font-medium">{rows[0]?.label ?? group.module}</h3>
              <span className="text-muted-foreground text-xs">
                {grantedCount} / {group.permissions.length} granted
              </span>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted-foreground text-xs">
                    <th className="w-48 px-4 py-2 text-left font-medium">Resource</th>
                    {usedActions.map((action) => (
                      <th key={action} className="px-2 py-2 text-center font-medium">
                        {ACTION_LABELS[action]}
                      </th>
                    ))}
                    {hasExtras && <th className="px-2 py-2 text-left font-medium">Other</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.resource} className="border-t">
                      <td className="px-4 py-2 font-medium">{row.label}</td>
                      {usedActions.map((action) => (
                        <td key={action} className="px-2 py-2 text-center">
                          {row.byAction[action] ? (
                            <PermissionCell
                              permission={row.byAction[action]}
                              value={value}
                              onChange={onChange}
                              me={me}
                              readOnly={readOnly}
                            />
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-muted-foreground/40">·</span>
                              </TooltipTrigger>
                              <TooltipContent>Not applicable</TooltipContent>
                            </Tooltip>
                          )}
                        </td>
                      ))}
                      {hasExtras && (
                        <td className="px-2 py-2">
                          <div className="flex flex-wrap gap-3">
                            {row.extras.map((permission) => (
                              <PermissionCell
                                key={permission.key}
                                permission={permission}
                                value={value}
                                onChange={onChange}
                                me={me}
                                readOnly={readOnly}
                                label={actionLabel(permission)}
                              />
                            ))}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
