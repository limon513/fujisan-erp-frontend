"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ExternalLink, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import FormDialog from "@/components/common/form-dialog";
import PageHeader from "@/components/common/page-header";
import RequirePermission from "@/components/common/require-permission";
import StatusBadge from "@/components/common/status-badge";
import { formatBDT, formatDateOnly, formatDateTime } from "@/lib/format";
import { useCan } from "@/modules/auth/auth-provider";
import { journals } from "../api";
import { JOURNAL_KINDS } from "../constants";

const amount = (value) => (Number(value) ? formatBDT(value) : "");

function ReverseDialog({ entry, onDone }) {
  const reverse = journals.usePostAction("reverse");
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);
  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onDone()}
      title={`Reverse ${entry.entryNo}?`}
      description="Posts the mirror entry today. The original stays in the books."
      error={error}
      submitting={reverse.isPending}
      submitLabel="Reverse"
      onSubmit={async (event) => {
        event.preventDefault();
        try {
          const result = await reverse.mutateAsync({ id: entry.id, reason });
          toast.success(`Reversed by ${result.entryNo}`);
          onDone();
        } catch (apiError) {
          setError(apiError.message);
        }
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="reason">Why?</Label>
        <Input
          id="reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Posted to the wrong account, …"
        />
      </div>
    </FormDialog>
  );
}

export default function JournalDetailScreen() {
  const { id } = useParams();
  const can = useCan();
  const { data: entry, isLoading, error } = journals.useItem(id);
  const [reversing, setReversing] = useState(false);

  return (
    <RequirePermission permission="journal.view">
      <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
        <Link href="/accounts/journals">
          <ArrowLeft /> Journal
        </Link>
      </Button>
      {error ? (
        <p className="text-destructive text-sm">{error.message}</p>
      ) : isLoading ? (
        <Skeleton className="h-80" />
      ) : (
        <>
          <PageHeader
            title={entry.entryNo}
            description={`${formatDateOnly(entry.date)} · ${entry.fiscalYear.name} · ${entry.narration}`}
            actions={
              <>
                <StatusBadge tone={JOURNAL_KINDS[entry.kind].tone}>
                  {JOURNAL_KINDS[entry.kind].label}
                </StatusBadge>
                {entry.link && (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={entry.link}>
                      <ExternalLink /> Open the{" "}
                      {entry.sourceType === "Payment" ? "payment" : "booking"}
                    </Link>
                  </Button>
                )}
                {entry.kind === "MANUAL" && !entry.reversedBy && can("journal.reverse") && (
                  <Button size="sm" variant="outline" onClick={() => setReversing(true)}>
                    <Undo2 /> Reverse
                  </Button>
                )}
              </>
            }
          />
          <div className="space-y-3">
            {entry.reverses && (
              <p className="text-sm">
                Reverses{" "}
                <Link href={`/accounts/journals/${entry.reverses.id}`} className="underline">
                  {entry.reverses.entryNo}
                </Link>
              </p>
            )}
            {entry.reversedBy && (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Reversed by{" "}
                <Link href={`/accounts/journals/${entry.reversedBy.id}`} className="underline">
                  {entry.reversedBy.entryNo}
                </Link>
              </p>
            )}
            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entry.lines.map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        <Link
                          href={`/accounts/${line.account.id}`}
                          className={`hover:underline ${Number(line.credit) ? "pl-6" : ""}`}
                        >
                          <span className="text-muted-foreground font-mono text-xs">
                            {line.account.code}
                          </span>{" "}
                          {line.account.name}
                        </Link>
                        {line.description && (
                          <p className="text-muted-foreground text-xs">{line.description}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {amount(line.debit)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {amount(line.credit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBDT(entry.total)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatBDT(entry.total)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
            <p className="text-muted-foreground text-xs">
              Posted {formatDateTime(entry.createdAt)}
              {entry.createdBy ? ` by ${entry.createdBy.name}` : " by the system"}
            </p>
          </div>
          {reversing && <ReverseDialog entry={entry} onDone={() => setReversing(false)} />}
        </>
      )}
    </RequirePermission>
  );
}
