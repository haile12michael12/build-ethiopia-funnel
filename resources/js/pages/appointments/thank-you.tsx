import PublicLayout from '@/layouts/public-layout';
import { type SharedData } from '@/types';
import type { AppointmentThankYouPageProps } from '@/types/appointment';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, CheckCircle2, Copy } from 'lucide-react';
import { useState } from 'react';

export default function AppointmentThankYou({ appointment, nextSteps }: AppointmentThankYouPageProps) {
    const { locale } = usePage<SharedData>().props;
    const am = locale === 'am';
    const [copied, setCopied] = useState(false);

    const details = [
        { labelEn: 'Company', labelAm: 'ድርጅት', value: appointment.company_name },
        { labelEn: 'Contact', labelAm: 'ተጠራጭ', value: appointment.contact_name },
        { labelEn: 'Service', labelAm: 'አገልግሎት', value: appointment.service_label },
        { labelEn: 'Meeting type', labelAm: 'የስብሰባ አይነት', value: appointment.meeting_type_label },
        { labelEn: 'Date and time', labelAm: 'ቀን እና ሰዓት', value: `${appointment.start_display} (${appointment.timezone})` },
        { labelEn: 'Duration', labelAm: 'ጊዜ ርዝመት', value: `${appointment.duration_minutes} min` },
        { labelEn: 'Email', labelAm: 'ኢሜይል', value: appointment.email },
        ...(appointment.phone ? [{ labelEn: 'Phone', labelAm: 'ስልክ', value: appointment.phone }] : []),
    ];

    const copyDetails = () => {
        const text = [
            appointment.company_name,
            appointment.contact_name,
            appointment.email,
            appointment.phone,
            `${appointment.service_label} · ${appointment.meeting_type_label}`,
            `${appointment.start_display} (${appointment.timezone})`,
            appointment.notes ?? '',
        ]
            .filter(Boolean)
            .join('\n');

        navigator.clipboard?.writeText(text).then(() => setCopied(true));
    };

    return (
        <PublicLayout>
            <Head title={am ? 'የስብሰባ ጊዜ አረጋገጫ | Hailab' : 'Appointment confirmed | Hailab'} />
            <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
                <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-10">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                        <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
                    </div>
                    <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
                        {am ? 'የስብሰባ ጊዜዎ ተመዝግቧል' : 'Your appointment is booked'}
                    </h1>
                    <p className="mt-3 text-muted-foreground">
                        {am
                            ? `እናመሰግናለን ${appointment.contact_name}። እባክዎ የስብሰባ ዝርዝሮችን ይቆየዎት።`
                            : `Thanks, ${appointment.contact_name}. Keep this confirmation for your meeting details.`}
                    </p>

                    <div className="mt-6 flex flex-wrap items-center gap-3">
                        <button
                            type="button"
                            onClick={copyDetails}
                            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium"
                        >
                            <Copy className="h-4 w-4" /> {copied ? (am ? 'ተቆይቷል' : 'Copied') : am ? 'ዝርዝሮችን ይቆዩ' : 'Copy details'}
                        </button>
                        <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary capitalize">
                            {appointment.status}
                        </span>
                    </div>

                    <dl className="mt-8 grid gap-4 rounded-xl border border-border bg-background/60 p-4 text-sm sm:grid-cols-2">
                        {details.map((item) => (
                            <div key={item.labelEn}>
                                <dt className="text-muted-foreground">{am ? item.labelAm : item.labelEn}</dt>
                                <dd className="mt-1 font-medium text-foreground">{item.value}</dd>
                            </div>
                        ))}
                    </dl>

                    {appointment.notes && (
                        <div className="mt-5">
                            <h2 className="text-sm font-semibold text-foreground">{am ? 'ማስታወሻ' : 'Notes'}</h2>
                            <p className="mt-2 text-sm leading-6 whitespace-pre-wrap text-muted-foreground">{appointment.notes}</p>
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
                                {am ? 'ወደ ስብሰባ መስመር' : 'Open the meeting room'} <ArrowRight className="h-4 w-4" />
                            </a>
                        )}
                        {nextSteps.whatsapp_url && (
                            <a
                                href={nextSteps.whatsapp_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center rounded-md border border-border px-4 py-2.5 text-sm font-medium"
                            >
                                {am ? 'በWhatsApp ያግኙን' : 'Continue on WhatsApp'}
                            </a>
                        )}
                        {nextSteps.response_email && (
                            <a
                                href={`mailto:${nextSteps.response_email}`}
                                className="inline-flex items-center rounded-md border border-border px-4 py-2.5 text-sm font-medium"
                            >
                                {am ? 'ኢሜይል ይላኩ' : 'Email us'}
                            </a>
                        )}
                        <Link
                            href={route('home')}
                            className="inline-flex items-center rounded-md border border-border px-4 py-2.5 text-sm font-medium"
                        >
                            {am ? 'ወደ መነሻ ገጽ' : 'Back to home'}
                        </Link>
                    </div>
                </section>
            </main>
        </PublicLayout>
    );
}
