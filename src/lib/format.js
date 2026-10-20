/** Formatting helpers for Bangladesh: BDT with lakh/crore grouping, Asia/Dhaka dates. */

const TIMEZONE = "Asia/Dhaka";

const bdtFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "BDT",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

/** 4850000 → "BDT 48,50,000" (en-IN gives lakh/crore grouping). */
export const formatBDT = (amount) =>
  amount == null || amount === "" ? "—" : bdtFormatter.format(Number(amount)).replace("BDT", "৳");

export const formatNumber = (value) =>
  value == null || value === "" ? "—" : numberFormatter.format(Number(value));

/** 4850000 → "48.5 Lac", 125000000 → "12.5 Cr" — for dashboards and cards. */
export const formatBDTShort = (amount) => {
  if (amount == null || amount === "") return "—";
  const value = Number(amount);
  const abs = Math.abs(value);
  if (abs >= 1e7) return `৳${numberFormatter.format(value / 1e7)} Cr`;
  if (abs >= 1e5) return `৳${numberFormatter.format(value / 1e5)} Lac`;
  return formatBDT(value);
};

export const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: TIMEZONE,
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "—";

export const formatDateTime = (value) =>
  value
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: TIMEZONE,
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "—";

/** 8801711000001 → "01711-000001" */
export const formatMobile = (value) =>
  value && /^8801\d{9}$/.test(value) ? `0${value.slice(3, 7)}-${value.slice(7)}` : (value ?? "—");

/** Date-only values come back as UTC midnight; show the calendar date as stored. */
export const formatDateOnly = (value) =>
  value
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: "UTC",
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "—";

/** ISO date/datetime → "YYYY-MM-DD" for <input type="date"> */
export const toDateInput = (value) => (value ? String(value).slice(0, 10) : "");

/** 523 → "523 B", 95_000 → "93 KB", 2_400_000 → "2.3 MB" */
export const formatFileSize = (bytes) =>
  bytes < 1024
    ? `${bytes} B`
    : bytes < 1024 * 1024
      ? `${Math.round(bytes / 1024)} KB`
      : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
