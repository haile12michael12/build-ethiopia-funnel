import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getBlogPost, getBlogPosts } from "@/lib/data";
import { BRAND } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return { title: "Article" };
  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();
  const related = (await getBlogPosts()).filter((p) => p.id !== post.id).slice(0, 3);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    datePublished: post.publishedAt,
    publisher: { "@type": "Organization", name: BRAND.name },
  };
  return (
    <article className="mx-auto max-w-3xl px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="text-sm text-muted"><Link href="/blog">Blog</Link></p>
      <h1 className="mt-4 font-display text-5xl">{post.title}</h1>
      <p className="mt-4 text-lg text-muted">{post.excerpt}</p>
      <div className="prose-df mt-10 whitespace-pre-wrap">{post.content}</div>
      <div className="mt-12 rounded-3xl bg-ink p-8 text-cream">
        <p className="font-display text-3xl">Ship with the same tools we write about.</p>
        <Link href="/products" className="btn-primary mt-4 inline-flex">Explore products</Link>
      </div>
      <div className="mt-10 grid gap-3">
        {related.map((p) => (
          <Link key={p.id} href={`/blog/${p.slug}`} className="text-copper">{p.title}</Link>
        ))}
      </div>
    </article>
  );
}
