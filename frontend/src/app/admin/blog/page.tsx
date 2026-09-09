import { db } from "@/db";
import { blogPosts } from "@/db/schema";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminBlog() {
  const rows = await db.select().from(blogPosts);
  return (
    <div>
      <h1 className="font-display text-4xl">Blog</h1>
      <div className="mt-6 space-y-2">
        {rows.map((p) => (
          <Link key={p.id} href={`/blog/${p.slug}`} className="surface block rounded-2xl p-4">{p.title} · {p.status}</Link>
        ))}
      </div>
    </div>
  );
}
