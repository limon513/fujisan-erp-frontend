"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, MapPin, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/common/page-header";
import RequirePermission from "@/components/common/require-permission";
import StatusBadge from "@/components/common/status-badge";
import { formatDateOnly, formatNumber } from "@/lib/format";
import { useCan } from "@/modules/auth/auth-provider";
import { projects } from "../api";
import { PLOT_STATUS, PROJECT_STATUS } from "../constants";
import LayoutTab from "./layout-tab";
import PlotStatusBar from "./plot-status-bar";
import ProjectChildrenTab from "./project-children-tab";
import ProjectFormDialog from "./project-form-dialog";

const Detail = ({ label, children }) => (
  <div className="grid grid-cols-[9rem_1fr] gap-2 py-1.5 text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className="min-w-0 break-words">{children || "—"}</span>
  </div>
);

function Overview({ project }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Card className="py-4">
          <CardContent className="px-4">
            <p className="text-muted-foreground text-xs">Total plots</p>
            <p className="text-2xl font-semibold tabular-nums">
              {formatNumber(project.plots.total)}
            </p>
          </CardContent>
        </Card>
        {Object.entries(PLOT_STATUS).map(([status, { label, color }]) => (
          <Card key={status} className="py-4">
            <CardContent className="px-4">
              <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <span className="size-2 rounded-full" style={{ backgroundColor: color }} /> {label}
              </p>
              <p className="text-2xl font-semibold tabular-nums">
                {formatNumber(project.plots[status])}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
      <PlotStatusBar counts={project.plots} showLegend={false} />
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-x-8 md:grid-cols-2">
          <div>
            <Detail label="Total land">
              {project.landAreaDecimal && `${formatNumber(project.landAreaDecimal)} decimal`}
            </Detail>
            <Detail label="Location">
              {[project.upazila, project.district].filter(Boolean).join(", ")}
            </Detail>
            <Detail label="Address">{project.address}</Detail>
            <Detail label="Branch">{project.branch?.name}</Detail>
            <Detail label="Project manager">{project.projectManager?.fullName}</Detail>
          </div>
          <div>
            <Detail label="Launch date">
              {project.launchDate && formatDateOnly(project.launchDate)}
            </Detail>
            <Detail label="Expected handover">
              {project.expectedHandoverDate && formatDateOnly(project.expectedHandoverDate)}
            </Detail>
            <Detail label="Blocks / roads">{`${project.blockCount} / ${project.roadCount}`}</Detail>
            <Detail label="Default hold">{`${project.defaultHoldDays} days`}</Detail>
            <Detail label="Description">{project.description}</Detail>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProjectDetailScreen() {
  const { id } = useParams();
  const can = useCan();
  const canEdit = can("project.edit");
  const { data: project, isLoading, error } = projects.useItem(id);
  const [editing, setEditing] = useState(false);

  return (
    <RequirePermission permission="project.view">
      <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
        <Link href="/projects">
          <ArrowLeft /> All projects
        </Link>
      </Button>
      {error ? (
        <p className="text-destructive text-sm">{error.message}</p>
      ) : isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          <PageHeader
            title={project.name}
            description={
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>{project.code}</span>
                {project.district && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" />{" "}
                    {[project.upazila, project.district].filter(Boolean).join(", ")}
                  </span>
                )}
                <StatusBadge tone={PROJECT_STATUS[project.status].tone}>
                  {PROJECT_STATUS[project.status].label}
                </StatusBadge>
                {!project.isActive && <StatusBadge>Inactive</StatusBadge>}
              </span>
            }
            actions={
              canEdit && (
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <Pencil /> Edit project
                </Button>
              )
            }
          />
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="blocks">Blocks ({project.blockCount})</TabsTrigger>
              <TabsTrigger value="roads">Roads ({project.roadCount})</TabsTrigger>
              <TabsTrigger value="layout">Layout</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="pt-2">
              <Overview project={project} />
            </TabsContent>
            <TabsContent value="blocks" className="pt-2">
              <ProjectChildrenTab projectId={project.id} kind="blocks" canEdit={canEdit} />
            </TabsContent>
            <TabsContent value="roads" className="pt-2">
              <ProjectChildrenTab projectId={project.id} kind="roads" canEdit={canEdit} />
            </TabsContent>
            <TabsContent value="layout" className="pt-2">
              <LayoutTab project={project} canEdit={canEdit} />
            </TabsContent>
          </Tabs>
          <ProjectFormDialog open={editing} onOpenChange={setEditing} project={project} />
        </>
      )}
    </RequirePermission>
  );
}
