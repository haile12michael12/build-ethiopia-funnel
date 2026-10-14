import PublicLayout from '@/layouts/public-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    Calendar,
    Clock,
    Newspaper,
    Sparkles,
} from 'lucide-react';

export default function Blog() {
    const articles = [
        {
            title: 'Building Resilient AI Agents with Laravel and Large Language Models',
            excerpt: 'How we implement state machines, tool-calling guardrails, and pgvector retrieval to build reliable enterprise agents.',
            category: 'AI Engineering',
            readTime: '6 min read',
            date: 'October 10, 2026',
        },
        {
            title: 'Scaling Multi-Tenant SaaS on Laravel: Schema vs Column Isolation',
            excerpt: 'Lessons learned building high-throughput multi-tenant architectures with custom domain routing and queue-backed background execution.',
            category: 'Architecture',
            readTime: '8 min read',
            date: 'September 28, 2026',
        },
        {
            title: 'Optimizing Conversion Funnels with Real-Time Analytics and WebSockets',
            excerpt: 'A technical breakdown of funnel attribution tracking, UTM parameter capture, and conversion telemetry under high visitor traffic.',
            category: 'Performance',
            readTime: '5 min read',
            date: 'September 15, 2026',
        },
    ];

    return (
        <PublicLayout>
            <Head title="Engineering Blog & Insights - Hailab" />

            {/* Hero */}
            <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-card/80 to-background py-16">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
                    <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary mb-6">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Engineering Insights</span>
                    </div>

                    <h1 className="mx-auto max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl text-foreground">
                        Technical Deep Dives, AI Trends & Architecture Guides
                    </h1>

                    <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
                        Explore engineering articles and technical insights from our software development team.
                    </p>
                </div>
            </section>

            {/* Articles List */}
            <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-16 space-y-8">
                {articles.map((article, idx) => (
                    <article
                        key={idx}
                        className="group rounded-2xl border border-border bg-card p-6 sm:p-8 transition-all hover:border-primary/50 hover:shadow-lg"
                    >
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
                            <Badge variant="outline">{article.category}</Badge>
                            <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {article.date}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {article.readTime}
                            </span>
                        </div>

                        <h2 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                            {article.title}
                        </h2>

                        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                            {article.excerpt}
                        </p>

                        <div className="mt-6 flex items-center justify-between border-t border-border/60 pt-4">
                            <Link
                                href={route('portfolio.index')}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                            >
                                <span>Explore Related Software Work</span>
                                <ArrowRight className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    </article>
                ))}
            </div>
        </PublicLayout>
    );
}
