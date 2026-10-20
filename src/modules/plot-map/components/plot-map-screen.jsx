"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Hash, ImageOff, Maximize, Minus, PenLine, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/common/page-header";
import RequirePermission from "@/components/common/require-permission";
import { formatNumber } from "@/lib/format";
import { toastError } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { useCan } from "@/modules/auth/auth-provider";
import PlotDetailSheet from "@/modules/plot/components/plot-detail-sheet";
import { projects } from "@/modules/project/api";
import { PLOT_STATUS } from "@/modules/project/constants";
import { usePlotMap, useSetPlotShape } from "../api";
import OutlineEditorPanel from "./outline-editor-panel";
import PlotMapCanvas from "./plot-map-canvas";

const ALL_STATUSES = Object.keys(PLOT_STATUS);

function Legend({ counts, statuses, onToggle }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Object.entries(PLOT_STATUS).map(([status, { label, color }]) => {
        const on = statuses.has(status);
        return (
          <button
            key={status}
            type="button"
            onClick={() => onToggle(status)}
            aria-pressed={on}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-opacity",
              !on && "opacity-40",
            )}
          >
            <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
            {label}
            <span className="font-medium tabular-nums">{formatNumber(counts?.[status] ?? 0)}</span>
          </button>
        );
      })}
    </div>
  );
}

