import { Suspense } from "react";
import ComingSoon from "@/components/common/coming-soon";

export default function PlaceholderPage() {
  return (
    <Suspense fallback={null}>
      <ComingSoon />
    </Suspense>
  );
}
