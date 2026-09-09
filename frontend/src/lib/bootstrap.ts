import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { seedDatabase } from "@/db/seed";
import { seedPersonalization } from "@/db/seed-personalization";
import { seedFunnels } from "@/db/seed-funnels";
import { seedQuiz } from "@/db/seed-quiz";
import { seedCrossSells } from "@/db/seed-checkout";
import { seedOrderBumpExample } from "@/db/seed-order-bumps";

const g = globalThis as typeof globalThis & { __dfBootstrapped?: boolean };

export async function ensureSeeded() {
  if (g.__dfBootstrapped) return;
  try {
    const rows = await db.select().from(settings).where(eq(settings.key, "seeded")).limit(1);
    if (!rows[0]) {
      await seedDatabase();
    }
    try {
      await seedPersonalization();
    } catch (error) {
      console.error("personalization seed", error);
    }
    try {
      await seedFunnels();
    } catch (error) {
      console.error("funnel seed", error);
    }
    try {
      await seedQuiz();
    } catch (error) {
      console.error("quiz seed", error);
    }
    try {
      await seedCrossSells();
    } catch (error) {
      console.error("cross-sell seed", error);
    }
    try {
      await seedOrderBumpExample();
    } catch (error) {
      console.error("order bump example seed", error);
    }
    g.__dfBootstrapped = true;
  } catch {
    try {
      await seedDatabase();
      await seedPersonalization();
      await seedFunnels();
      await seedQuiz();
      await seedCrossSells();
      await seedOrderBumpExample();
      g.__dfBootstrapped = true;
    } catch (error) {
      console.error("DigitalForge bootstrap failed", error);
    }
  }
}
