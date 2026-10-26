"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/common/page-header";
import RequirePermission from "@/components/common/require-permission";
import CollectionReport from "./collection-report";
import OutstandingReport from "./outstanding-report";
import PeriodFilter, { presetRange } from "./period-filter";
import SalesReport from "./sales-report";

export default function ReportsScreen() {
  const [tab, setTab] = useState("sales");
  const [filter, setFilter] = useState(() => ({
    preset: "this-month",
    ...presetRange("this-month"),
    projectId: "",
  }));
  const params = {
    from: filter.from,
    to: filter.to,
    ...(filter.projectId && { projectId: filter.projectId }),
  };

  return (
    <RequirePermission permission="report.view">
      <PageHeader
        title="Reports"
        description="Sales, collections and what customers still owe, within your access."
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
            className="print:hidden"
          >
            <Printer /> Print
          </Button>
        }
      />
      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList className="print:hidden">
            <TabsTrigger value="sales">Sales</TabsTrigger>
            <TabsTrigger value="collections">Collections</TabsTrigger>
            <TabsTrigger value="outstanding">Outstanding</TabsTrigger>
          </TabsList>
          <PeriodFilter value={filter} onChange={setFilter} showPeriod={tab !== "outstanding"} />
        </div>
        <TabsContent value="sales">
          <SalesReport params={params} />
        </TabsContent>
        <TabsContent value="collections">
          <CollectionReport params={params} />
        </TabsContent>
        <TabsContent value="outstanding">
          <OutstandingReport projectId={filter.projectId} />
        </TabsContent>
      </Tabs>
    </RequirePermission>
  );
}
