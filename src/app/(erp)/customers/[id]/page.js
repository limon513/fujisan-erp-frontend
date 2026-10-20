import { Suspense } from "react";
import CustomerDetailScreen from "@/modules/customer/components/customer-detail-screen";

export const metadata = { title: "Customer" };

export default function Page() {
  return (
    <Suspense>
      <CustomerDetailScreen />
    </Suspense>
  );
}
