"use client";

import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/** Shows a one-time temporary password with a copy button. */
export default function TemporaryPasswordDialog({ result, onClose }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(result.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={Boolean(result)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Temporary password</DialogTitle>
          <DialogDescription>
            Give this to <span className="text-foreground font-medium">{result?.username}</span>.
            They must choose a new password when they sign in.
          </DialogDescription>
        </DialogHeader>
        <div className="bg-muted flex items-center justify-between gap-2 rounded-lg px-3 py-2">
          <code className="font-mono text-lg tracking-wider">{result?.password}</code>
          <Button variant="ghost" size="icon" onClick={copy} aria-label="Copy password">
            {copied ? <Check /> : <Copy />}
          </Button>
        </div>
        <Alert>
          <KeyRound />
          <AlertDescription>This password is shown only once.</AlertDescription>
        </Alert>
        <DialogFooter>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
