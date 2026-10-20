"use client";

import { useRef, useState } from "react";
import { CircleAlert, CircleCheck, Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
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
import { Spinner } from "@/components/ui/spinner";
import { formatBDT, formatNumber } from "@/lib/format";
import { toastError } from "@/lib/notify";
import { downloadImportTemplate, useImportPlots } from "../api";

/**
 * Two steps: choose a file → preview (row errors, new blocks/roads) → import.
 * Nothing is saved until "Import" and only if the whole file is valid.
 */
export default function ImportPlotsDialog({ open, onOpenChange, project }) {
  const input = useRef(null);
  const importPlots = useImportPlots();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const reset = () => {
    setFile(null);
    setPreview(null);
  };

  const choose = async (event) => {
    const chosen = event.target.files?.[0];
    event.target.value = "";
    if (!chosen) return;
    setFile(chosen);
    setPreview(null);
    try {
      setPreview(
        await importPlots.mutateAsync({ projectId: project.id, file: chosen, dryRun: true }),
      );
    } catch (error) {
      toastError(error);
      setFile(null);
    }
  };

  const confirm = async () => {
    try {
      const result = await importPlots.mutateAsync({ projectId: project.id, file, dryRun: false });
      toast.success(`${result.created} plots imported into ${project.name}`);
      reset();
      onOpenChange(false);
    } catch (error) {
      toastError(error);
    }
  };

  const busy = importPlots.isPending;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import plots into {project?.name}</DialogTitle>
          <DialogDescription>
            Excel (.xlsx) or CSV with columns <strong>Block, Plot, Area (sqft), Price (BDT)</strong>{" "}
            and optionally Road, Facing, Dimensions, Remarks. Missing blocks and roads are created.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={input}
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={choose}
            />
            <Button variant="outline" onClick={() => input.current?.click()} disabled={busy}>
              <FileSpreadsheet /> {file ? "Choose another file" : "Choose file"}
            </Button>
            <Button variant="ghost" onClick={() => downloadImportTemplate().catch(toastError)}>
              <Download /> Template
            </Button>
            {file && <span className="text-muted-foreground truncate text-sm">{file.name}</span>}
            {busy && !preview && <Spinner />}
          </div>

          {preview && (
            <>
              {preview.errors.length ? (
                <Alert variant="destructive">
                  <CircleAlert />
                  <AlertDescription>
                    {preview.errors.length} problem{preview.errors.length === 1 ? "" : "s"} in{" "}
                    {formatNumber(preview.rows)} rows. Fix the file and choose it again — nothing
                    has been saved.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <CircleCheck />
                  <AlertDescription>
                    {formatNumber(preview.valid)} plots are ready to import.
                    {preview.newBlocks.length > 0 &&
                      ` New blocks: ${preview.newBlocks.join(", ")}.`}
                    {preview.newRoads.length > 0 && ` New roads: ${preview.newRoads.join(", ")}.`}
                  </AlertDescription>
                </Alert>
              )}

              {preview.errors.length > 0 && (
                <div className="max-h-56 overflow-y-auto rounded-lg border text-sm">
                  {preview.errors.map((e, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[4.5rem_6rem_1fr] gap-2 border-b px-3 py-1.5 last:border-0"
                    >
                      <span className="text-muted-foreground">Row {e.row}</span>
                      <span className="font-medium">{e.field}</span>
                      <span>{e.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {!preview.errors.length && preview.preview.length > 0 && (
                <div className="max-h-56 overflow-y-auto rounded-lg border text-sm">
                  <div className="bg-muted/50 text-muted-foreground grid grid-cols-4 gap-2 px-3 py-1.5 text-xs font-medium">
                    <span>Plot</span>
                    <span className="text-right">Area (sqft)</span>
                    <span className="text-right">Price</span>
                    <span>Road</span>
                  </div>
                  {preview.preview.map((p) => (
                    <div key={p.code} className="grid grid-cols-4 gap-2 border-t px-3 py-1.5">
                      <span className="font-medium">{p.code}</span>
                      <span className="text-right tabular-nums">{formatNumber(p.areaSqft)}</span>
                      <span className="text-right tabular-nums">{formatBDT(p.price)}</span>
                      <span>{p.road ?? "—"}</span>
                    </div>
                  ))}
                  {preview.valid > preview.preview.length && (
                    <p className="text-muted-foreground border-t px-3 py-1.5 text-xs">
                      …and {formatNumber(preview.valid - preview.preview.length)} more
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={confirm}
            disabled={!preview || preview.errors.length > 0 || !preview.valid || busy}
          >
            {busy && preview && <Spinner />}
            Import {preview?.valid ? formatNumber(preview.valid) : ""} plots
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
