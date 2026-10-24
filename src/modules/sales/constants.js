import { formatBDT, formatNumber } from "@/lib/format";

export const FREQUENCIES = { MONTHLY: "Monthly", QUARTERLY: "Quarterly", YEARLY: "Yearly" };

const chargeText = (type, value, base) =>
  type === "PERCENT" ? `${formatNumber(value)}% of ${base}` : formatBDT(value);

/** Plain-language lines describing a plan's terms. */
export function planTerms(plan) {
  const count = plan.installmentCount;
  const down =
    plan.downPaymentType === "PERCENT"
      ? `${formatNumber(plan.downPaymentValue)}% down payment`
      : `${formatBDT(plan.downPaymentValue)} down payment`;
  return {
    payment:
      count === 0
        ? "Full payment at booking"
        : `${down}, then ${count} ${FREQUENCIES[plan.frequency].toLowerCase()} installment${count === 1 ? "" : "s"}`,
    interest:
      Number(plan.interestRate) > 0
        ? `${formatNumber(plan.interestRate)}% interest a year`
        : "No interest",
    lateFee:
      Number(plan.lateFeeValue) > 0
        ? `Late fee ${chargeText(plan.lateFeeType, plan.lateFeeValue, "the installment")} after ${plan.gracePeriodDays} day${plan.gracePeriodDays === 1 ? "" : "s"}`
        : "No late fee",
    cancellation:
      Number(plan.cancellationChargeValue) > 0
        ? `Cancellation charge ${chargeText(plan.cancellationChargeType, plan.cancellationChargeValue, "the amount paid")}`
        : "No cancellation charge",
  };
}

export const BOOKING_STATUS = {
  PENDING_APPROVAL: { label: "Waiting for approval", tone: "amber" },
  CONFIRMED: { label: "Confirmed", tone: "blue" },
  REGISTERED: { label: "Registered", tone: "green" },
  REJECTED: { label: "Rejected", tone: "red" },
  CANCELLED: { label: "Cancelled", tone: "gray" },
};

export const INSTALLMENT_STATUS = {
  DUE: { label: "Due", tone: "gray" },
  PARTIAL: { label: "Part paid", tone: "amber" },
  PAID: { label: "Paid", tone: "green" },
  WAIVED: { label: "Waived", tone: "blue" },
};
