import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import { retrieveAnswer, CHAT_FACTS } from "@/lib/chat-knowledge";
import { aiConfigured, completeChat } from "@/lib/ai";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  message: z.string().min(1).max(800),
  sessionId: z.string().min(8).max(80),
  segment: z.string().max(40).optional(),
  path: z.string().max(180).optional(),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(800) }))
    .max(8)
    .optional(),
});

export async function POST(req: Request) {
  const limited = rateLimit(clientKey(req, "chat"), 20, 60_000);
  if (!limited.ok) return Response.json({ error: "Too many messages — wait a moment." }, { status: 429 });
  try {
    const body = schema.parse(await req.json());
    await db.insert(chatMessages).values({
      sessionId: body.sessionId,
      role: "user",
      content: body.message,
      segment: body.segment,
      path: body.path,
    });

    let reply = retrieveAnswer(body.message);
    let source: "knowledge" | "model" = "knowledge";

    if (aiConfigured()) {
      const generated = await completeChat(
        [
          {
            role: "system",
            content: `You are DigitalForge's on-site assistant. Answer objections honestly. Never invent testimonials, stock levels, or discounts that are not listed. Facts:\n${CHAT_FACTS.map((f) => `- ${f}`).join("\n")}\nVisitor segment: ${body.segment || "unknown"}. Keep replies under 90 words.`,
          },
          ...(body.history || []).map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
          { role: "user" as const, content: body.message },
        ],
        { timeoutMs: 7000, maxTokens: 220 },
      );
      if (generated) {
        reply = generated;
        source = "model";
      }
    }

    await db.insert(chatMessages).values({
      sessionId: body.sessionId,
      role: "assistant",
      content: reply,
      segment: body.segment,
      path: body.path,
    });
    return Response.json({ reply, source });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid" }, { status: 400 });
  }
}
