/** Plot status colours from the blueprint: 🟢 Available 🟡 Hold 🔵 Booked 🔴 Sold ⚫ Blocked */
export const PLOT_STATUS = {
  AVAILABLE: { label: "Available", color: "#16a34a", tone: "green" },
  HOLD: { label: "Hold", color: "#eab308", tone: "amber" },
  BOOKED: { label: "Booked", color: "#2563eb", tone: "blue" },
  SOLD: { label: "Sold", color: "#dc2626", tone: "red" },
  BLOCKED: { label: "Blocked", color: "#404040", tone: "gray" },
};

export const PROJECT_STATUS = {
  PLANNING: { label: "Planning", tone: "gray" },
  ONGOING: { label: "Ongoing", tone: "green" },
  COMPLETED: { label: "Completed", tone: "blue" },
  ON_HOLD: { label: "On hold", tone: "amber" },
};
