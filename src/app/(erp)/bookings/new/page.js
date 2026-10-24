import { Suspense } from "react";
import BookingFormScreen from "@/modules/sales/components/booking-form-screen";

export const metadata = { title: "New booking" };

export default function Page() {
  return (
    <Suspense>
      <BookingFormScreen />
    </Suspense>
  );
}
