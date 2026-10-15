import { Button } from '@/components/ui/button';
import PublicLayout from '@/layouts/public-layout';
import { type SharedData } from '@/types';
import { type SiteContent } from '@/types/site-content';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

interface ServicesProps extends SharedData {
    services: SiteContent[];
    seoPage: SiteContent | null;
}

export default function Services() {
    const { services, seoPage, locale } = usePage<ServicesProps>().props;
    const isAmharic = locale === 'am';
    const localized = (english: string | null, amharic: string | null) => (isAmharic && amharic ? amharic : english || '');
    const title = localized(seoPage?.seo_title_en ?? null, seoPage?.seo_title_am ?? null) || (isAmharic ? 'የሶፍትዌር እና AI አገልግሎቶች - Hailab' : 'Software & AI Services - Hailab');
    const description = localized(seoPage?.seo_description_en ?? null, seoPage?.seo_description_am ?? null);

    return (
        <PublicLayout>
            <Head>
                <title>{title}</title>
                {description && <meta name="description" content={description} />}
            </Head>
            <section className="border-b border-border/60 bg-gradient-to-b from-card/80 to-background py-16 text-center sm:py-24">
                <div className="mx-auto max-w-4xl px-4">
                    <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>{isAmharic ? 'አገልግሎቶቻችን' : 'Agency Services & Capabilities'}</span>
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
                        {isAmharic ? 'ብጁ ሶፍትዌር፣ AI እና የድር መድረኮች' : 'Custom Software, AI Automation & Scalable Web Platforms'}
                    </h1>
                    <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
                        {isAmharic ? 'ከንድፍ እስከ ማስጀመር የሚያግዙ የዲጂታል ምርቶችን እንገነባለን።' : 'We build robust digital products from architectural design to deployment.'}
                    </p>
                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                        <Button asChild size="lg"><Link href={route('business-audit.show')}>{isAmharic ? 'የንግድ ኦዲት ይጠይቁ' : 'Request Growth Audit'}</Link></Button>
                        <Button asChild variant="outline" size="lg"><Link href={route('portfolio.index')}>{isAmharic ? 'ስራዎቻችንን ይመልከቱ' : 'Browse Portfolio'}</Link></Button>
                    </div>
                </div>
            </section>
            <section className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-16 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 lg:px-8">
                {services.length ? services.map((service) => (
                    <article key={service.id} className="flex flex-col rounded-2xl border border-border bg-card p-7 shadow-sm">
                        {service.image && <img src={service.image} alt="" className="mb-5 h-44 w-full rounded-xl object-cover" />}
                        {service.category && <p className="mb-2 text-sm font-semibold text-primary">{service.category}</p>}
                        <h2 className="text-2xl font-bold text-foreground">{localized(service.title_en, service.title_am)}</h2>
                        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{localized(service.summary_en, service.summary_am)}</p>
                        <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-foreground/90">{localized(service.body_en, service.body_am)}</p>
                        {!!(isAmharic ? service.highlights_am : service.highlights_en)?.length && (
                            <ul className="mt-5 space-y-2">
                                {(isAmharic ? service.highlights_am : service.highlights_en)?.map((highlight, index) => (
                                    <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{highlight}
                                    </li>
                                ))}
                            </ul>
                        )}
                        <Link href={route('contact')} className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold text-primary hover:underline">
                            {isAmharic ? 'አግኙን' : 'Discuss this service'}<ArrowRight className="h-4 w-4" />
                        </Link>
                    </article>
                )) : (
                    <p className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground sm:col-span-2 lg:col-span-3">
                        {isAmharic ? 'የአገልግሎት ዝርዝሮች በቅርቡ ይጨመራሉ።' : 'Service details will be added here soon.'}
                    </p>
                )}
            </section>
        </PublicLayout>
    );
}
