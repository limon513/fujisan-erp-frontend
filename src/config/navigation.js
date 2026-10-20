import {
  Network,
  ScrollText,
  Banknote,
  BarChart3,
  Boxes,
  Briefcase,
  CalendarClock,
  CircleX,
  Clock,
  UserCog,
  FileText,
  Gauge,
  Landmark,
  Megaphone,
  PhoneCall,
  Scale,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Target,
  UserRound,
  Users,
  Wallet,
  Building2,
} from "lucide-react";

/**
 * ERP navigation (blueprint §34).
 *
 * - `module`: backend module name; hidden when the module is disabled for this client.
 * - `permission`: required "<module>.view" permission (enforced from Phase 1).
 * - `phase`: roadmap phase that delivers the screen; unbuilt screens show a placeholder.
 */
export const navigation = [
  {
    label: "Overview",
    items: [{ title: "Dashboard", href: "/dashboard", icon: Gauge, module: "dashboard", phase: 1 }],
  },
  {
    label: "Sales & CRM",
    items: [
      {
        title: "CRM",
        icon: PhoneCall,
        module: "crm",
        phase: 3,
        children: [
          { title: "Leads", href: "/crm/leads", permission: "lead.view" },
          { title: "Follow-ups", href: "/crm/follow-ups", permission: "follow-up.view" },
          { title: "Site Visits", href: "/crm/site-visits", permission: "site-visit.view" },
          { title: "Sources", href: "/crm/sources", permission: "lead-source.view" },
        ],
      },
      { title: "Customers", href: "/customers", icon: UserRound, module: "customer", phase: 2 },
      {
        title: "Projects",
        icon: Building2,
        module: "project",
        phase: 2,
        children: [
          { title: "All projects", href: "/projects", permission: "project.view" },
          { title: "Plots", href: "/plots", permission: "plot.view" },
          { title: "Plot Map", href: "/plot-map", permission: "plot.view" },
        ],
      },
      { title: "Sales", href: "/sales", icon: Briefcase, module: "sales", phase: 3 },
      { title: "Booking", href: "/bookings", icon: FileText, module: "booking", phase: 3 },
      { title: "EMI", href: "/emi", icon: CalendarClock, module: "emi", phase: 3 },
      { title: "Collection", href: "/collections", icon: Wallet, module: "collection", phase: 3 },
      {
        title: "Cancellation",
        href: "/cancellations",
        icon: CircleX,
        module: "cancellation",
        phase: 3,
      },
    ],
  },
  {
    label: "Back Office",
    items: [
      { title: "Accounts", href: "/accounts", icon: Landmark, module: "accounts", phase: 4 },
      { title: "Purchase", href: "/purchase", icon: ShoppingCart, module: "purchase", phase: 4 },
      { title: "Inventory", href: "/inventory", icon: Boxes, module: "inventory", phase: 4 },
      { title: "HR", href: "/hr", icon: Users, module: "hr", phase: 4 },
      { title: "Attendance", href: "/attendance", icon: Clock, module: "attendance", phase: 4 },
      { title: "Payroll", href: "/payroll", icon: Banknote, module: "payroll", phase: 4 },
      {
        title: "Target & Performance",
        href: "/targets",
        icon: Target,
        module: "target",
        phase: 4,
      },
      { title: "Legal", href: "/legal", icon: Scale, module: "legal", phase: 4 },
      { title: "Marketing", href: "/marketing", icon: Megaphone, module: "marketing", phase: 5 },
      { title: "Reports", href: "/reports", icon: BarChart3, module: "report", phase: 5 },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        title: "Organization",
        icon: Network,
        module: "organization",
        phase: 1,
        children: [
          { title: "Branches", href: "/organization/branches", permission: "branch.view" },
          {
            title: "Departments",
            href: "/organization/departments",
            permission: "department.view",
          },
          {
            title: "Designations",
            href: "/organization/designations",
            permission: "designation.view",
          },
          { title: "Teams", href: "/organization/teams", permission: "team.view" },
          { title: "Employees", href: "/organization/employees", permission: "employee.view" },
        ],
      },
      {
        title: "Roles & Permissions",
        href: "/roles",
        icon: ShieldCheck,
        module: "role",
        permission: "role.view",
        phase: 1,
      },
      {
        title: "User Accounts",
        href: "/users",
        icon: UserCog,
        module: "user",
        permission: "user.view",
        phase: 1,
      },
      {
        title: "Audit Log",
        href: "/audit-logs",
        icon: ScrollText,
        module: "audit-log",
        permission: "audit-log.view",
        phase: 1,
      },
      {
        title: "Settings",
        href: "/settings",
        icon: Settings,
        module: "setting",
        permission: "setting.view",
        phase: 1,
      },
    ],
  },
];

/** Flat list of every navigable link with its trail, used for breadcrumbs and placeholders. */
export const flatNavigation = navigation.flatMap((group) =>
  group.items.flatMap((item) =>
    item.children
      ? item.children.map((child) => ({
          ...child,
          phase: child.phase ?? item.phase,
          trail: [item.title, child.title],
        }))
      : [{ ...item, trail: [item.title] }],
  ),
);

/** Pages that aren't in the sidebar but still need a breadcrumb. */
const otherPages = [{ title: "My profile", href: "/profile", phase: 1, trail: ["My profile"] }];

export const findNavItem = (pathname) =>
  [...flatNavigation, ...otherPages]
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
