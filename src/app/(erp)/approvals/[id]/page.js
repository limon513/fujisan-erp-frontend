import { Suspense } from "react";
import ApprovalDetailScreen from "@/modules/approval/components/approval-detail-screen";

export const metadata = { title: "Approval request" };

export default function Page() {
  return (
    <Suspense>
      <ApprovalDetailScreen />
    </Suspense>
  );
}
