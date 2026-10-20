"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, ImageIcon, MapPin, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import StatusBadge from "@/components/common/status-badge";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatNumber } from "@/lib/format";
import { useCan } from "@/modules/auth/auth-provider";
import { projects } from "../api";
import { PROJECT_STATUS } from "../constants";
import PlotStatusBar from "./plot-status-bar";
import ProjectFormDialog from "./project-form-dialog";

function ProjectCard({ project }) {
  const status = PROJECT_STATUS[project.status];
  const location = [project.upazila, project.district].filter(Boolean).join(", ");

  return (
    <Link href={`/projects/${project.id}`} className="group">
      <Card className="h-full transition-shadow group-hover:shadow-md">
        <CardHeader className="gap-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="truncate text-base">{project.name}</CardTitle>
              <p className="text-muted-foreground text-xs">{project.code}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              {!project.isActive && <StatusBadge>Inactive</StatusBadge>}
              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            </div>
          </div>
          <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
            {location && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3" /> {location}
              </span>
            )}
            {project.landAreaDecimal && (
              <span>{formatNumber(project.landAreaDecimal)} decimal</span>
            )}
            <span className="flex items-center gap-1">
              <ImageIcon className="size-3" /> {project.layout ? "Layout ready" : "No layout"}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-muted-foreground">Plots</span>
            <span className="font-medium tabular-nums">{formatNumber(project.plots.total)}</span>
          </div>
          <PlotStatusBar counts={project.plots} />
        </CardContent>
      </Card>
    </Link>
  );
}

export default function ProjectsScreen() {
  const router = useRouter();
  const can = useCan();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [creating, setCreating] = useState(false);
  const debouncedSearch = useDebouncedValue(search);
  const { data, isLoading, error } = projects.useList({
    search: debouncedSearch,
    status,
    limit: 100,
    sortBy: "name",
    sortOrder: "asc",
  });

  return (
    <>
      <PageHeader
        title="Projects"
        description="Each project is divided into blocks and roads, with plots on its layout plan."
        actions={
          can("project.create") && (
            <Button onClick={() => setCreating(true)}>
              <Plus /> New project
            </Button>
          )
        }
      />
      <RequirePermission permission="project.view">
        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative sm:w-64">
              <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                placeholder="Search projects"
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="sm:w-40" aria-label="Status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.entries(PROJECT_STATUS).map(([value, { label }]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error ? (
            <p className="text-destructive text-sm">{error.message}</p>
          ) : isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-44" />
              ))}
            </div>
          ) : data.data.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {data.data.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
              <Building2 className="text-muted-foreground size-10" />
              <p className="font-medium">No projects yet</p>
              {can("project.create") && (
                <Button onClick={() => setCreating(true)}>Create the first project</Button>
              )}
            </div>
          )}
        </div>
      </RequirePermission>
      <ProjectFormDialog
        open={creating}
        onOpenChange={setCreating}
        onSaved={(project) => router.push(`/projects/${project.id}`)}
      />
    </>
  );
}
