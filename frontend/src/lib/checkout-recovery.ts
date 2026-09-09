import { and, desc, eq, isNotNull, isNull, lt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { abandonedCheckouts, type AbandonedCheckout } from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { getOrigin } from "@/lib/utils";
import type { CartLine } from "@/lib/cart";

export async function saveCheckoutProgress(input: {
  sessionId: string;
  email?: string;
  name?: string;
  phone?: string;
  cartSnapshot: CartLine[];
  subtotalCents: number;
  currency: string;
  funnelSlug?: string;
  step?: string;
}) {
  if (!input.cartSnapshot.length) return null;
  const existing = await db
    .select()
    .from(abandonedCheckouts)
    .where(eq(abandonedCheckouts.sessionId, input.sessionId))
    .limit(1);

  if (existing[0]) {
    if (existing[0].status === "recovered") return existing[0];
    const [row] = await db
      .update(abandonedCheckouts)
      .set({
        email: input.email || existing[0].email,
        name: input.name || existing[0].name,
        phone: input.phone || existing[0].phone,
        cartSnapshot: input.cartSnapshot,
        subtotalCents: input.subtotalCents,
        currency: input.currency,
        funnelSlug: input.funnelSlug,
        step: input.step || existing[0].step,
        status: "open",
        updatedAt: new Date(),
      })
      .where(eq(abandonedCheckouts.id, existing[0].id))
      .returning();
    return row;
  }

  const [row] = await db
    .insert(abandonedCheckouts)
    .values({
      token: nanoid(32),
      sessionId: input.sessionId,
      email: input.email,
      name: input.name,
      phone: input.phone,
      cartSnapshot: input.cartSnapshot,
      subtotalCents: input.subtotalCents,
      currency: input.currency,
      funnelSlug: input.funnelSlug,
      step: input.step || "contact",
      status: "open",
    })
    .returning();
  return row;
}

export async function markCheckoutRecovered(sessionId: string, orderId: number) {
  await db
    .update(abandonedCheckouts)
    .set({ status: "recovered", recoveredAt: new Date(), recoveredOrderId: orderId, updatedAt: new Date() })
    .where(eq(abandonedCheckouts.sessionId, sessionId));
}

export function recoveryEmail(name: string | null, token: string) {
  const url = `${getOrigin()}/checkout/recover/${token}`;
  return {
    subject: "You left something in your cart",
    html: `<p>Hi ${name || "there"},</p><p>Your DigitalForge cart is still saved. Pick up right where you left off:</p><p><a href="${url}">${url}</a></p><p>Instant download the moment checkout completes.</p>`,
  };
}

export async function sendRecoveryEmail(row: AbandonedCheckout) {
  if (!row.email) return { ok: false, reason: "No email on file" };
  const mail = recoveryEmail(row.name, row.token);
  await sendEmail({ to: row.email, ...mail });
  await db
    .update(abandonedCheckouts)
    .set({ recoveryEmailSentAt: new Date(), status: "emailed", updatedAt: new Date() })
    .where(eq(abandonedCheckouts.id, row.id));
  return { ok: true };
}

export async function listAbandonedCheckouts() {
  return db.select().from(abandonedCheckouts).orderBy(desc(abandonedCheckouts.updatedAt)).limit(100);
}

export async function runAbandonedRecoverySweep(olderThanMinutes = 30) {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000);
  const candidates = await db
    .select()
    .from(abandonedCheckouts)
    .where(
      and(
        eq(abandonedCheckouts.status, "open"),
        isNotNull(abandonedCheckouts.email),
        isNull(abandonedCheckouts.recoveryEmailSentAt),
        lt(abandonedCheckouts.updatedAt, cutoff),
      ),
    );
  let sent = 0;
  for (const row of candidates) {
    if (!row.email) continue;
    const result = await sendRecoveryEmail(row);
    if (result.ok) sent += 1;
  }
  return { scanned: candidates.length, sent };
}
