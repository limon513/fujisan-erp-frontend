import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/common/page-header";

export const metadata = { title: "Dashboard" };

// Management dashboard KPIs (blueprint §4). Values are wired up as each module ships.
const kpis = [
  { label: "Total Sales", phase: 3 },
  { label: "Monthly Sales", phase: 3 },
  { label: "Total Collection", phase: 3 },
  { label: "Outstanding", phase: 3 },
  { label: "Total Projects", phase: 2 },
  { label: "Available Plots", phase: 2 },
  { label: "Booked", phase: 2 },
  { label: "Sold", phase: 2 },
];

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Dashboard" description="Company overview. Widgets adapt to your role." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader>
              <CardDescription>{kpi.label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">—</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground text-xs">
              Available from phase {kpi.phase}
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
