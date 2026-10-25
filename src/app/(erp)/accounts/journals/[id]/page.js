import { Suspense } from "react";
import JournalDetailScreen from "@/modules/accounts/components/journal-detail-screen";

export const metadata = { title: "Journal entry" };

export default function Page() {
  return (
    <Suspense>
      <JournalDetailScreen />
    </Suspense>
  );
}
