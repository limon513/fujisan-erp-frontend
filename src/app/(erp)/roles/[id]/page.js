import { Suspense } from "react";
import RolePermissionsScreen from "@/modules/role/components/role-permissions-screen";

export const metadata = { title: "Role permissions" };

// The role id is only known at request time, so the screen (useParams) renders inside Suspense
export default function Page() {
  return (
    <Suspense>
      <RolePermissionsScreen />
    </Suspense>
  );
}
