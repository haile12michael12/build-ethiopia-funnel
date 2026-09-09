import { getSetting } from "@/lib/data";
import { CampaignToggle } from "@/components/campaign-toggle";

export const dynamic = "force-dynamic";

export default async function AdminSettings() {
  const campaign = await getSetting<{ enabled: boolean; message: string; endsAt: string; coupon?: string }>("campaign", {
    enabled: false,
    message: "",
    endsAt: new Date().toISOString(),
  });
  const rate = await getSetting<number>("etbRate", 57);
  return (
    <div>
      <h1 className="font-display text-4xl">Settings</h1>
      <p className="mt-2 text-muted">Campaign bar, FX rate and social proof. Payments adapters read environment variables.</p>
      <CampaignToggle campaign={campaign} etbRate={rate} />
    </div>
  );
}
