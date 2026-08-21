import { AppShell } from "@/components/app-shell";
import { QueryProvider } from "@/components/query-provider";
import { getBuildInfo } from "@/lib/build-info";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const buildInfo = getBuildInfo();

  return (
    <QueryProvider>
      <AppShell buildInfo={buildInfo}>{children}</AppShell>
    </QueryProvider>
  );
}
