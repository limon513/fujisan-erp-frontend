"use client";

import { useState } from "react";
import Link from "next/link";
import { BookPlus, Check, EyeOff, Link2, Trash2, Undo2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import ConfirmDialog from "@/components/common/confirm-dialog";
import FormDialog from "@/components/common/form-dialog";
import PageHeader from "@/components/common/page-header";
import RequirePermission from "@/components/common/require-permission";
import StatusBadge from "@/components/common/status-badge";
import { formatBDT, formatDateOnly } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useCan } from "@/modules/auth/auth-provider";
import {
  useAccounts,
  useBankStatement,
  useBankStatements,
  useMatchCandidates,
  useReconAccounts,
  useReconAction,
} from "../api";
import { bankLabel } from "../constants";
import BankImportDialog from "./bank-import-dialog";

const signed = (v) => (
  <span className={cn("tabular-nums", Number(v) > 0 && "text-emerald-700 dark:text-emerald-400")}>
    {Number(v) > 0 ? "+" : ""}
    {formatBDT(v)}
  </span>
);

function SummaryRow({ label, value, strong, hint }) {
  return (
    <div
      className={cn(
        "flex justify-between gap-4 py-1.5 text-sm",
        strong && "border-t font-semibold",
      )}
    >
      <span>
        {label}
        {hint && <span className="text-muted-foreground block text-xs font-normal">{hint}</span>}
      </span>
      <span className="tabular-nums">{formatBDT(value)}</span>
    </div>
  );
}

