"use client";

import { useRef, useState } from "react";
import { ImageUp, Map } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toastError } from "@/lib/notify";
import { useSetLayout } from "../api";

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_MB = 10;

/** Upload / replace the project's master-plan image and preview it. */
export default function LayoutTab({ project, canEdit }) {
  const input = useRef(null);
  const [progress, setProgress] = useState(null);
  const setLayout = useSetLayout(project.id);

  const onFile = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`The image must be smaller than ${MAX_MB} MB`);
      return;
    }
    setProgress(0);
    try {
      await setLayout.mutateAsync({ file, onProgress: setProgress });
      toast.success("Layout image saved");
    } catch (error) {
      toastError(error);
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          The master-plan image of the project. Plot shapes are drawn on it in the plot map.
          {project.layout && ` (${project.layout.width} × ${project.layout.height} px)`}
        </p>
        {canEdit && (
          <>
            <input ref={input} type="file" accept={ACCEPT} className="hidden" onChange={onFile} />
            <Button onClick={() => input.current?.click()} disabled={progress !== null}>
              <ImageUp /> {project.layout ? "Replace image" : "Upload layout image"}
            </Button>
          </>
        )}
      </div>

      {progress !== null && (
        <div className="space-y-1">
          <Progress value={progress} />
          <p className="text-muted-foreground text-xs">Uploading… {progress}%</p>
        </div>
      )}

      {project.layout ? (
        <div className="bg-muted/30 overflow-auto rounded-lg border">
          {/* eslint-disable-next-line @next/next/no-img-element -- signed API URL, not a static asset */}
          <img
            src={project.layout.url}
            alt={`${project.name} layout plan`}
            className="mx-auto max-h-[70vh] w-auto"
          />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
          <Map className="text-muted-foreground size-10" />
          <p className="font-medium">No layout image yet</p>
          <p className="text-muted-foreground max-w-md text-sm">
            Upload the project&apos;s master plan (JPEG, PNG or WebP, up to {MAX_MB} MB). A
            high-resolution export from the developer&apos;s drawing works best.
          </p>
        </div>
      )}
    </div>
  );
}
