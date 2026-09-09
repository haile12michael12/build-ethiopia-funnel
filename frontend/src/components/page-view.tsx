"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function PageView() {
  const pathname = usePathname();
  useEffect(() => {
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "page_view", path: pathname }),
    });
  }, [pathname]);
  return null;
}
