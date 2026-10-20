import { Suspense } from "react";
import PlotMapScreen from "@/modules/plot-map/components/plot-map-screen";

export const metadata = { title: "Plot map" };

// The selected project lives in the URL (?project=…), read with useSearchParams → Suspense
export default function Page() {
  return (
    <Suspense>
      <PlotMapScreen />
    </Suspense>
  );
}
