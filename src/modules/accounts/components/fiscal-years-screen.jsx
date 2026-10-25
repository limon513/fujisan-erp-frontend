"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import PageHeader from "@/components/common/page-header";
import RequirePermission from "@/components/common/require-permission";
import StatusBadge from "@/components/common/status-badge";
import { formatDateOnly, formatNumber } from "@/lib/format";
import { toastError } from "@/lib/notify";
import { useCan } from "@/modules/auth/auth-provider";
import { useFiscalYearAction, useFiscalYears } from "../api";

export default function FiscalYearsScreen() {
  const can = useCan();
  const { data, isLoading, error } = useFiscalYears();
  const action = useFiscalYearAction();

  const run = async (year, verb) => {
    try {
      await action.mutateAsync({ id: year.id, action: verb });
      toast.success(`${year.name} ${verb === "close" ? "closed" : "reopened"}`);
    } catch (apiError) {
      toastError(apiError);
    }
  };

  return (
    <>
      <PageHeader
        title="Fiscal years"
        description="July to June. A year opens automatically with its first posting; a closed year takes no more postings."
      />
      <RequirePermission permission="fiscal-year.view">
        {error ? (
          <p className="text-destructive text-sm">{error.message}</p>
        ) : isLoading ? (
          <Skeleton className="h-40" />
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Entries</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-28" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length ? (
                  data.map((year) => (
                    <TableRow key={year.id}>
                      <TableCell className="font-medium">{year.name}</TableCell>
                      <TableCell>
                        {formatDateOnly(year.startDate)} – {formatDateOnly(year.endDate)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(year.entryCount)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={year.status === "OPEN" ? "green" : "gray"}>
                          {year.status === "OPEN" ? "Open" : "Closed"}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-right">
                        {can("fiscal-year.edit") && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={action.isPending}
                            onClick={() => run(year, year.status === "OPEN" ? "close" : "reopen")}
                          >
                            {year.status === "OPEN" ? "Close" : "Reopen"}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-muted-foreground h-20 text-center">
                      No fiscal year yet: the first posting opens one.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </RequirePermission>
    </>
  );
}
