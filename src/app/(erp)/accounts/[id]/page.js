import { Suspense } from "react";
import LedgerScreen from "@/modules/accounts/components/ledger-screen";

export const metadata = { title: "Ledger" };

export default function Page() {
  return (
    <Suspense>
      <LedgerScreen />
    </Suspense>
  );
}
