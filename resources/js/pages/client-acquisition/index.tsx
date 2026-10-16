import { Button } from '@/components/ui/button';
import { PublicLayout } from '@/layouts/public-layout';
import type { SharedData } from '@/types';
import type { ClientAcquisitionSettings as AcquisitionOptions } from '@/types/client-acquisition';
import { currentAttribution, funnelSessionId, trackFunnelEvent } from '@/lib/analytics';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowDown, ArrowLeft, ArrowRight, Check, CheckCircle2, Code2, Globe2, Layers3, Sparkles } from 'lucide-react';
import { type FormEvent, useEffect, useRef, useState } from 'react';

interface LocalizedContent {
    id?: number;
    title_en: string;
    title_am?: string | null;
    summary_en?: string | null;
    summary_am?: string | null;
    image?: string | null;
    slug?: string;
    cover_image?: string | null;
    technologies?: string[] | null;
    person_name_en?: string | null;
    person_name_am?: string | null;
    person_role_en?: string | null;
    person_role_am?: string | null;
    company_en?: string | null;
    company_am?: string | null;
}

interface AcquisitionForm {
    name: string;
    email: string;
    phone: string;
    business_name: string;
    market: '' | 'ethiopia' | 'international';
    country: string;
    service_interests: string[];
    project_description: string;
    budget: string;
    timeline: string;
    website: string;
    social_links: string[];
    preferred_contact: 'email' | 'phone' | 'whatsapp';
    additional_requirements: string;
    marketing_consent: boolean;
    session_id: string;
    attribution: Record<string, string>;
}

interface ClientAcquisitionPageProps {
    services: LocalizedContent[];
    projects: LocalizedContent[];
    testimonials: LocalizedContent[];
    settings: Pick<AcquisitionOptions, 'services' | 'budgets' | 'timelines' | 'response_time_hours' | 'response_email' | 'whatsapp_url' | 'meeting_url' | 'analytics_funnel_id'>;
}

const serviceIcons = [Code2, Sparkles, Layers3, Globe2];

function localized(text: string | null | undefined): string {
    return text?.trim() || '';
}

