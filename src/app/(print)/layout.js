import AuthGate from "@/modules/auth/components/auth-gate";

// Signed-in pages meant for printing: no sidebar or header.
export default function PrintLayout({ children }) {
  return <AuthGate>{children}</AuthGate>;
}
