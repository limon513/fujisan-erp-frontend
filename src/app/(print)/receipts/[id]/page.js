import { Suspense } from "react";
import MoneyReceipt from "@/modules/sales/components/money-receipt";

export const metadata = { title: "Money receipt" };

export default function Page() {
  return (
    <Suspense>
      <MoneyReceipt />
    </Suspense>
  );
}
