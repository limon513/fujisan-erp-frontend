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
    transfer:
      Number(plan.transferFeeValue ?? 0) > 0
        ? `Transfer fee ${chargeText(plan.transferFeeType, plan.transferFeeValue, "the net price")}`
        : "No transfer fee",
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

export const PAYMENT_METHODS = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank transfer",
  CHEQUE: "Cheque",
  BKASH: "bKash",
  NAGAD: "Nagad",
  CARD: "Card",
};

export const PAYMENT_STATUS = {
  PENDING: { label: "To verify", tone: "amber" },
  VERIFIED: { label: "Verified", tone: "green" },
  REJECTED: { label: "Rejected", tone: "red" },
  REVERSED: { label: "Reversed", tone: "gray" },
};

/** "Down payment" / "Installment 3" */
export const installmentLabel = (i) =>
  i.number === 0 ? "Down payment" : `Installment ${i.number}`;

export const CANCELLATION_STATUS = {
  PENDING_APPROVAL: { label: "Waiting for approval", tone: "amber" },
  APPROVED: { label: "Refund due", tone: "blue" },
  REFUNDED: { label: "Refunded", tone: "green" },
  REJECTED: { label: "Rejected", tone: "red" },
  WITHDRAWN: { label: "Withdrawn", tone: "gray" },
};

export const TRANSFER_STATUS = {
  PENDING_APPROVAL: { label: "Waiting for approval", tone: "amber" },
  APPROVED: { label: "Fee due", tone: "blue" },
  COMPLETED: { label: "Completed", tone: "green" },
  REJECTED: { label: "Rejected", tone: "red" },
  WITHDRAWN: { label: "Withdrawn", tone: "gray" },
};
