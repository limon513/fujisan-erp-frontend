export const SCOPES = ["OWN", "TEAM", "DEPARTMENT", "BRANCH", "ALL"];

export const SCOPE_LABELS = {
  OWN: "Own",
  TEAM: "Team",
  DEPARTMENT: "Department",
  BRANCH: "Branch",
  ALL: "All",
};

export const SCOPE_HINTS = {
  OWN: "Only records they own",
  TEAM: "Their team's records",
  DEPARTMENT: "Their department's records",
  BRANCH: "Their branch's records",
  ALL: "Every record",
};

export const compareScope = (a, b) => SCOPES.indexOf(a) - SCOPES.indexOf(b);

/**
 * Mirrors the API's escalation rule: may this user grant `permission` at `scope` to a role that
 * currently has `current`? Removing and keeping are always allowed.
 */
export function canGrant(me, permission, scope, current) {
  if (!scope || me.isSuperAdmin) return true;
  if (current && compareScope(scope, current) <= 0) return true; // keep or narrow
  const own = me.permissions[permission.key];
  return Boolean(own) && compareScope(scope, own) <= 0;
}
