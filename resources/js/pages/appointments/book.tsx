import { Button } from '@/components/ui/button';
import { PublicLayout } from '@/layouts/public-layout';
import { type SharedData } from '@/types';
import type { AppointmentBookingPageProps, AppointmentBookingPayload } from '@/types/appointment';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, CalendarClock, Clock, Users } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';

interface AvailabilityResponse {
    slots: string[];
    business_hours: { start: string; end: string };
    slot_minutes: number;
}

const steps = [
    { key: 'details', labelEn: 'Company details', labelAm: 'የድርጅት ዝርዝሮች' },
    { key: 'service', labelEn: 'Service & meeting', labelAm: 'አገልግሎት እና ስብሰባ' },
    { key: 'schedule', labelEn: 'Pick a time', labelAm: 'ጊዜ ይምረጡ' },
    { key: 'confirm', labelEn: 'Confirm', labelAm: 'ያረጋግጡ' },
];

export default function BookAppointmentPage({
    services,
    settings,
    meetingTypes,
    dates,
    responseEmail,
    responseTimeHours,
    whatsappUrl,
    meetingUrl,
}: AppointmentBookingPageProps) {
    const { locale } = usePage<SharedData>().props;
    const am = locale === 'am';

    const [step, setStep] = useState(0);
    const [slots, setSlots] = useState<string[]>([]);
    const [slotsLoading, setSlotsLoading] = useState(false);

    const form = useForm<AppointmentBookingPayload>({
        company_name: '',
        contact_name: '',
        email: '',
        phone: '',
        service_key: '',
        meeting_type: meetingTypes[0]?.key ?? 'demo',
        date: '',
        time: '',
        notes: '',
        market: 'ethiopia',
        country: 'Ethiopia',
    });

    useEffect(() => {
        const date = form.data.date;
        if (!date) {
            setSlots([]);
            return;
        }

        let cancelled = false;
        setSlotsLoading(true);

        fetch(route('appointments.availability', { date }), {
            headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
        })
            .then((response) => (response.ok ? (response.json() as Promise<AvailabilityResponse>) : { slots: [] as string[] }))
            .then((data) => {
                if (cancelled) return;
                setSlots(data.slots ?? []);
            })
            .catch(() => {
                if (!cancelled) setSlots([]);
            })
            .finally(() => {
                if (!cancelled) setSlotsLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [form.data.date]);

    const localizedService = (service: { label_en: string; label_am: string | null }) =>
        am ? service.label_am || service.label_en : service.label_en;

    const localizedMeeting = (meeting: { label_en: string; label_am: string | null }) =>
        am ? meeting.label_am || meeting.label_en : meeting.label_en;

    const goNext = () => {
        setStep((current) => Math.min(current + 1, steps.length - 1));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const goBack = () => {
        setStep((current) => Math.max(current - 1, 0));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.post(route('appointments.store'), {
            preserveScroll: true,
            onError: (errors) => {
                if (errors.company_name || errors.contact_name || errors.email || errors.phone || errors.country) setStep(0);
                else if (errors.service_key || errors.meeting_type) setStep(1);
                else if (errors.date || errors.time) setStep(2);
            },
        });
    };

    return (
        <PublicLayout>
            <Head title={am ? 'የስብሰባ ጊዜ ይጠይቁ | Hailab' : 'Book a demo | Hailab'}>
                <meta name="description" content={am ? 'ለድርጅትዎ የሚስማማ የስብሰባ ጊዜ ይምረጡ።' : 'Pick a time that works for your business.'} />
            </Head>

            <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
                <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-primary uppercase">
                        <CalendarClock className="h-4 w-4" />
                        {am ? 'የመጀመሪያ ስብሰባ የሚያስፈልጋቸው ድርጅቶች' : 'For teams that want to see it working'}
                    </div>
                    <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                        {am ? 'የሶፍትዌር ስራችን በቀጥታ ያሳዩዎት' : 'See our work live, on a call that fits you'}
                    </h1>
                    <p className="mt-3 text-muted-foreground">
                        {am
                            ? 'አንድ የነፃ ስብሰባ ጊዜ ይምረጡ እና ለድርጅትዎ አመቺ መፍትሄ እንወያያለን።'
                            : 'Book a short, focused demo or consultation. No commitments, no invented timelines.'}
                    </p>

                    <ol className="mt-6 flex flex-wrap gap-2">
                        {steps.map((item, index) => (
                            <li
                                key={item.key}
                                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
                                    index <= step ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border text-muted-foreground'
                                }`}
                            >
                                <span
                                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${index <= step ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                                >
                                    {index + 1}
                                </span>
                                {am ? item.labelAm : item.labelEn}
                            </li>
                        ))}
                    </ol>

                    <form onSubmit={submit} className="mt-8 space-y-8">
                        {step === 0 && (
                            <section className="space-y-5">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <label className="space-y-1.5 text-sm font-medium">
                                        {am ? 'የድርጅት ስም' : 'Company name'}
                                        <input
                                            required
                                            maxLength={120}
                                            value={form.data.company_name}
                                            onChange={(event) => form.setData('company_name', event.target.value)}
                                            className="w-full rounded-md border border-border bg-background px-3 py-2"
                                        />
                                    </label>
                                    <label className="space-y-1.5 text-sm font-medium">
                                        {am ? 'ተጠራጭ ስም' : 'Your name'}
                                        <input
                                            required
                                            maxLength={120}
                                            value={form.data.contact_name}
                                            onChange={(event) => form.setData('contact_name', event.target.value)}
                                            className="w-full rounded-md border border-border bg-background px-3 py-2"
                                        />
                                    </label>
                                    <label className="space-y-1.5 text-sm font-medium">
                                        {am ? 'ኢሜይል' : 'Work email'}
                                        <input
                                            required
                                            type="email"
                                            maxLength={255}
                                            value={form.data.email}
                                            onChange={(event) => form.setData('email', event.target.value)}
                                            className="w-full rounded-md border border-border bg-background px-3 py-2"
                                        />
                                    </label>
                                    <label className="space-y-1.5 text-sm font-medium">
                                        {am ? 'ስልክ ቁጥር (አይብሎት)' : 'Phone number (optional)'}
                                        <input
                                            type="tel"
                                            maxLength={50}
                                            value={form.data.phone}
                                            onChange={(event) => form.setData('phone', event.target.value)}
                                            className="w-full rounded-md border border-border bg-background px-3 py-2"
                                        />
                                    </label>
                                    <label className="space-y-1.5 text-sm font-medium">
                                        {am ? 'ገበያ' : 'Market'}
                                        <select
                                            value={form.data.market}
                                            onChange={(event) => {
                                                const market = event.target.value as 'ethiopia' | 'international';
                                                form.setData({ ...form.data, market, country: market === 'ethiopia' ? 'Ethiopia' : '' });
                                            }}
                                            className="w-full rounded-md border border-border bg-background px-3 py-2"
                                        >
                                            <option value="ethiopia">{am ? 'ኢትዮጵያ' : 'Ethiopia'}</option>
                                            <option value="international">{am ? 'ዓለም አቀፍ' : 'International'}</option>
                                        </select>
                                    </label>
                                    {form.data.market === 'international' && (
                                        <label className="space-y-1.5 text-sm font-medium">
                                            {am ? 'ሀገር (አይብሎት)' : 'Country (optional)'}
                                            <input
                                                maxLength={80}
                                                value={form.data.country}
                                                onChange={(event) => form.setData('country', event.target.value)}
                                                className="w-full rounded-md border border-border bg-background px-3 py-2"
                                            />
                                        </label>
                                    )}
                                </div>
                            </section>
                        )}

                        {step === 1 && (
                            <section className="space-y-6">
                                <div>
                                    <h2 className="text-sm font-semibold text-foreground">{am ? 'አገልግሎት' : 'What do you need?'}</h2>
                                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                        {services.map((service) => (
                                            <button
                                                type="button"
                                                key={service.key}
                                                onClick={() => form.setData('service_key', service.key)}
                                                className={`rounded-xl border p-4 text-left text-sm transition-colors ${
                                                    form.data.service_key === service.key
                                                        ? 'border-primary bg-primary/5 text-foreground'
                                                        : 'border-border bg-background text-muted-foreground hover:border-primary/40'
                                                }`}
                                            >
                                                <span className="font-medium text-foreground">{localizedService(service)}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h2 className="text-sm font-semibold text-foreground">{am ? 'የስብሰባ አይነት' : 'Meeting type'}</h2>
                                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                                        {meetingTypes.map((meeting) => (
                                            <button
                                                type="button"
                                                key={meeting.key}
                                                onClick={() => form.setData('meeting_type', meeting.key)}
                                                className={`rounded-xl border p-4 text-left text-sm transition-colors ${
                                                    form.data.meeting_type === meeting.key
                                                        ? 'border-primary bg-primary/5 text-foreground'
                                                        : 'border-border bg-background text-muted-foreground hover:border-primary/40'
                                                }`}
                                            >
                                                {localizedMeeting(meeting)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        )}

                        {step === 2 && (
                            <section className="space-y-6">
                                <div>
                                    <h2 className="text-sm font-semibold text-foreground">{am ? 'ቀን ይምረጡ' : 'Choose a date'}</h2>
                                    <input
                                        type="date"
                                        required
                                        min={dates[0]}
                                        max={dates[dates.length - 1]}
                                        value={form.data.date}
                                        onChange={(event) => {
                                            form.setData('date', event.target.value);
                                            form.setData('time', '');
                                        }}
                                        className="mt-3 w-full max-w-xs rounded-md border border-border bg-background px-3 py-2"
                                    />
                                    <p className="mt-2 text-xs text-muted-foreground">
                                        {am ? 'የስራ ሰዓታት፦ ' : 'Business hours: '}
                                        {settings.business_hours.start}–{settings.business_hours.end} · {settings.timezone}
                                    </p>
                                </div>

                                <div>
                                    <h2 className="text-sm font-semibold text-foreground">{am ? 'ሰዓት ይምረጡ' : 'Choose a time'}</h2>
                                    {slotsLoading ? (
                                        <p className="mt-3 text-sm text-muted-foreground">{am ? 'ማውጣት ላይ…' : 'Loading availability…'}</p>
                                    ) : slots.length === 0 ? (
                                        <p className="mt-3 rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                                            {am ? 'ለተመረጠው ቀን የሚገባ ሰዓት የለም። አንድ ቀን ይሞክሩ።' : 'No available times on this date. Try another day.'}
                                        </p>
                                    ) : (
                                        <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                            {slots.map((slot) => (
                                                <button
                                                    type="button"
                                                    key={slot}
                                                    onClick={() => form.setData('time', slot)}
                                                    className={`rounded-lg border py-2.5 text-sm transition-colors ${
                                                        form.data.time === slot
                                                            ? 'border-primary bg-primary/10 font-semibold text-primary'
                                                            : 'border-border bg-background text-muted-foreground hover:border-primary/40'
                                                    }`}
                                                >
                                                    {slot}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}

                        {step === 3 && (
                            <section className="space-y-5">
                                <div className="rounded-xl border border-border bg-background/60 p-5">
                                    <h2 className="text-sm font-semibold text-foreground">{am ? 'ማረጋገጫ' : 'Review your booking'}</h2>
                                    <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                                        <div>
                                            <dt className="text-muted-foreground">{am ? 'ድርጅት' : 'Company'}</dt>
                                            <dd className="mt-1 font-medium">{form.data.company_name}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-muted-foreground">{am ? 'አገልግሎት' : 'Service'}</dt>
                                            <dd className="mt-1 font-medium">
                                                {localizedService(services.find((service) => service.key === form.data.service_key) ?? services[0])}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-muted-foreground">{am ? 'ስብሰባ' : 'Meeting'}</dt>
                                            <dd className="mt-1 font-medium">
                                                {localizedMeeting(
                                                    meetingTypes.find((meeting) => meeting.key === form.data.meeting_type) ?? meetingTypes[0],
                                                )}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-muted-foreground">{am ? 'ቀን እና ሰዓት' : 'Date and time'}</dt>
                                            <dd className="mt-1 font-medium">
                                                {form.data.date} {form.data.time} · {settings.timezone}
                                            </dd>
                                        </div>
                                    </dl>
                                </div>

                                <label className="space-y-1.5 text-sm font-medium">
                                    {am ? 'ተጨማሪ ማስታወሻ (አይብሎት)' : 'Anything else we should know? (optional)'}
                                    <textarea
                                        maxLength={2000}
                                        value={form.data.notes}
                                        onChange={(event) => form.setData('notes', event.target.value)}
                                        className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2"
                                    />
                                </label>

                                <label className="flex items-start gap-3 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={form.data.marketing_consent}
                                        onChange={(event) => form.setData('marketing_consent', event.target.checked)}
                                        className="mt-0.5 h-4 w-4 accent-primary"
                                    />
                                    <span className="text-muted-foreground">
                                        {am ? 'የማሰራጫ ፍቃድ ለስላሳ ትብብር ያስጨፍሩ።' : 'I agree to be contacted about this request.'}
                                    </span>
                                </label>
                            </section>
                        )}

                        <div className="flex items-center justify-between border-t border-border pt-5">
                            <Button type="button" variant="ghost" onClick={goBack} disabled={step === 0}>
                                <ArrowLeft className="h-4 w-4" /> {am ? 'ኋላ' : 'Back'}
                            </Button>
                            {step < steps.length - 1 ? (
                                <Button
                                    type="button"
                                    onClick={goNext}
                                    disabled={
                                        (step === 0 && (!form.data.company_name || !form.data.contact_name || !form.data.email)) ||
                                        (step === 1 && !form.data.service_key) ||
                                        (step === 2 && (!form.data.date || !form.data.time))
                                    }
                                >
                                    {am ? 'ቀጣይ' : 'Continue'} <ArrowRight className="h-4 w-4" />
                                </Button>
                            ) : (
                                <Button type="submit" disabled={form.processing}>
                                    {form.processing ? '…' : am ? 'ጊዜ ያሳድጉ' : 'Confirm appointment'}
                                </Button>
                            )}
                        </div>
                    </form>

                    {(responseEmail || whatsappUrl || meetingUrl) && (
                        <div className="mt-8 flex flex-wrap gap-3 border-t border-border pt-6">
                            {meetingUrl && (
                                <a
                                    href={meetingUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                                >
                                    {am ? 'የስብሰባ ጊዜ ይጠይቁ' : 'Request a meeting time'} <ArrowRight className="h-4 w-4" />
                                </a>
                            )}
                            {whatsappUrl && (
                                <a
                                    href={whatsappUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center rounded-md border border-border px-4 py-2.5 text-sm font-medium"
                                >
                                    {am ? 'በWhatsApp ያግኙን' : 'Continue on WhatsApp'}
                                </a>
                            )}
                            {responseEmail && (
                                <a
                                    href={`mailto:${responseEmail}`}
                                    className="inline-flex items-center rounded-md border border-border px-4 py-2.5 text-sm font-medium"
                                >
                                    {am ? 'ኢሜይል ይላኩ' : 'Email us'}
                                </a>
                            )}
                            <Link
                                href={route('client-acquisition.show')}
                                className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium"
                            >
                                <Users className="h-4 w-4" /> {am ? 'ሙሉ የፕሮጀክት ጥያቄ' : 'Full project request'}
                            </Link>
                        </div>
                    )}

                    {responseTimeHours && (
                        <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            {am ? `በግምት ${responseTimeHours} ሰዓታት ውስጥ ምላሽ እንጠብቃለን።` : `We aim to respond within ${responseTimeHours} hours.`}
                        </p>
                    )}
                </section>
            </main>
        </PublicLayout>
    );
}
