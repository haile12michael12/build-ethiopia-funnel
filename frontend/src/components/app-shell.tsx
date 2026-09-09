"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AppShell({
  title,
  nav,
  children,
}: {
  title: string;
  nav: { href: string; label: string }[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8">
      <aside className="hidden w-56 shrink-0 md:block">
        <p className="text-xs uppercase tracking-[0.2em] text-muted">{title}</p>
        <nav className="mt-4 grid gap-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-xl px-3 py-2 text-sm",
                pathname === item.href ? "bg-paper-2 font-medium" : "text-muted hover:text-[color:var(--fg)]",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
