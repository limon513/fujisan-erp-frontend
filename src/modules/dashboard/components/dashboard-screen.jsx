"use client";

import Link from "next/link";
import { Building2, CalendarClock, Map, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import PageHeader from "@/components/common/page-header";
import { formatBDTShort, formatDateTime, formatNumber, formatTimeLeft } from "@/lib/format";
import { useInboxCount } from "@/modules/approval/api";
import { useAuth, useCan } from "@/modules/auth/auth-provider";
import { useFollowUpCounts, useVisitCounts } from "@/modules/crm/api";
import PlotStatusBar from "@/modules/project/components/plot-status-bar";
import { PLOT_STATUS } from "@/modules/project/constants";
import { useDashboard } from "../api";
import BusinessOverview from "./business-overview";

/** Stat tile: label, one big number, optional supporting line. */
function StatTile({ label, value, sub, dot, href }) {
  const body = (
    <Card className="h-full gap-1 py-4 transition-shadow hover:shadow-sm">
      <CardContent className="space-y-1 px-4">
        <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
          {dot && <span className="size-2 rounded-full" style={{ backgroundColor: dot }} />}
          {label}
        </p>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {sub && <p className="text-muted-foreground text-xs">{sub}</p>}
      </CardContent>
    </Card>
  );
  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

function HoldList({ holds, emptyText, showRequester = true }) {
  if (!holds.length) return <p className="text-muted-foreground text-sm">{emptyText}</p>;
  return (
    <div className="divide-y rounded-lg border">
      {holds.map((hold) => (
        <Link
          key={hold.id}
          href={`/plot-map?project=${hold.plot.project.id}`}
          className="hover:bg-muted/50 flex items-center gap-3 px-3 py-2 text-sm"
        >
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: PLOT_STATUS.HOLD.color }}
          />
          <div className="min-w-0 flex-1">
            <p className="font-medium">
              Plot {hold.plot.code}{" "}
              <span className="text-muted-foreground font-normal">· {hold.plot.project.name}</span>
            </p>
            <p className="text-muted-foreground truncate text-xs">
              {hold.customer
                ? `${hold.customer.fullName} (${hold.customer.customerCode})`
                : (hold.prospectName ?? "No customer noted")}
              {showRequester && ` · for ${hold.requestedBy.fullName}`}
            </p>
          </div>
          <div className="text-right text-xs">
            <p className="font-medium">ends {formatTimeLeft(hold.expiresAt)}</p>
            <p className="text-muted-foreground">{formatDateTime(hold.expiresAt)}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function Inventory({ inventory }) {
  const { totals } = inventory;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatTile
          label="Total plots"
          value={formatNumber(totals.total)}
          sub={`${inventory.projects.length} active project${inventory.projects.length === 1 ? "" : "s"}`}
          href="/projects"
        />
        <StatTile
          label="Available"
          dot={PLOT_STATUS.AVAILABLE.color}
          value={formatNumber(totals.AVAILABLE)}
          sub={`${formatBDTShort(inventory.availableValue)} total value`}
          href="/plots"
        />
        <StatTile
          label="On hold"
          dot={PLOT_STATUS.HOLD.color}
          value={formatNumber(totals.HOLD)}
          sub={`${inventory.activeHolds} active holds`}
        />
        <StatTile
          label="Booked"
          dot={PLOT_STATUS.BOOKED.color}
          value={formatNumber(totals.BOOKED)}
          sub="Confirmed, not yet registered"
        />
        <StatTile
          label="Sold"
          dot={PLOT_STATUS.SOLD.color}
          value={formatNumber(totals.SOLD)}
          sub="Registered plots"
        />
        <StatTile
          label="Blocked"
          dot={PLOT_STATUS.BLOCKED.color}
          value={formatNumber(totals.BLOCKED)}
          sub="Off the market"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="size-4" /> Plot inventory by project
          </CardTitle>
          <CardDescription>Hover a segment for its count.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {inventory.projects.length ? (
            inventory.projects.map((project) => (
              <div key={project.id} className="space-y-2">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <Link href={`/projects/${project.id}`} className="font-medium hover:underline">
                    {project.name}
                  </Link>
                  <span className="text-muted-foreground flex items-center gap-3 text-xs">
                    {formatNumber(project.plots.total)} plots
                    <Link
                      href={`/plot-map?project=${project.id}`}
                      className="hover:text-foreground flex items-center gap-1"
                    >
                      <Map className="size-3.5" /> Map
                    </Link>
                  </span>
                </div>
                <PlotStatusBar counts={project.plots} />
              </div>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">No active projects yet.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const { data, isLoading, error } = useDashboard();
  const { data: waiting = 0 } = useInboxCount();
  const can = useCan();
  // Sales staff see their own work; managers without an employee record see everything in scope
  const mine = Boolean(user.employee);
  const { data: followUpCounts } = useFollowUpCounts({ mine, enabled: can("follow-up.view") });
  const { data: visitCounts } = useVisitCounts({ mine, enabled: can("site-visit.view") });
  const firstName = (user.employee?.fullName ?? user.username).split(/\s+/)[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome, ${firstName}`}
        description="What's happening across your projects today."
      />

      {error ? (
        <p className="text-destructive text-sm">{error.message}</p>
      ) : isLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          {can("report.view") && <BusinessOverview />}
          {data.inventory && <Inventory inventory={data.inventory} />}

          <div className="grid gap-6 lg:grid-cols-2">
            {data.expiringHolds && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarClock className="size-4" /> Holds ending within 48 hours
                  </CardTitle>
                  <CardDescription>
                    Follow up before these plots are released automatically.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <HoldList
                    holds={data.expiringHolds}
                    emptyText="No holds end in the next 48 hours."
                  />
                </CardContent>
              </Card>
            )}
            {data.myHolds && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarClock className="size-4" /> My active holds
                  </CardTitle>
                  <CardDescription>Plots held at your request.</CardDescription>
                </CardHeader>
                <CardContent>
                  <HoldList
                    holds={data.myHolds}
                    emptyText="You have no plots on hold."
                    showRequester={false}
                  />
                </CardContent>
              </Card>
            )}
            <div className="grid content-start gap-3 sm:grid-cols-2">
              {followUpCounts && (
                <StatTile
                  label={mine ? "My follow-ups today" : "Follow-ups today"}
                  value={formatNumber(followUpCounts.today + followUpCounts.overdue)}
                  sub={
                    followUpCounts.overdue
                      ? `${formatNumber(followUpCounts.overdue)} overdue`
                      : "None overdue"
                  }
                  href="/crm/follow-ups"
                />
              )}
              {visitCounts && (
                <StatTile
                  label={mine ? "My site visits today" : "Site visits today"}
                  value={formatNumber(visitCounts.today)}
                  sub={`${formatNumber(visitCounts.upcoming)} booked later`}
                  href="/crm/site-visits"
                />
              )}
              <StatTile
                label="Waiting for your approval"
                value={formatNumber(waiting)}
                sub={waiting ? "Open your approvals" : "Nothing waiting"}
                href="/approvals"
              />
              {data.customers && (
                <StatTile
                  label={data.customers.scope === "OWN" ? "My customers" : "Customers"}
                  value={formatNumber(data.customers.total)}
                  sub={`${formatNumber(data.customers.newThisMonth)} new this month`}
                  href="/customers"
                />
              )}
              {data.people && (
                <StatTile
                  label="Employees"
                  value={formatNumber(data.people.activeEmployees)}
                  sub="Active and on leave"
                  href="/organization/employees"
                />
              )}
            </div>
          </div>

          {!data.inventory && !data.customers && !data.myHolds && !can("report.view") && (
            <Card>
              <CardContent className="text-muted-foreground flex items-center gap-3 py-8 text-sm">
                <Users className="size-5" /> Your role doesn&apos;t include any dashboard figures
                yet.
              </CardContent>
            </Card>
          )}

          <p className="text-muted-foreground text-xs">
            Updated {formatDateTime(data.generatedAt)}.
          </p>
        </>
      )}
    </div>
  );
}