function MapView({ projectId }) {
  const can = useCan();
  const canEdit = can("plot.edit");
  const canvas = useRef(null);
  const { data: map, isLoading, error } = usePlotMap(projectId);
  const setShape = useSetPlotShape();

  const [mode, setMode] = useState("view");
  const [statuses, setStatuses] = useState(() => new Set(ALL_STATUSES));
  const [blockId, setBlockId] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null); // view: plot sheet · edit: plot being drawn
  const [tool, setTool] = useState("rect");
  // Many master plans already print plot numbers; let people hide ours
  const [showLabels, setShowLabels] = useState(true);

  const blocks = useMemo(() => {
    const seen = new Map();
    for (const plot of map?.plots ?? []) seen.set(plot.block.id, plot.block);
    return [...seen.values()].sort((a, b) => a.code.localeCompare(b.code));
  }, [map]);

  const isVisible = (plot) =>
    statuses.has(plot.status) && (blockId === "all" || plot.block.id === blockId);

  const toggleStatus = (status) =>
    setStatuses((current) => {
      const next = new Set(current);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next.size ? next : new Set(ALL_STATUSES);
    });

  const find = (event) => {
    event.preventDefault();
    const term = search.trim().toLowerCase();
    if (!term) return;
    const plot =
      map.plots.find((p) => p.code.toLowerCase() === term) ??
      map.plots.find(
        (p) => p.code.toLowerCase().includes(term) || p.plotNumber.toLowerCase() === term,
      );
    if (!plot) return toast.error(`No plot matches "${search}"`);
    if (!plot.mapShape) toast.info(`${plot.code} has no outline on the map yet`);
    else canvas.current?.focusPlot(plot.id);
    if (mode === "view") setSelectedId(plot.id);
  };

  const saveShape = async (points) => {
    const plot = map.plots.find((p) => p.id === selectedId);
    try {
      await setShape.mutateAsync({ id: plot.id, points });
      toast.success(`Outline saved for ${plot.code}`);
      // continue with the next plot that has no outline yet
      const next = map.plots.find((p) => !p.mapShape && p.id !== plot.id);
      setSelectedId(next?.id ?? null);
    } catch (apiError) {
      toastError(apiError);
    }
  };

  const removeShape = async () => {
    try {
      await setShape.mutateAsync({ id: selectedId, points: null });
      toast.success("Outline removed");
    } catch (apiError) {
      toastError(apiError);
    }
  };

  if (error) return <p className="text-destructive text-sm">{error.message}</p>;
  if (isLoading) return <Skeleton className="h-[65svh] w-full" />;

  if (!map.project.layout) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
        <ImageOff className="text-muted-foreground size-10" />
        <p className="font-medium">{map.project.name} has no layout image yet</p>
        <Button asChild variant="outline">
          <Link href={`/projects/${map.project.id}`}>Open the project to upload one</Link>
        </Button>
      </div>
    );
  }

  const unmapped = map.counts.total - map.counts.mapped;
  const editing = mode === "edit";

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <Legend counts={map.counts} statuses={statuses} onToggle={toggleStatus} />
        <div className="flex flex-wrap items-center gap-2">
          <Select value={blockId} onValueChange={setBlockId}>
            <SelectTrigger className="w-36" aria-label="Block" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All blocks</SelectItem>
              {blocks.map((block) => (
                <SelectItem key={block.id} value={block.id}>
                  {block.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <form onSubmit={find} className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              placeholder="Find plot, e.g. A-3"
              className="h-8 w-44 pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>
          <Button
            size="sm"
            variant={showLabels ? "secondary" : "outline"}
            aria-pressed={showLabels}
            onClick={() => setShowLabels((on) => !on)}
            title="Show plot numbers on the map"
          >
            <Hash /> Numbers
          </Button>
          {canEdit && (
            <Button
              size="sm"
              variant={editing ? "default" : "outline"}
              onClick={() => {
                // switching mode clears the selection (sheet in view mode, drawing target in edit)
                setSelectedId(null);
                setMode(editing ? "view" : "edit");
              }}
            >
              <PenLine /> {editing ? "Done editing" : "Edit outlines"}
            </Button>
          )}
        </div>
      </div>

      {!editing && unmapped > 0 && (
        <Alert>
          <PenLine />
          <AlertDescription>
            {unmapped} of {map.counts.total} plots have no outline on the map yet.
            {canEdit && " Use “Edit outlines” to draw them."}
          </AlertDescription>
        </Alert>
      )}

      {/* minmax(0, 1fr) + min-w-0: the image's pixel width must never widen the page */}
      <div
        className={cn(
          "grid grid-cols-[minmax(0,1fr)] gap-3",
          editing && "lg:grid-cols-[minmax(0,1fr)_17rem]",
        )}
      >
        <div className="relative min-w-0">
          <PlotMapCanvas
            ref={canvas}
            layout={map.project.layout}
            plots={map.plots}
            isVisible={isVisible}
            selectedId={selectedId}
            onPlotClick={(plot) => setSelectedId(plot.id)}
            drawTool={editing && selectedId ? tool : null}
            onShapeDrawn={saveShape}
            showLabels={showLabels}
            className="bg-muted/40 h-[65svh] overflow-hidden rounded-lg border lg:h-[calc(100svh-15rem)]"
          />
          <div className="bg-background absolute right-3 bottom-3 flex flex-col overflow-hidden rounded-md border shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Zoom in"
              onClick={() => canvas.current?.zoomIn()}
            >
              <Plus />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Zoom out"
              onClick={() => canvas.current?.zoomOut()}
            >
              <Minus />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Fit to screen"
              onClick={() => canvas.current?.fit()}
            >
              <Maximize />
            </Button>
          </div>
        </div>

        {editing && (
          <OutlineEditorPanel
            plots={map.plots}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              if (map.plots.find((p) => p.id === id)?.mapShape) canvas.current?.focusPlot(id);
            }}
            tool={tool}
            onToolChange={setTool}
            onRemove={removeShape}
            removing={setShape.isPending}
          />
        )}
      </div>

      {!editing && <PlotDetailSheet plotId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

export default function PlotMapScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: projectList } = projects.useList({
    limit: 100,
    sortBy: "name",
    sortOrder: "asc",
    isActive: true,
  });
  const options = projectList?.data ?? [];
  const fallback = options.find((p) => p.layout) ?? options[0];
  const projectId = searchParams.get("project") ?? fallback?.id ?? null;

  const chooseProject = (id) => router.replace(`${pathname}?project=${id}`, { scroll: false });

  return (
    <>
      <PageHeader
        title="Plot map"
        description="Live status of every plot on the project's layout. Click a plot for details and actions."
        actions={
          options.length > 0 && (
            <Select value={projectId ?? ""} onValueChange={chooseProject}>
              <SelectTrigger className="w-56" aria-label="Project">
                <SelectValue placeholder="Choose a project" />
              </SelectTrigger>
              <SelectContent>
                {options.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }
      />
      <RequirePermission permission="plot.view">
        {projectList && !options.length ? (
          <p className="text-muted-foreground text-sm">No projects yet.</p>
        ) : projectId ? (
          <MapView key={projectId} projectId={projectId} />
        ) : (
          <Skeleton className="h-[65svh] w-full" />
        )}
      </RequirePermission>
    </>
  );
}
