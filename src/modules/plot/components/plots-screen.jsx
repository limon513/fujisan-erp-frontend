"use client";

import PageHeader from "@/components/common/page-header";
import RequirePermission from "@/components/common/require-permission";
import PlotsTable from "./plots-table";

export default function PlotsScreen() {
  return (
    <>
      <PageHeader
        title="Plots"
        description="Every plot across projects, with its price, size and status."
      />
      <RequirePermission permission="plot.view">
        <PlotsTable />
      </RequirePermission>
    </>
  );
}
