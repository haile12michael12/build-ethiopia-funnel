import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { certificates, lessonProgress, lessons, modules } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Login required" }, { status: 401 });
  const { lessonId, completed } = await req.json();
  const existing = await db
    .select()
    .from(lessonProgress)
    .where(and(eq(lessonProgress.userId, session.id), eq(lessonProgress.lessonId, Number(lessonId))))
    .limit(1);
  if (existing[0]) {
    await db
      .update(lessonProgress)
      .set({ completed: Boolean(completed), completedAt: completed ? new Date() : null })
      .where(eq(lessonProgress.id, existing[0].id));
  } else {
    await db.insert(lessonProgress).values({
      userId: session.id,
      lessonId: Number(lessonId),
      completed: Boolean(completed),
      completedAt: completed ? new Date() : null,
    });
  }

  const lesson = (await db.select().from(lessons).where(eq(lessons.id, Number(lessonId))).limit(1))[0];
  if (lesson) {
    const mod = (await db.select().from(modules).where(eq(modules.id, lesson.moduleId)).limit(1))[0];
    if (mod) {
      const courseMods = await db.select().from(modules).where(eq(modules.courseId, mod.courseId));
      const allLessons = [];
      for (const m of courseMods) {
        allLessons.push(...(await db.select().from(lessons).where(eq(lessons.moduleId, m.id))));
      }
      const progress = await db.select().from(lessonProgress).where(eq(lessonProgress.userId, session.id));
      const done = allLessons.every((l) => progress.some((p) => p.lessonId === l.id && p.completed));
      if (done) {
        const already = await db
          .select()
          .from(certificates)
          .where(and(eq(certificates.userId, session.id), eq(certificates.courseId, mod.courseId)))
          .limit(1);
        if (!already[0]) {
          await db.insert(certificates).values({
            userId: session.id,
            courseId: mod.courseId,
            code: `CERT-${nanoid(8).toUpperCase()}`,
          });
        }
      }
    }
  }
  return Response.json({ ok: true });
}
