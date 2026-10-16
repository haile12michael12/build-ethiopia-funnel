import PublicLayout from '@/layouts/public-layout';
import { type SharedData } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

interface ThankYouPageProps {
    request: {
        name: string;
        email: string;
        business_name: string | null;
        market: string | null;
        country: string | null;
        service_interests: string[];
        project_description: string | null;
        budget: string | null;
        timeline: string | null;
    };
    labels: {
        services: Record<string, string>;
        budgets: Record<string, string>;
        timelines: Record<string, string>;
    };
    nextSteps: {
        response_time_hours: number | null;
        response_email: string | null;
        whatsapp_url: string | null;
        meeting_url: string | null;
    };
}

export default function ClientAcquisitionThankYou({ request, labels, nextSteps }: ThankYouPageProps) {
    const { locale } = usePage<SharedData>().props;
    const am = locale === 'am';

    return (
        <PublicLayout>
            <Head title={am ? 'ጥያቄዎ ደርሶናል | Hailab' : 'Project request received | Hailab'} />
            <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
                <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                        <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
                    </div>
                    <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
                        {am ? 'የፕሮጀክት ጥያቄዎ ደርሶናል' : 'Your project request is in'}
                    </h1>
                    <p className="mt-3 text-muted-foreground">
                        {am
                            ? `እናመሰግናለን ${request.name}። በ${request.email} እናገኝዎታለን።`
                            : `Thanks, ${request.name}. We’ll follow up at ${request.email}.`}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                        {am ? 'ይህ የጥያቄ ማረጋገጫ ነው፤ የተያዘ ቀጠሮ አይደለም።' : 'This confirms receipt only; it is not a booked meeting or a project quote.'}
                        {nextSteps.response_time_hours && (
                            <>
                                {' '}
                                {am
                                    ? `በግምት ${nextSteps.response_time_hours} ሰዓታት ውስጥ ምላሽ እንጠብቃለን።`
                                    : `We aim to respond within ${nextSteps.response_time_hours} hours.`}
                            </>
                        )}
                    </p>

                    <dl className="mt-8 grid gap-4 rounded-xl border border-border bg-background/60 p-4 text-sm sm:grid-cols-2">
                        {request.business_name && (
                            <div>
                                <dt className="text-muted-foreground">{am ? 'ድርጅት' : 'Business'}</dt>
                                <dd className="mt-1 font-medium text-foreground">{request.business_name}</dd>
                            </div>
                        )}
                        {request.market && (
                            <div>
                                <dt className="text-muted-foreground">{am ? 'ገበያ' : 'Market'}</dt>
                                <dd className="mt-1 font-medium text-foreground capitalize">
                                    {request.market} · {request.country}
                                </dd>
                            </div>
                        )}
                        {request.service_interests.length > 0 && (
                            <div>
                                <dt className="text-muted-foreground">{am ? 'አገልግሎቶች' : 'Services'}</dt>
                                <dd className="mt-1 font-medium text-foreground">
                                    {request.service_interests.map((key) => labels.services[key] || key).join(', ')}
                                </dd>
                            </div>
                        )}
                        {request.budget && (
                            <div>
                                <dt className="text-muted-foreground">{am ? 'የበጀት ክልል' : 'Planning budget'}</dt>
                                <dd className="mt-1 font-medium text-foreground">{labels.budgets[request.budget] || request.budget}</dd>
                            </div>
                        )}
                        {request.timeline && (
                            <div>
                                <dt className="text-muted-foreground">{am ? 'የጊዜ ሰሌዳ' : 'Timeline'}</dt>
                                <dd className="mt-1 font-medium text-foreground">{labels.timelines[request.timeline] || request.timeline}</dd>
                            </div>
                        )}
                    </dl>

                    {request.project_description && (
                        <div className="mt-5">
                            <h2 className="text-sm font-semibold text-foreground">{am ? 'የፕሮጀክት ማጠቃለያ' : 'Project summary'}</h2>
                            <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-muted-foreground">{request.project_description}</p>
                        </div>
                    )}

                    <div className="mt-8 flex flex-wrap gap-3">
                        {nextSteps.meeting_url && (
                            <a
                                href={nextSteps.meeting_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                            >
                                {am ? 'የምክክር ጊዜ ይጠይቁ' : 'Request a consultation time'} <ArrowRight className="h-4 w-4" />
                            </a>
                        )}
                        {nextSteps.whatsapp_url && (
                            <a
                                href={nextSteps.whatsapp_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center rounded-md border border-border px-4 py-2.5 text-sm font-medium text-foreground"
                            >
                                {am ? 'በWhatsApp ያግኙን' : 'Continue on WhatsApp'}
                            </a>
                        )}
                        {nextSteps.response_email && (
                            <a
                                href={`mailto:${nextSteps.response_email}`}
                                className="inline-flex items-center rounded-md border border-border px-4 py-2.5 text-sm font-medium text-foreground"
                            >
                                {am ? 'ኢሜይል ይላኩ' : 'Email us'}
                            </a>
                        )}
                        <Link
                            href={route('home')}
                            className="inline-flex items-center rounded-md border border-border px-4 py-2.5 text-sm font-medium text-foreground"
                        >
                            {am ? 'ወደ መነሻ ገጽ' : 'Back to home'}
                        </Link>
                    </div>
                </section>
            </main>
        </PublicLayout>
    );
}
