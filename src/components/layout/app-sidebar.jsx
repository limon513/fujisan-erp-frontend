"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building, ChevronRight } from "lucide-react";
import { navigation } from "@/config/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useCan } from "@/modules/auth/auth-provider";
import ApiStatus from "./api-status";

const isActive = (pathname, href) => pathname === href || pathname.startsWith(`${href}/`);

function NavItem({ item, pathname, onNavigate }) {
  const Icon = item.icon;

  if (!item.children) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild isActive={isActive(pathname, item.href)} tooltip={item.title}>
          <Link href={item.href} onClick={onNavigate}>
            <Icon />
            <span>{item.title}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  const childActive = item.children.some((child) => isActive(pathname, child.href));

  return (
    <Collapsible asChild defaultOpen={childActive} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton tooltip={item.title} isActive={childActive}>
            <Icon />
            <span>{item.title}</span>
            <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.children.map((child) => (
              <SidebarMenuSubItem key={child.href}>
                <SidebarMenuSubButton asChild isActive={pathname === child.href}>
                  <Link href={child.href} onClick={onNavigate}>
                    <span>{child.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

// Reads the current path, so it must render inside <Suspense> (Cache Components).
function SidebarNav({ onNavigate }) {
  const pathname = usePathname();
  const can = useCan();

  // Hide links the user has no permission for (items without `permission` are always shown)
  const visible = navigation
    .map((group) => ({
      ...group,
      items: group.items
        .map((item) =>
          item.children
            ? { ...item, children: item.children.filter((c) => !c.permission || can(c.permission)) }
            : item,
        )
        .filter((item) =>
          item.children ? item.children.length > 0 : !item.permission || can(item.permission),
        ),
    }))
    .filter((group) => group.items.length > 0);

  return visible.map((group) => (
    <SidebarGroup key={group.label}>
      <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
      <SidebarMenu>
        {group.items.map((item) => (
          <NavItem key={item.title} item={item} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  ));
}

function SidebarNavSkeleton() {
  return (
    <SidebarGroup>
      <SidebarMenu>
        {Array.from({ length: 8 }, (_, index) => (
          <SidebarMenuItem key={index}>
            <SidebarMenuSkeleton showIcon width={`${50 + ((index * 37) % 40)}%`} />
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}

export default function AppSidebar() {
  const { isMobile, setOpenMobile } = useSidebar();
  const closeOnMobile = () => isMobile && setOpenMobile(false);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard" onClick={closeOnMobile}>
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Building className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {process.env.NEXT_PUBLIC_APP_NAME ?? "Real Estate ERP"}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    {process.env.NEXT_PUBLIC_COMPANY_NAME ?? ""}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <Suspense fallback={<SidebarNavSkeleton />}>
          <SidebarNav onNavigate={closeOnMobile} />
        </Suspense>
      </SidebarContent>

      <SidebarFooter>
        <ApiStatus />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
