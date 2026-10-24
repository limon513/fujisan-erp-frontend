import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import AppSidebar from "@/components/layout/app-sidebar";
import AppHeader from "@/components/layout/app-header";
import AuthGate from "@/modules/auth/components/auth-gate";

// Authenticated ERP area: proxy.js redirects signed-out visitors, AuthGate confirms the session.
export default function ErpLayout({ children }) {
  return (
    <AuthGate>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          {/* SidebarInset is the page's <main>; a second one would confuse screen readers */}
          <div className="flex-1 p-4 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGate>
  );
}
