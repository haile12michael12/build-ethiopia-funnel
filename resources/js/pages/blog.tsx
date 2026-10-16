import { Badge } from '@/components/ui/badge';
import PublicLayout from '@/layouts/public-layout';
import { type SharedData } from '@/types';
import { type SiteContent } from '@/types/site-content';
import { Head, Link, usePage } from '@inertiajs/react';
import { Calendar, Newspaper, Sparkles } from 'lucide-react';

interface Paginated<T> {
    data: T[];
    links: Array<{ url: string | null; label: string; active: boolean }>;
}

interface BlogProps extends SharedData {
    articles: Paginated<SiteContent>;
    seoPage: SiteContent | null;
}

export default function Blog() {
    const { articles, seoPage, locale } = usePage<BlogProps>().props;
    const isAmharic = locale === 'am';
    const localized = (english: string | null, amharic: string | null) => (isAmharic && amharic ? amharic : english || '');
    const title =
        localized(seoPage?.seo_title_en ?? null, seoPage?.seo_title_am ?? null) ||
        (isAmharic ? 'ብሎግ እና ግንዛቤዎች - Hailab' : 'Engineering Blog & Insights - Hailab');
    const description = localized(seoPage?.seo_description_en ?? null, seoPage?.seo_description_am ?? null);

    return (
        <PublicLayout>
            <Head>
                <title>{title}</title>
                {description && <meta name="description" content={description} />}
            </Head>

            <section className="border-b border-border/60 bg-gradient-to-b from-card/80 to-background py-16 text-center">
                <div className="mx-auto max-w-4xl px-4">
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>{isAmharic ? 'የምህንድስና ግንዛቤዎች' : 'Engineering Insights'}</span>
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                        {isAmharic ? 'የቴክኖሎጂ ጽሑፎች እና ግንዛቤዎች' : 'Technical Articles & Engineering Insights'}
                    </h1>
                    <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
                        {isAmharic ? 'ከሶፍትዌር ቡድናችን የተዘጋጁ ጽሑፎችን ያንብቡ።' : 'Read articles and technical insights from our software development team.'}
                    </p>
                </div>
            </section>

            <div className="mx-auto max-w-5xl space-y-6 px-4 py-16 sm:px-6 lg:px-8">
                {articles.data.length ? (
                    articles.data.map((article) => (
                        <article
                            key={article.id}
                            className="group rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg sm:p-8"
                        >
                            <div className="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                                {article.category && <Badge variant="outline">{article.category}</Badge>}
                                {article.published_at && (
                                    <span className="flex items-center gap-1">
                                        <Calendar className="h-3.5 w-3.5" />
                                        {new Date(article.published_at).toLocaleDateString(isAmharic ? 'am-ET' : 'en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        })}
                                    </span>
                                )}
                            </div>
                            <h2 className="text-2xl font-bold text-foreground transition-colors group-hover:text-primary">
                                {localized(article.title_en, article.title_am)}
                            </h2>
                            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{localized(article.summary_en, article.summary_am)}</p>
                            <Link
                                href={route('blog.show', article.slug)}
                                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                            >
                                <Newspaper className="h-4 w-4" />
                                {isAmharic ? 'አንብብ' : 'Read article'}
                            </Link>
                        </article>
                    ))
                ) : (
                    <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">
                        {isAmharic ? 'ጽሑፎች በቅርቡ ይታተማሉ።' : 'Articles will be published here soon.'}
                    </div>
                )}
            </div>
        </PublicLayout>
    );
}
