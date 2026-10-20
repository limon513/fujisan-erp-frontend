"use client";

import Link from "next/link";
import { CircleAlert, Users } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/** Shows customers that already use this mobile / NID. NID matches block saving. */
export default function DuplicateWarning({ matches }) {
  if (!matches?.length) return null;
  const nid = matches.filter((m) => m.matchedOn.includes("nidNumber"));
  const mobile = matches.filter((m) => !m.matchedOn.includes("nidNumber"));
  const line = (m) => (
    <li key={m.id}>
      <Link
        href={`/customers/${m.id}`}
        className="font-medium underline-offset-2 hover:underline"
        target="_blank"
      >
        {m.customerCode} {m.fullName}
      </Link>
      {m.ownerName && <span className="text-muted-foreground"> — handled by {m.ownerName}</span>}
    </li>
  );

  return (
    <div className="space-y-2">
      {nid.length > 0 && (
        <Alert variant="destructive">
          <CircleAlert />
          <AlertDescription>
            <p>This NID is already registered — the same person can&apos;t be added twice:</p>
            <ul className="mt-1 space-y-0.5">{nid.map(line)}</ul>
          </AlertDescription>
        </Alert>
      )}
      {mobile.length > 0 && (
        <Alert>
          <Users />
          <AlertDescription>
            <p>This mobile is already used by:</p>
            <ul className="mt-1 space-y-0.5">{mobile.map(line)}</ul>
            <p className="mt-1">If it&apos;s the same person, open their record instead.</p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
