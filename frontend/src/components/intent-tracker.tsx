"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

function TrackerInner() {
  const pathname = usePathname();
  const params = useSearchParams();

  useEffect(() => {
    const utmSource = params.get("utm_source") || undefined;
    const utmCampaign = params.get("utm_campaign") || undefined;
    const utmMedium = params.get("utm_medium") || undefined;
    const utmContent = params.get("utm_content") || undefined;
    const segment = params.get("segment") || params.get("for") || undefined;
    const referrer = typeof document !== "undefined" ? document.referrer : "";
    if (!utmSource && !utmCampaign && !segment && !referrer) return;
    void fetch("/api/personalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        utmSource,
        utmCampaign,
        utmMedium,
        utmContent,
        segment,
        referrer,
        path: pathname,
      }),
    });
  }, [pathname, params]);

  return null;
}

export function IntentTracker() {
  return (
    <Suspense fallback={null}>
      <TrackerInner />
    </Suspense>
  );
}
