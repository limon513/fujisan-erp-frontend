"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBDT, formatBDTShort, formatDateOnly } from "@/lib/format";

const SHOWN = 12;

function Figure({ label, value, hint }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
}

/** Totals and the due-date table of a payment schedule (from the API). */
export default function ScheduleView({ schedule }) {
  const [all, setAll] = useState(false);
  const installments = schedule.items.length - 1;
  const rows = all ? schedule.items : schedule.items.slice(0, SHOWN + 1);
  const hasInterest = Number(schedule.interest) > 0;

  return (
    // Sized by its container: 2 figures per row in the editor's side panel, 4 when there is room
    <div className="@container space-y-4">
      <div className="grid grid-cols-2 gap-2 @xl:grid-cols-4">
        <Figure
          label="Down payment"
          value={formatBDTShort(schedule.downPayment)}
          hint="at booking"
        />
        <Figure
          label={installments ? "Each installment" : "Installments"}
          value={installments ? formatBDTShort(schedule.installmentAmount) : "None"}
          hint={installments ? `${installments} payments` : "full payment"}
        />
        <Figure
          label="Interest"
          value={hasInterest ? formatBDTShort(schedule.interest) : "None"}
          hint={hasInterest ? `on ${formatBDTShort(schedule.financed)}` : undefined}
        />
        <Figure
          label="Total payable"
          value={formatBDTShort(schedule.totalPayable)}
          hint={`price ${formatBDTShort(schedule.price)}`}
        />
      </div>
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((item) => (
              <TableRow key={item.number}>
                <TableCell className="text-muted-foreground tabular-nums">
                  {item.kind === "DOWN_PAYMENT" ? "Down" : item.number}
                </TableCell>
                <TableCell>{formatDateOnly(item.dueDate)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatBDT(item.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {schedule.items.length > SHOWN + 1 && (
        <Button type="button" variant="ghost" size="sm" onClick={() => setAll(!all)}>
          {all ? "Show fewer" : `Show all ${installments} installments`}
        </Button>
      )}
    </div>
  );
}
