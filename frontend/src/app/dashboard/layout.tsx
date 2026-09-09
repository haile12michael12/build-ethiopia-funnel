import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSession } from "@/lib/auth";
import { DASHBOARD_NAV } from "@/lib/constants";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  return <AppShell title="Account" nav={DASHBOARD_NAV}>{children}</AppShell>;
}
