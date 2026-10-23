export const APPROVAL_STATUS = {
  PENDING: { label: "Waiting", tone: "amber" },
  APPROVED: { label: "Approved", tone: "green" },
  REJECTED: { label: "Rejected", tone: "red" },
  CANCELLED: { label: "Withdrawn", tone: "gray" },
};

export const APPROVER_TYPES = {
  ROLE: "Everyone with a role",
  TEAM_LEADER: "Requester's team leader",
  REPORTING_MANAGER: "Requester's reporting manager",
  DEPARTMENT_HEAD: "Requester's department head",
  USER: "A specific person",
};

/** Short "who approves" text for a step (workflow step or the chain frozen in a request). */
export function approverText(step) {
  switch (step.approverType) {
    case "ROLE":
      return `${step.approverRole?.name ?? step.approverRoleName ?? "Role"}${step.sameBranch ? " (same branch)" : ""}`;
    case "USER":
      return step.approverUser?.name ?? step.approverUserName ?? "A person";
    case "TEAM_LEADER":
      return "Team leader";
    case "REPORTING_MANAGER":
      return "Reporting manager";
    case "DEPARTMENT_HEAD":
      return "Department head";
    default:
      return step.approverType;
  }
}

/** Approver text unless it just repeats the step name ("Sales Manager" approved by Sales Manager). */
export function stepDetail(step, formatMoney) {
  const who = approverText(step);
  const limit = limitText(step, formatMoney);
  return [who.toLowerCase() === step.name.toLowerCase() ? null : who, limit]
    .filter(Boolean)
    .join(" · ");
}

/** "up to 5%" / "up to ৳50,000" / null */
export function limitText(step, formatMoney) {
  const parts = [
    step.maxPercent != null && `${Number(step.maxPercent)}%`,
    step.maxAmount != null && formatMoney(step.maxAmount),
  ].filter(Boolean);
  return parts.length ? `up to ${parts.join(" and ")}` : null;
}
