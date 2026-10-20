"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import FormDialog from "@/components/common/form-dialog";
import FormField, { applyApiErrors } from "@/components/common/form-field";
import { formatBDT } from "@/lib/format";
import { plots } from "../api";

const schema = z.object({
  price: z.coerce.number({ error: "Enter the new price" }).nonnegative(),
  reason: z.string().trim().min(3, "Give a reason"),
});

export default function ChangePriceDialog({ plot, onClose }) {
  const changePrice = plots.usePostAction("price");
  const [error, setError] = useState(null);
  const form = useForm({
    resolver: zodResolver(schema),
    values: plot && { price: plot.price, reason: "" },
  });
  const price = useWatch({ control: form.control, name: "price" });
  const rate = plot && Number(price) > 0 ? Number(price) / Number(plot.areaSqft) : null;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await changePrice.mutateAsync({ id: plot.id, ...values });
      toast.success(`Price of ${plot.code} changed`);
      onClose();
    } catch (apiError) {
      if (!applyApiErrors(apiError, form.setError, ["price", "reason"])) setError(apiError.message);
    }
  });

  return (
    <FormDialog
      open={Boolean(plot)}
      onOpenChange={(open) => !open && onClose()}
      title={`Change price of ${plot?.code ?? ""}`}
      description={
        plot && `Current price ${formatBDT(plot.price)}. Every change is kept in the price history.`
      }
      onSubmit={onSubmit}
      submitting={form.formState.isSubmitting}
      error={error}
      submitLabel="Change price"
    >
      <FormField
        control={form.control}
        name="price"
        label="New price (BDT)"
        type="number"
        min={0}
        step="0.01"
        description={rate ? `${formatBDT(rate.toFixed(2))} per sqft` : undefined}
      />
      <FormField
        control={form.control}
        name="reason"
        label="Reason"
        placeholder="e.g. Management decision, festival offer"
      />
    </FormDialog>
  );
}
