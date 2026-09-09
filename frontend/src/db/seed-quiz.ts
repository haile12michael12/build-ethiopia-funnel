import { eq } from "drizzle-orm";
import { db } from "@/db";
import { quizFunnels } from "@/db/schema";
import { DEFAULT_QUIZ_QUESTIONS } from "@/lib/quiz";

export async function seedQuiz() {
  const existing = await db.select().from(quizFunnels).where(eq(quizFunnels.slug, "find-your-kit")).limit(1);
  if (existing[0]) return;
  await db.insert(quizFunnels).values({
    slug: "find-your-kit",
    title: "Find your kit",
    description: "A 20-second qualification quiz that recommends one DigitalForge product and scores the lead.",
    status: "active",
    questions: DEFAULT_QUIZ_QUESTIONS,
    hotThreshold: 70,
    warmThreshold: 40,
  });
}
