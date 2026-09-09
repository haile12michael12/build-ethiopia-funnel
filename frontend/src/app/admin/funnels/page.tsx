import Link from "next/link";
import { db } from "@/db";
import { funnels } from "@/db/schema";
import { FUNNEL_TEMPLATES, FUNNEL_TYPES } from "@/lib/funnels";
import { CreateFunnelForm } from "@/components/create-funnel-form";
import { Badge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AdminFunnels() {
  const rows = await db.select().from(funnels);
  const typeLabel = (id: string) => FUNNEL_TYPES.find((t) => t.id === id)?.label || id;

  return (
    <div>
      <h1 className="font-display text-4xl">Funnel builder</h1>
      <p className="mt-2 max-w-3xl text-muted">
        Build landing pages, lead funnels, sales funnels, webinar funnels, quiz funnels, product funnels, booking
        funnels, course funnels and SaaS signup funnels — with drag-and-drop steps, reusable sections, custom domains,
        SEO, mobile preview, custom CSS/JS and version history.
      </p>
      <CreateFunnelForm
        templates={FUNNEL_TEMPLATES.map((t) => ({ key: t.key, name: t.name, description: t.description, funnelType: t.funnelType }))}
        funnelTypes={FUNNEL_TYPES as unknown as { id: string; label: string; description: string }[]}
      />
      <div className="mt-8 space-y-3">
        {rows.map((f) => (
          <div key={f.id} className="surface flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium">{f.name}</p>
                <Badge tone="muted">{typeLabel(f.funnelType)}</Badge>
                {f.customDomain && (
                  <Badge tone={f.domainStatus === "verified" ? "moss" : "copper"}>
                    {f.customDomain} · {f.domainStatus}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted">{f.status} · v{f.version} · /f/{f.slug}</p>
            </div>
            <div className="flex gap-2">
              <Link href={`/f/${f.slug}`} className="btn-ghost !py-2 text-sm">Open</Link>
              <Link href={`/admin/funnels/${f.id}`} className="btn-primary !py-2 text-sm">Edit</Link>
            </div>
          </div>
        ))}
        {rows.length === 0 && <p className="text-muted">No funnels yet — create one from a template above.</p>}
      </div>
    </div>
  );
}