export default function ClientAcquisitionPage({ services, projects, testimonials, settings }: ClientAcquisitionPageProps) {
    const { locale, translations } = usePage<SharedData>().props;
    const isAmharic = locale === 'am';
    const copy = translations?.client_acquisition;
    const t = (key: string): string => {
        const value: unknown = copy?.[key];
        return typeof value === 'string' ? value : key;
    };
    const [step, setStep] = useState(0);
    const [serviceError, setServiceError] = useState(false);
    const [marketError, setMarketError] = useState(false);
    const formElement = useRef<HTMLFormElement>(null);
    const formSection = useRef<HTMLDivElement>(null);
    const trackedFormStart = useRef(false);
    const form = useForm<AcquisitionForm>({
        name: '',
        email: '',
        phone: '',
        business_name: '',
        market: '',
        country: '',
        service_interests: [],
        project_description: '',
        budget: '',
        timeline: '',
        website: '',
        social_links: ['', ''],
        preferred_contact: 'email',
        additional_requirements: '',
        marketing_consent: false,
        session_id: '',
        attribution: {},
    });

    const steps = [t('step_market'), t('step_project'), t('step_contact')];
    const budgets = settings.budgets.filter((budget) => !form.data.market || budget.currency === (form.data.market === 'ethiopia' ? 'ETB' : 'USD'));

    useEffect(() => {
        if (settings.analytics_funnel_id) trackFunnelEvent(settings.analytics_funnel_id, 'view');
    }, [settings.analytics_funnel_id]);

    const trackFormStart = () => {
        if (!trackedFormStart.current && settings.analytics_funnel_id) {
            trackedFormStart.current = true;
            trackFunnelEvent(settings.analytics_funnel_id, 'form_start', {
                formId: 'client-acquisition',
                metadata: { market: form.data.market || 'unselected' },
            });
        }
    };

    const setMarket = (market: 'ethiopia' | 'international') => {
        form.setData({
            ...form.data,
            market,
            country: market === 'ethiopia' ? 'Ethiopia' : '',
            budget: '',
        });
        setServiceError(false);
        setMarketError(false);
    };

    const toggleService = (key: string) => {
        const selected = form.data.service_interests;
        if (selected.includes(key)) {
            form.setData('service_interests', selected.filter((service) => service !== key));
            setServiceError(false);
        } else if (selected.length < 5) {
            form.setData('service_interests', [...selected, key]);
            setServiceError(false);
        } else {
            setServiceError(true);
        }
    };

    const goNext = () => {
        const activeFields = formElement.current?.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
            '[data-current-step] [required]',
        );
        if (activeFields && !Array.from(activeFields).every((field) => field.reportValidity())) return;
        if (step === 0 && (form.data.service_interests.length === 0 || !form.data.market)) {
            setServiceError(form.data.service_interests.length === 0);
            setMarketError(!form.data.market);
            return;
        }
        if (settings.analytics_funnel_id) {
            trackFunnelEvent(settings.analytics_funnel_id, 'form_step', {
                formId: 'client-acquisition',
                metadata: {
                    step: String(step + 1),
                    market: form.data.market,
                    services: form.data.service_interests.join(','),
                },
            });
        }
        setStep((current) => Math.min(current + 1, 2));
    };

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.transform((data) => ({
            ...data,
            session_id: funnelSessionId(),
            attribution: currentAttribution(),
            social_links: data.social_links.filter((url) => url.trim() !== ''),
        }));
        form.post(route('client-acquisition.store'), {
            preserveScroll: true,
            onError: (errors) => {
                if (errors.market || errors.country || errors.service_interests || errors['service_interests.0']) setStep(0);
                else if (errors.project_description || errors.budget || errors.timeline || errors.website || errors['social_links.0']) setStep(1);
            },
        });
    };

    const contentTitle = (item: LocalizedContent) => localized(isAmharic ? item.title_am : item.title_en) || item.title_en;
    const contentSummary = (item: LocalizedContent) => localized(isAmharic ? item.summary_am : item.summary_en) || item.summary_en || '';

    return (
        <PublicLayout>
            <Head title={`${t('nav')} | Hailab`}>
                <meta name="description" content={t('intro')} />
            </Head>
            <main className="overflow-hidden">
                <section className="relative isolate border-b border-border bg-gradient-to-br from-background via-background to-primary/10">
                    <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_20%,oklch(0.7_0.16_55_/_0.14),transparent_38%)]" />
                    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8 lg:py-28">
                        <div>
                            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold tracking-wide text-primary uppercase">
                                <Sparkles className="h-3.5 w-3.5" /> {t('eyebrow')}
                            </p>
                            <h1 className="max-w-3xl text-4xl leading-tight font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">{t('headline')}</h1>
                            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">{t('intro')}</p>
                            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                                <Button size="lg" onClick={() => {
                                    trackFormStart();
                                    formSection.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }}>
                                    {t('nav')} <ArrowRight className="h-4 w-4" />
                                </Button>
                                <Button asChild size="lg" variant="outline">
                                    <Link href={route('portfolio.index')}>{t('work_title')} <ArrowDown className="h-4 w-4" /></Link>
                                </Button>
                            </div>
                            <p className="mt-5 text-sm text-muted-foreground">
                                {isAmharic ? 'የኢትዮጵያ እና ዓለም አቀፍ ፕሮጀክቶችን እንቀበላለን።' : 'For businesses in Ethiopia and international markets.'}
                            </p>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            {settings.services.slice(0, 4).map((service, index) => {
                                const Icon = serviceIcons[index % serviceIcons.length];
                                const label = isAmharic ? service.label_am || service.label_en : service.label_en;
                                return (
                                    <article key={service.key} className={`rounded-2xl border border-border bg-card/90 p-5 shadow-sm backdrop-blur ${index === 0 ? 'sm:translate-y-6' : ''}`}>
                                        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
                                        <h2 className="font-semibold text-foreground">{label}</h2>
                                        <p className="mt-2 text-sm text-muted-foreground">{isAmharic ? 'ከንግድ ግቦችዎ ጋር የተስማማ ብጁ መፍትሄ።' : 'A tailored engagement shaped around your business goals.'}</p>
                                    </article>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <section className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:px-8 lg:py-20">
                    <div>
                        <p className="text-sm font-semibold tracking-wide text-primary uppercase">{isAmharic ? 'አገልግሎቶች' : 'What we do'}</p>
                        <h2 className="mt-3 text-3xl font-bold tracking-tight">{isAmharic ? 'ሶፍትዌር፣ AI እና ዲጂታል ይዘት' : 'Software, AI, and digital content'}</h2>
                        <p className="mt-4 leading-7 text-muted-foreground">{isAmharic ? 'ለድርጅቶች የድር መተግበሪያዎችን፣ አውቶሜሽንን እና የይዘት አገልግሎቶችን እናቀርባለን።' : 'A practical mix of engineering and content work, from a focused landing page to a custom software system or ongoing production support.'}</p>
                        <div className="mt-6 flex flex-wrap gap-2">
                            {['Laravel', 'React', 'Next.js', 'Node.js', 'Python', 'AI', 'n8n', 'API integrations'].map((technology) => (
                                <span key={technology} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground">{technology}</span>
                            ))}
                        </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {services.length > 0 ? services.map((service) => (
                            <article key={service.slug ?? service.title_en} className="rounded-xl border border-border bg-card p-5">
                                <h3 className="font-semibold">{contentTitle(service)}</h3>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">{contentSummary(service)}</p>
                            </article>
                        )) : settings.services.slice(0, 4).map((service) => (
                            <article key={service.key} className="rounded-xl border border-border bg-card p-5">
                                <h3 className="font-semibold">{isAmharic ? service.label_am || service.label_en : service.label_en}</h3>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">{isAmharic ? 'ዝርዝሮችን እና መስፈርቶችን ከፕሮጀክትዎ ጋር እናስማማለን።' : 'Scope and requirements are agreed together for each project.'}</p>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="border-y border-border bg-muted/30">
                    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <div><p className="text-sm font-semibold tracking-wide text-primary uppercase">{isAmharic ? 'ፖርትፎሊዮ' : 'Portfolio'}</p><h2 className="mt-2 text-3xl font-bold">{t('work_title')}</h2></div>
                            <Link href={route('portfolio.index')} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">{isAmharic ? 'ሁሉንም ይመልከቱ' : 'View all work'} <ArrowRight className="h-4 w-4" /></Link>
                        </div>
                        {projects.length ? (
                            <div className="mt-8 grid gap-5 md:grid-cols-3">
                                {projects.map((project) => (
                                    <Link key={project.slug ?? project.title_en} href={route('portfolio.show', project.slug)} className="group overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg">
                                        {project.cover_image && <img src={project.cover_image} alt="" className="aspect-[16/10] w-full object-cover" loading="lazy" />}
                                        <div className="p-5"><h3 className="font-semibold group-hover:text-primary">{contentTitle(project)}</h3><p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{contentSummary(project)}</p>
                                            {project.technologies?.length ? <p className="mt-4 text-xs text-muted-foreground">{project.technologies.slice(0, 4).join(' · ')}</p> : null}
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : <p className="mt-8 rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{t('work_empty')}</p>}
                    </div>
                </section>

                <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold">{t('process_title')}</h2>
                    <div className="mt-8 grid gap-5 md:grid-cols-3">
                        {[1, 2, 3].map((number) => (
                            <article key={number} className="rounded-xl border border-border bg-card p-6">
                                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{number}</span>
                                <h3 className="mt-5 font-semibold">{t(`process_${number}_title`)}</h3>
                                <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(`process_${number}`)}</p>
                            </article>
                        ))}
                    </div>
                </section>

                {testimonials.length > 0 && (
                    <section className="border-y border-border bg-muted/30">
                        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                            <h2 className="text-3xl font-bold">{t('testimonials_title')}</h2>
                            <div className="mt-8 grid gap-5 md:grid-cols-3">
                                {testimonials.map((testimonial) => (
                                    <blockquote key={testimonial.id ?? testimonial.title_en} className="rounded-xl border border-border bg-card p-6">
                                        <p className="text-sm leading-7 text-muted-foreground">“{contentSummary(testimonial)}”</p>
                                        <footer className="mt-5 border-t border-border pt-4 text-sm">
                                            <p className="font-semibold">{isAmharic ? testimonial.person_name_am || testimonial.person_name_en : testimonial.person_name_en}</p>
                                            <p className="text-xs text-muted-foreground">{isAmharic ? testimonial.person_role_am || testimonial.person_role_en : testimonial.person_role_en}{testimonial.company_en ? ` · ${isAmharic ? testimonial.company_am || testimonial.company_en : testimonial.company_en}` : ''}</p>
                                        </footer>
                                    </blockquote>
                                ))}
                            </div>
                        </div>
                    </section>
                )}

                <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
                    <h2 className="text-3xl font-bold">{t('faq_title')}</h2>
                    <div className="mt-6 divide-y divide-border rounded-xl border border-border bg-card px-5">
                        {[
                            ['faq_budget_title', 'faq_budget'],
                            ['faq_outcomes_title', 'faq_outcomes'],
                            ['faq_market_title', 'faq_market'],
                        ].map(([question, answer]) => (
                            <details key={question} className="py-5">
                                <summary className="cursor-pointer font-semibold">{t(question)}</summary>
                                <p className="mt-3 text-sm leading-6 text-muted-foreground">{t(answer)}</p>
                            </details>
                        ))}
                    </div>
                </section>

                <section id="project-request" className="scroll-mt-20 border-t border-border bg-gray-950 text-white">
                    <div ref={formSection} className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:px-8 lg:py-20">
                        <div className="lg:sticky lg:top-24 lg:self-start">
                            <p className="text-sm font-semibold tracking-wide text-orange-400 uppercase">{t('nav')}</p>
                            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">{t('form_title')}</h2>
                            <p className="mt-4 leading-7 text-gray-300">{isAmharic ? 'ጥያቄዎን ለመገምገም የሚያስፈልገውን ብቻ ያካፍሉ።' : 'Share only what is needed to review your project and suggest a useful next step.'}</p>
                            {settings.response_time_hours && <p className="mt-5 rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-gray-200">{t('response_window').replace(':hours', String(settings.response_time_hours))}</p>}
                            <div className="mt-7 flex items-center gap-2 text-xs text-gray-400"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> {isAmharic ? 'ግልጽ ስምምነት ሳይኖር የግብይት መልዕክት አንልክም።' : 'No marketing messages without separate consent.'}</div>
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-white p-5 text-foreground shadow-2xl sm:p-8">
                            <div className="mb-7">
                                <div className="mb-3 flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>{t('step')} {step + 1} {t('of')} {steps.length}</span><span>{steps[step]}</span></div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
                            </div>
                            <form
                                ref={formElement}
                                onSubmit={submit}
                                onFocusCapture={trackFormStart}
                                className="space-y-6"
                                noValidate
                            >
                                <section data-current-step hidden={step !== 0} className="space-y-6">
                                    <fieldset className="space-y-3">
                                        <legend className="text-sm font-semibold">{t('market_title')}</legend>
                                        <p className="text-xs text-muted-foreground">{t('market_help')}</p>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            {(['ethiopia', 'international'] as const).map((market) => (
                                                <button key={market} type="button" aria-pressed={form.data.market === market} onClick={() => setMarket(market)} className={`rounded-lg border p-4 text-left text-sm font-medium transition-colors ${form.data.market === market ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:bg-muted/60'}`}>
                                                    {t(market)}
                                                </button>
                                            ))}
                                        </div>
                                        {(form.errors.market || marketError) && <p className="text-xs text-destructive">{form.errors.market || t('market_title')}</p>}
                                    </fieldset>
                                    {form.data.market && (
                                        <label className="block space-y-2 text-sm font-medium">
                                            {t('country')}
                                            {form.data.market === 'ethiopia' ? (
                                                <input value="Ethiopia" readOnly className="w-full rounded-lg border border-border bg-muted px-3 py-2.5" />
                                            ) : (
                                                <input required data-current-step-field value={form.data.country} onChange={(event) => form.setData('country', event.target.value)} placeholder={t('country_placeholder')} className="w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-primary" />
                                            )}
                                            {form.errors.country && <span className="block text-xs font-normal text-destructive">{form.errors.country}</span>}
                                        </label>
                                    )}
                                    <fieldset className="space-y-3">
                                        <legend className="text-sm font-semibold">{t('services_title')}</legend>
                                        <p className="text-xs text-muted-foreground">{t('services_help')}</p>
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {settings.services.map((service) => {
                                                const selected = form.data.service_interests.includes(service.key);
                                                return (
                                                    <button key={service.key} type="button" aria-pressed={selected} onClick={() => toggleService(service.key)} className={`flex items-start gap-3 rounded-lg border p-3 text-left text-sm transition-colors ${selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/60'}`}>
                                                        <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground'}`}>{selected && <Check className="h-3 w-3" />}</span>
                                                        {isAmharic ? service.label_am || service.label_en : service.label_en}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {(serviceError || form.errors.service_interests) && <p className="text-xs text-destructive">{form.errors.service_interests || t('services_required')}</p>}
                                    </fieldset>
                                </section>

                                <section data-current-step hidden={step !== 1} className="space-y-5">
                                    <label className="block space-y-2 text-sm font-medium">
                                        {t('company')}
                                        <input value={form.data.business_name} onChange={(event) => form.setData('business_name', event.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5" />
                                    </label>
                                    <label className="block space-y-2 text-sm font-medium">
                                        {t('project_description')}
                                        <textarea required minLength={30} maxLength={5000} rows={5} value={form.data.project_description} onChange={(event) => form.setData('project_description', event.target.value)} placeholder={t('project_description_help')} className="w-full rounded-lg border border-border bg-background px-3 py-2.5" />
                                        <span className="block text-xs font-normal text-muted-foreground">{t('project_description_help')}</span>
                                        {form.errors.project_description && <span className="block text-xs font-normal text-destructive">{form.errors.project_description}</span>}
                                    </label>
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <label className="space-y-2 text-sm font-medium">
                                            {t('budget')}
                                            <select required value={form.data.budget} onChange={(event) => form.setData('budget', event.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5">
                                                <option value="">{t('choose_range')}</option>
                                                {budgets.map((budget) => <option key={budget.key} value={budget.key}>{isAmharic ? budget.label_am || budget.label_en : budget.label_en}</option>)}
                                            </select>
                                            <span className="block text-xs font-normal text-muted-foreground">{t('budget_help')}</span>
                                            {form.errors.budget && <span className="block text-xs font-normal text-destructive">{form.errors.budget}</span>}
                                        </label>
                                        <label className="space-y-2 text-sm font-medium">
                                            {t('timeline')}
                                            <select required value={form.data.timeline} onChange={(event) => form.setData('timeline', event.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5">
                                                <option value="">{t('choose_range')}</option>
                                                {settings.timelines.map((timeline) => <option key={timeline.key} value={timeline.key}>{isAmharic ? timeline.label_am || timeline.label_en : timeline.label_en}</option>)}
                                            </select>
                                            {form.errors.timeline && <span className="block text-xs font-normal text-destructive">{form.errors.timeline}</span>}
                                        </label>
                                    </div>
                                    <label className="block space-y-2 text-sm font-medium">{t('website')}<input type="url" value={form.data.website} onChange={(event) => form.setData('website', event.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5" placeholder="https://" />{form.errors.website && <span className="block text-xs font-normal text-destructive">{form.errors.website}</span>}</label>
                                    <fieldset className="space-y-2">
                                        <legend className="text-sm font-medium">{t('social_links')}</legend>
                                        {form.data.social_links.map((url, index) => <input key={index} type="url" value={url} onChange={(event) => form.setData('social_links', form.data.social_links.map((value, current) => current === index ? event.target.value : value))} aria-label={`${t('social_links')} ${index + 1}`} className="w-full rounded-lg border border-border bg-background px-3 py-2.5" placeholder="https://" />)}
                                    </fieldset>
                                    <label className="block space-y-2 text-sm font-medium">{t('additional')}<textarea rows={3} maxLength={3000} value={form.data.additional_requirements} onChange={(event) => form.setData('additional_requirements', event.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5" /></label>
                                </section>

                                <section data-current-step hidden={step !== 2} className="space-y-5">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <label className="space-y-2 text-sm font-medium">{t('name')}<input required autoComplete="name" value={form.data.name} onChange={(event) => form.setData('name', event.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5" />{form.errors.name && <span className="block text-xs font-normal text-destructive">{form.errors.name}</span>}</label>
                                        <label className="space-y-2 text-sm font-medium">{t('email')}<input required type="email" autoComplete="email" value={form.data.email} onChange={(event) => form.setData('email', event.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5" />{form.errors.email && <span className="block text-xs font-normal text-destructive">{form.errors.email}</span>}</label>
                                    </div>
                                    <label className="block space-y-2 text-sm font-medium">{t('phone')}<input type="tel" autoComplete="tel" value={form.data.phone} onChange={(event) => form.setData('phone', event.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2.5" />{form.errors.phone && <span className="block text-xs font-normal text-destructive">{form.errors.phone}</span>}</label>
                                    <label className="block space-y-2 text-sm font-medium">{t('preferred_contact')}<select required value={form.data.preferred_contact} onChange={(event) => form.setData('preferred_contact', event.target.value as AcquisitionForm['preferred_contact'])} className="w-full rounded-lg border border-border bg-background px-3 py-2.5"><option value="email">{t('contact_email')}</option><option value="phone">{t('contact_phone')}</option><option value="whatsapp">{t('contact_whatsapp')}</option></select></label>
                                    <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={form.data.marketing_consent} onChange={(event) => form.setData('marketing_consent', event.target.checked)} className="mt-1 h-4 w-4 rounded border-border accent-primary" /><span>{t('marketing_consent')}</span></label>
                                    <p className="text-xs leading-5 text-muted-foreground">{t('privacy')}</p>
                                </section>

                                {form.hasErrors && <p role="alert" className="text-sm text-destructive">{t('form_error')}</p>}
                                <div className="flex flex-col-reverse justify-between gap-3 border-t border-border pt-5 sm:flex-row">
                                    {step > 0 ? <Button type="button" variant="outline" onClick={() => setStep((current) => Math.max(0, current - 1))}><ArrowLeft className="h-4 w-4" /> {t('back')}</Button> : <span />}
                                    {step < 2 ? (
                                        <Button type="button" onClick={goNext}>{t('next')} <ArrowRight className="h-4 w-4" /></Button>
                                    ) : (
                                        <Button type="submit" disabled={form.processing}>{form.processing ? t('submitting') : t('submit')} {!form.processing && <ArrowRight className="h-4 w-4" />}</Button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>
                </section>
            </main>
        </PublicLayout>
    );
}
