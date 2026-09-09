import { db } from "@/db";
import { emailCampaigns, emailSequences, emailSubscribers } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function AdminEmail() {
  const [subs, seq, camps] = await Promise.all([
    db.select().from(emailSubscribers),
    db.select().from(emailSequences),
    db.select().from(emailCampaigns),
  ]);
  return (
    <div>
      <h1 className="font-display text-4xl">Email</h1>
      <p className="mt-2 text-muted">{subs.length} subscribers · sequences fire on register, lead magnet, checkout and purchase.</p>
      <h2 className="mt-8 font-display text-2xl">Automations</h2>
      {seq.map((s) => (
        <div key={s.id} className="surface mt-2 rounded-2xl p-4">
          {s.name} · trigger {s.triggerEvent} · {s.active ? "on" : "off"}
        </div>
      ))}
      <h2 className="mt-8 font-display text-2xl">Campaigns</h2>
      {camps.length === 0 && <p className="text-muted">No broadcast campaigns yet.</p>}
    </div>
  );
}
