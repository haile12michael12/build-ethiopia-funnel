import Link from "next/link";
import { getBlogPosts } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function BlogPage() {
  const posts = await getBlogPosts();
  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="font-display text-5xl">From the desk</h1>
      <p className="mt-3 text-muted">Playbooks on funnels, prompts and shipping digital products — with product CTAs only where they belong.</p>
      <div className="mt-10 grid gap-5">
        {posts.map((p) => (
          <Link key={p.id} href={`/blog/${p.slug}`} className="surface rounded-3xl p-6">
            <h2 className="font-display text-3xl">{p.title}</h2>
            <p className="mt-2 text-muted">{p.excerpt}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
