export const ACCOUNT_TYPES = {
  ASSET: "Asset",
  LIABILITY: "Liability",
  EQUITY: "Equity",
  INCOME: "Income",
  EXPENSE: "Expense",
};

export const JOURNAL_KINDS = {
  MANUAL: { label: "Manual", tone: "blue" },
  AUTO: { label: "Automatic", tone: "gray" },
  REVERSAL: { label: "Reversal", tone: "amber" },
};

/** Depth of each account in the tree, for indenting a flat list ordered by code. */
export function withDepth(accounts) {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const depth = (a) => (a.parentId && byId.has(a.parentId) ? depth(byId.get(a.parentId)) + 1 : 0);
  return accounts.map((a) => ({ ...a, depth: depth(a) }));
}

/** "Eastern Bank PLC ••4471" for a bank account with details, else "". */
export function bankLabel(account) {
  if (!account?.isBank || account.isGroup) return "";
  const number = account.accountNumber?.replace(/\D/g, "");
  return [account.bankName, number && `••${number.slice(-4)}`].filter(Boolean).join(" ");
}
