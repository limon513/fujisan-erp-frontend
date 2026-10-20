import { Suspense } from "react";
import ProjectDetailScreen from "@/modules/project/components/project-detail-screen";

export const metadata = { title: "Project" };

export default function Page() {
  return (
    <Suspense>
      <ProjectDetailScreen />
    </Suspense>
  );
}
