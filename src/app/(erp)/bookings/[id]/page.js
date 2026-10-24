import { Suspense } from "react";
import BookingDetailScreen from "@/modules/sales/components/booking-detail-screen";

export const metadata = { title: "Booking" };

export default function Page() {
  return (
    <Suspense>
      <BookingDetailScreen />
    </Suspense>
  );
}
