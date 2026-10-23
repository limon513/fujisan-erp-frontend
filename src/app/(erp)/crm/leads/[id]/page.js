import { Suspense } from "react";
import LeadDetailScreen from "@/modules/crm/components/lead-detail-screen";

export const metadata = { title: "Lead" };

export default function Page() {
  return (
    <Suspense>
      <LeadDetailScreen />
    </Suspense>
  );
}
