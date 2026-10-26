import { Card, CardContent } from "@/components/ui/card";

/** One headline figure with an optional supporting line. */
export default function Stat({ label, value, sub }) {
  return (
    <Card className="gap-1 py-4">
      <CardContent className="space-y-1 px-4">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="text-xl font-semibold tabular-nums">{value}</p>
        {sub && <p className="text-muted-foreground text-xs">{sub}</p>}
      </CardContent>
    </Card>
  );
}
