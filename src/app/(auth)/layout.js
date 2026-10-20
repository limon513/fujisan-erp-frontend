import Brand from "@/modules/setting/components/brand";

export default function AuthLayout({ children }) {
  return (
    <div className="bg-muted/40 flex min-h-svh flex-col items-center justify-center gap-6 p-4 md:p-10">
      <Brand />
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
