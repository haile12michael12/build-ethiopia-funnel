import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getSession, isStaff } from "@/lib/auth";
import { ADMIN_NAV } from "@/lib/constants";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isStaff(session.role)) redirect("/dashboard");
  return <AppShell title="Admin" nav={ADMIN_NAV}>{children}</AppShell>;
}