/** Pick one of the book entries with the same amount. */
function MatchDialog({ line, onDone }) {
  const { data: options, isLoading } = useMatchCandidates(line.id);
  const action = useReconAction();
  const [chosen, setChosen] = useState("");
  const [error, setError] = useState(null);
  const pick = chosen || options?.[0]?.id || "";
  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onDone()}
      title={`Match ${formatBDT(line.amount)} on ${formatDateOnly(line.date)}`}
      description={line.description}
      error={error}
      submitting={action.isPending}
      submitLabel="Match"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!pick) return setError("No book entry with this amount is waiting to be matched");
        try {
          await action.mutateAsync({
            path: `/lines/${line.id}/match`,
            body: { journalLineId: pick },
          });
          toast.success("Matched");
          onDone();
        } catch (apiError) {
          setError(apiError.message);
        }
      }}
    >
      {isLoading ? (
        <Skeleton className="h-24" />
      ) : options.length ? (
        <div className="divide-y rounded-lg border">
          {options.map((o) => (
            <label
              key={o.id}
              className="hover:bg-muted/40 flex cursor-pointer items-start gap-3 px-3 py-2 text-sm"
            >
              <input
                type="radio"
                name="candidate"
                className="mt-1"
                checked={pick === o.id}
                onChange={() => setChosen(o.id)}
              />
              <span className="min-w-0 flex-1">
                <span className="font-medium">{o.entry.entryNo}</span> ·{" "}
                {formatDateOnly(o.entry.date)}
                <span className="text-muted-foreground block truncate text-xs">
                  {o.description ?? o.entry.narration}
                </span>
              </span>
              <span className="text-muted-foreground shrink-0 text-xs">
                {o.days === 0 ? "same day" : `${o.days} day${o.days === 1 ? "" : "s"} apart`}
              </span>
            </label>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          No unmatched book entry has this amount. If it isn&apos;t in the books yet, use Book it.
        </p>
      )}
    </FormDialog>
  );
}

/** Post a statement line the books don't have (bank charges, interest) and match it. */
function BookDialog({ line, bankId, onDone }) {
  const { data: postable = [] } = useAccounts({ postable: true });
  const action = useReconAction();
  const out = Number(line.amount) < 0;
  const suggested = postable.find((a) => a.code === (out ? "5700" : "4900"))?.id ?? "";
  const [accountId, setAccountId] = useState("");
  const [error, setError] = useState(null);
  const chosen = accountId || suggested;
  return (
    <FormDialog
      open
      onOpenChange={(open) => !open && onDone()}
      title={`Book ${formatBDT(line.amount)} from the statement`}
      description={`${formatDateOnly(line.date)} · ${line.description}`}
      error={error}
      submitting={action.isPending}
      submitLabel="Post and match"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!chosen) return setError("Choose the account");
        try {
          await action.mutateAsync({ path: `/lines/${line.id}/book`, body: { accountId: chosen } });
          toast.success("Posted and matched");
          onDone();
        } catch (apiError) {
          setError(apiError.message);
        }
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="bookAccount">{out ? "Paid for" : "Received for"}</Label>
        <Select value={chosen} onValueChange={setAccountId}>
          <SelectTrigger id="bookAccount" className="w-full">
            <SelectValue placeholder={postable.length ? "Account…" : "Loading…"} />
          </SelectTrigger>
          <SelectContent>
            {postable
              .filter((a) => a.id !== bankId)
              .map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.code} {a.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          Posts {out ? "Dr this account / Cr the bank" : "Dr the bank / Cr this account"} on the
          statement date.
        </p>
      </div>
    </FormDialog>
  );
}

function StatementView({ statementId, bankId, onRemoved }) {
  const can = useCan();
  const canEdit = can("bank-reconciliation.edit");
  const { data: s, isLoading, error } = useBankStatement(statementId);
  const action = useReconAction();
  const [matching, setMatching] = useState(null);
  const [booking, setBooking] = useState(null);
  const [removing, setRemoving] = useState(false);
  if (error) return <p className="text-destructive text-sm">{error.message}</p>;
  if (isLoading || !s) return <Skeleton className="h-96" />;
  const run = (path, body, message) =>
    action
      .mutateAsync({ path, body })
      .then(() => toast.success(message))
      .catch((e) => toast.error(e.message));
  const sum = s.summary;

  return (
    <div className="space-y-6">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
            <div className="space-y-1.5">
              <CardTitle>
                {formatDateOnly(s.fromDate)} – {formatDateOnly(s.toDate)}
              </CardTitle>
              <CardDescription>
                {s.fileName ?? "Statement"} · {s.counts.MATCHED} matched, {s.counts.UNMATCHED} to do
                {s.counts.IGNORED ? `, ${s.counts.IGNORED} ignored` : ""}
              </CardDescription>
            </div>
            {can("bank-reconciliation.delete") && (
              <Button variant="ghost" size="sm" onClick={() => setRemoving(true)}>
                <Trash2 /> Remove
              </Button>
            )}
          </CardHeader>
          <CardContent className="px-0">
            <div className="divide-y border-y">
              {s.lines.map((l) => (
                <div
                  key={l.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5 text-sm"
                >
                  <span className="text-muted-foreground w-24 shrink-0">
                    {formatDateOnly(l.date)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{l.description}</span>
                    {l.status === "MATCHED" && l.journalLine && (
                      <span className="text-muted-foreground block truncate text-xs">
                        <Check className="mr-1 inline size-3 text-emerald-600" />
                        <Link
                          href={`/accounts/journals/${l.journalLine.entry.id}`}
                          className="hover:underline"
                        >
                          {l.journalLine.entry.entryNo}
                        </Link>{" "}
                        · {l.journalLine.description ?? l.journalLine.entry.narration}
                        {l.autoMatched && " · auto"}
                      </span>
                    )}
                    {l.reference && l.status !== "MATCHED" && (
                      <span className="text-muted-foreground block text-xs">Ref {l.reference}</span>
                    )}
                  </span>
                  <span className="w-32 shrink-0 text-right">{signed(l.amount)}</span>
                  <span className="flex w-full shrink-0 justify-end gap-1 sm:w-auto">
                    {l.status === "MATCHED" ? (
                      canEdit && (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          title="Unmatch"
                          aria-label="Unmatch"
                          onClick={() => run(`/lines/${l.id}/unmatch`, undefined, "Unmatched")}
                        >
                          <Undo2 />
                        </Button>
                      )
                    ) : l.status === "IGNORED" ? (
                      <>
                        <StatusBadge>ignored</StatusBadge>
                        {canEdit && (
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            title="Undo ignore"
                            aria-label="Undo ignore"
                            onClick={() =>
                              run(`/lines/${l.id}/ignore`, { ignored: false }, "Back to to-do")
                            }
                          >
                            <Undo2 />
                          </Button>
                        )}
                      </>
                    ) : (
                      canEdit && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setMatching(l)}>
                            <Link2 /> Match
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setBooking(l)}>
                            <BookPlus /> Book it
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            title="Ignore"
                            aria-label="Ignore"
                            onClick={() =>
                              run(`/lines/${l.id}/ignore`, { ignored: true }, "Ignored")
                            }
                          >
                            <EyeOff />
                          </Button>
                        </>
                      )
                    )}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className={sum.reconciled ? "border-emerald-500/40" : "border-amber-500/40"}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              Reconciliation
              <StatusBadge tone={sum.reconciled ? "green" : "amber"}>
                {sum.reconciled ? "Reconciled" : sum.balancesTie ? "Lines to clear" : "Difference"}
              </StatusBadge>
            </CardTitle>
            <CardDescription>On {formatDateOnly(s.toDate)}</CardDescription>
          </CardHeader>
          <CardContent>
            <SummaryRow label="Balance in the books" value={sum.bookBalance} />
            <SummaryRow
              label="− Book entries not on the statement"
              hint="Cheques not yet cleared, deposits in transit"
              value={sum.notOnStatement}
            />
            <SummaryRow
              label="+ Statement lines not in the books"
              hint="Bank charges, interest, direct deposits"
              value={sum.notInBooks}
            />
            <SummaryRow label="Expected bank balance" value={sum.adjustedBalance} strong />
            <SummaryRow label="Bank's closing balance" value={sum.statementBalance} />
            {!sum.balancesTie && (
              <p className="text-destructive mt-2 text-sm font-medium">
                Difference {formatBDT(sum.difference)}: check the closing balance and the lines.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      {sum.uncleared.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>In the books, not on a statement yet</CardTitle>
            <CardDescription>
              Normal for cheques written near the end of the period.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <div className="divide-y border-y">
              {sum.uncleared.map((u) => (
                <div key={u.id} className="flex items-center gap-4 px-4 py-2 text-sm">
                  <span className="text-muted-foreground w-24 shrink-0">
                    {formatDateOnly(u.entry.date)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    <Link
                      href={`/accounts/journals/${u.entry.id}`}
                      className="font-medium hover:underline"
                    >
                      {u.entry.entryNo}
                    </Link>{" "}
                    · {u.description ?? u.entry.narration}
                  </span>
                  <span className="w-32 shrink-0 text-right">{signed(u.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {matching && <MatchDialog line={matching} onDone={() => setMatching(null)} />}
      {booking && <BookDialog line={booking} bankId={bankId} onDone={() => setBooking(null)} />}
      <ConfirmDialog
        open={removing}
        onOpenChange={setRemoving}
        title="Remove this statement?"
        description="Its lines and matches are removed; entries posted with Book it stay in the books."
        confirmLabel="Remove"
        destructive
        onConfirm={async () => {
          await action.mutateAsync({ path: `/statements/${statementId}`, method: "delete" });
          toast.success("Statement removed");
          onRemoved();
        }}
      />
    </div>
  );
}

export default function BankReconciliationScreen() {
  const can = useCan();
  const { data: accounts = [], isLoading } = useReconAccounts();
  const [accountId, setAccountId] = useState("");
  const [statementId, setStatementId] = useState("");
  const [importing, setImporting] = useState(false);
  const bankId =
    accountId || accounts.find((a) => a.systemKey === "BANK")?.id || accounts[0]?.id || "";
  const account = accounts.find((a) => a.id === bankId);
  const { data: statements = [] } = useBankStatements(bankId);
  const shown =
    statementId && statements.some((x) => x.id === statementId) ? statementId : statements[0]?.id;

  return (
    <RequirePermission permission="bank-reconciliation.view">
      <PageHeader
        title="Bank reconciliation"
        description="Match the bank's statement to the books, line by line."
        actions={
          can("bank-reconciliation.create") &&
          account && (
            <Button onClick={() => setImporting(true)}>
              <Upload /> Import statement
            </Button>
          )
        }
      />
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select
            value={bankId}
            onValueChange={(v) => {
              setAccountId(v);
              setStatementId("");
            }}
          >
            <SelectTrigger className="w-80" aria-label="Bank account">
              <SelectValue placeholder={isLoading ? "Loading…" : "Bank account"} />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.code} {a.name}
                  {bankLabel({ ...a, isGroup: false }) &&
                    ` · ${bankLabel({ ...a, isGroup: false })}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {statements.length > 0 && (
            <Select value={shown} onValueChange={setStatementId}>
              <SelectTrigger className="w-72" aria-label="Statement">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statements.map((x) => (
                  <SelectItem key={x.id} value={x.id}>
                    {formatDateOnly(x.fromDate)} – {formatDateOnly(x.toDate)} ·{" "}
                    {x.unmatched ? `${x.unmatched} to do` : "done"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {shown ? (
          <StatementView statementId={shown} bankId={bankId} onRemoved={() => setStatementId("")} />
        ) : (
          <Card>
            <CardContent className="text-muted-foreground py-10 text-center text-sm">
              No statements imported for this account yet. Export one from internet banking as CSV
              and import it.
            </CardContent>
          </Card>
        )}
      </div>
      {importing && account && (
        <BankImportDialog
          account={account}
          onDone={(result) => {
            setImporting(false);
            if (result?.id) setStatementId(result.id);
          }}
        />
      )}
    </RequirePermission>
  );
}
