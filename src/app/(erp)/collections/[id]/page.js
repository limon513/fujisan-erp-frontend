import { Suspense } from "react";
import PaymentDetailScreen from "@/modules/sales/components/payment-detail-screen";

export const metadata = { title: "Payment" };

export default function Page() {
  return (
    <Suspense>
      <PaymentDetailScreen />
    </Suspense>
  );
}
