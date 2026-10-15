import PublicLayout from '@/layouts/public-layout';
import { type SharedData } from '@/types';
import { type SiteContent } from '@/types/site-content';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowLeft, Calendar } from 'lucide-react';

interface ContentShowProps extends SharedData {
    content: SiteContent;
}

export default function SiteContentShow() {
    const { content, locale } = usePage<ContentShowProps>().props;
    const isAmharic = locale === 'am';
    const localized = (english: string | null, amharic: string | null) => (isAmharic && amharic ? amharic : english || '');
    const title = localized(content.title_en, content.title_am);
    const body = localized(content.body_en, content.body_am);
    const seoTitle = localized(content.seo_title_en, content.seo_title_am) || title;
    const seoDescription = localized(content.seo_description_en, content.seo_description_am) || localized(content.summary_en, content.summary_am);

    return (
        <PublicLayout>
            <Head>
                <title>{seoTitle}</title>
                {seoDescription && <meta name="description" content={seoDescription} />}
                {content.image && <meta property="og:image" content={content.image} />}
            </Head>
            <article className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
                <Link
                    href={content.type === 'blog' ? route('blog.index') : '/'}
                    className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                    <ArrowLeft className="h-4 w-4" />{content.type === 'blog' ? (isAmharic ? 'ወደ ጽሑፎች ተመለስ' : 'Back to articles') : (isAmharic ? 'ወደ መነሻ ገጽ' : 'Back to home')}
                </Link>
                {content.image && <img src={content.image} alt="" className="mb-8 max-h-[30rem] w-full rounded-2xl object-cover" />}
                {content.category && <p className="mb-3 text-sm font-semibold text-primary">{content.category}</p>}
                <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">{title}</h1>
                {content.published_at && (
                    <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {new Date(content.published_at).toLocaleDateString(isAmharic ? 'am-ET' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                )}
                {localized(content.summary_en, content.summary_am) && (
                    <p className="mt-6 text-xl leading-relaxed text-muted-foreground">{localized(content.summary_en, content.summary_am)}</p>
                )}
                <div className="mt-10 whitespace-pre-wrap text-base leading-8 text-foreground/90">{body}</div>
            </article>
        </PublicLayout>
    );
}
