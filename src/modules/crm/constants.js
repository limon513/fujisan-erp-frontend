/** Pipeline order (blueprint §5). Tone = StatusBadge colour; always shown with its label. */
export const LEAD_STATUS = {
  NEW: { label: "New", tone: "blue" },
  CONTACTED: { label: "Contacted", tone: "gray" },
  INTERESTED: { label: "Interested", tone: "gray" },
  FOLLOW_UP: { label: "Follow-up", tone: "amber" },
  SITE_VISIT: { label: "Site visit", tone: "amber" },
  NEGOTIATION: { label: "Negotiation", tone: "amber" },
  BOOKING: { label: "Booking", tone: "green" },
  CONVERTED: { label: "Converted", tone: "green" },
  LOST: { label: "Lost", tone: "red" },
};

/** Statuses a person can pick (CONVERTED comes from "Convert to customer"). */
export const PICKABLE_STATUSES = Object.keys(LEAD_STATUS).filter((s) => s !== "CONVERTED");

export const ACTIVITY_TYPES = {
  CALL: "Call",
  NOTE: "Note",
  WHATSAPP: "WhatsApp",
  SMS: "SMS",
  EMAIL: "Email",
  MEETING: "Meeting",
};

/** "৳30 Lac – ৳50 Lac", "from ৳30 Lac", "up to ৳50 Lac" or "—". */
export function budgetText(lead, format) {
  const { budgetMin: min, budgetMax: max } = lead;
  if (min != null && max != null) return `${format(min)} – ${format(max)}`;
  if (min != null) return `from ${format(min)}`;
  if (max != null) return `up to ${format(max)}`;
  return "—";
}
