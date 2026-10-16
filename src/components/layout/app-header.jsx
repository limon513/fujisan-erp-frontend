"use client";

import { Fragment, Suspense } from "react";
import { usePathname } from "next/navigation";
import { findNavItem } from "@/config/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import ThemeToggle from "./theme-toggle";
import UserMenu from "./user-menu";

// Reads the current path, so it must render inside <Suspense> (Cache Components).
function HeaderBreadcrumb() {
  const pathname = usePathname();
  const trail = findNavItem(pathname)?.trail ?? [];

  return (
    <BreadcrumbList>
      {trail.map((crumb, index) => (
        <Fragment key={crumb}>
          {index > 0 && <BreadcrumbSeparator className="hidden md:block" />}
          <BreadcrumbItem className={index < trail.length - 1 ? "hidden md:block" : ""}>
            <BreadcrumbPage className="truncate">{crumb}</BreadcrumbPage>
          </BreadcrumbItem>
        </Fragment>
      ))}
    </BreadcrumbList>
  );
}

export default function AppHeader() {
  return (
    <header className="bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-4 backdrop-blur">
      <SidebarTrigger className="-ml-1" />
      <Separator
        orientation="vertical"
        className="mr-2 self-center data-[orientation=vertical]:h-4"
      />

      <Breadcrumb className="min-w-0 flex-1">
        <Suspense fallback={null}>
          <HeaderBreadcrumb />
        </Suspense>
      </Breadcrumb>

      <ThemeToggle />

      <UserMenu />
    </header>
  );
}
