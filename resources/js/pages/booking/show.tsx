import SlotPicker, { type SlotSelection } from '@/components/booking/slot-picker';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PublicLayout from '@/layouts/public-layout';
import { detectTimeZone, formatDateLabel, timeZoneAbbreviation, timeZoneOptions } from '@/lib/timezones';
import { Head, useForm } from '@inertiajs/react';
import { Clock, MapPin, ShieldCheck } from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';

interface BookingPageData {
    slug: string;
    title: string;
    description: string | null;
    location: string | null;
    duration_minutes: number;
    timezone: string;
    advance_days: number;
}

interface BookingShowProps {
    page: BookingPageData;
    availableDates: string[];
}

export default function BookingShow({ page, availableDates }: BookingShowProps) {
    const [displayTz, setDisplayTz] = useState(() => detectTimeZone(page.timezone));
    const [slot, setSlot] = useState<SlotSelection | null>(null);

    const form = useForm({
        name: '',
        email: '',
        phone: '',
        notes: '',
        date: '',
        time: '',
        timezone: detectTimeZone(page.timezone),
    });

    const zones = useMemo(() => timeZoneOptions([displayTz, page.timezone]), [displayTz, page.timezone]);

    const chooseSlot = (next: SlotSelection | null) => {
        setSlot(next);
        form.setData((data) => ({
            ...data,
            date: next?.date ?? '',
            time: next?.time ?? '',
        }));
    };

    const chooseTimezone = (tz: string) => {
        setDisplayTz(tz);
        form.setData('timezone', tz);
        chooseSlot(null);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!slot || form.processing) return;
        form.post(route('booking.store', { page: page.slug }), { preserveScroll: true });
    };

    return (
        <PublicLayout>
            <Head title={page.title} />
            <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
                <header className="mb-8">
                    <p className="text-sm font-medium tracking-wide text-primary uppercase">Book an appointment</p>
                    <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground">{page.title}</h1>
                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                            <Clock className="h-4 w-4" /> {page.duration_minutes} min
                        </span>
                        {page.location && (
                            <span className="inline-flex items-center gap-1.5">
                                <MapPin className="h-4 w-4" /> {page.location}
                            </span>
                        )}
                    </div>
                    {page.description && <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">{page.description}</p>}
                </header>

                <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                    <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
                        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                            <h2 className="text-lg font-semibold text-foreground">Choose a time</h2>
                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                Times in
                                <select
                                    value={displayTz}
                                    onChange={(event) => chooseTimezone(event.target.value)}
                                    className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
                                >
                                    {zones.map((zone) => (
                                        <option key={zone} value={zone}>
                                            {zone.replace(/_/g, ' ')}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <SlotPicker slug={page.slug} availableDates={availableDates} displayTz={displayTz} selected={slot} onSelect={chooseSlot} />
                        <p className="mt-4 text-xs text-muted-foreground">
                            All times shown in {displayTz.replace(/_/g, ' ')} ({timeZoneAbbreviation(displayTz)}). Meetings are scheduled on{' '}
                            {page.timezone.replace(/_/g, ' ')} availability.
                        </p>
                        <InputError message={form.errors.time ?? form.errors.date} className="mt-2" />
                    </section>

                    <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
                        <h2 className="text-lg font-semibold text-foreground">Your details</h2>
                        {slot ? (
                            <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
                                {formatDateLabel(slot.date, { weekday: 'long', month: 'long', day: 'numeric' })} at {slot.label}{' '}
                                <span className="text-muted-foreground">({timeZoneAbbreviation(displayTz)})</span>
                            </p>
                        ) : (
                            <p className="mt-2 text-sm text-muted-foreground">Select a day and time first.</p>
                        )}

                        <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
                            <div>
                                <Label htmlFor="booking-name">Full name</Label>
                                <Input
                                    id="booking-name"
                                    value={form.data.name}
                                    onChange={(event) => form.setData('name', event.target.value)}
                                    autoComplete="name"
                                    required
                                    className="mt-1.5"
                                />
                                <InputError message={form.errors.name} className="mt-1" />
                            </div>
                            <div>
                                <Label htmlFor="booking-email">Email</Label>
                                <Input
                                    id="booking-email"
                                    type="email"
                                    value={form.data.email}
                                    onChange={(event) => form.setData('email', event.target.value)}
                                    autoComplete="email"
                                    required
                                    className="mt-1.5"
                                />
                                <InputError message={form.errors.email} className="mt-1" />
                            </div>
                            <div>
                                <Label htmlFor="booking-phone">
                                    Phone <span className="text-muted-foreground">(optional)</span>
                                </Label>
                                <Input
                                    id="booking-phone"
                                    value={form.data.phone}
                                    onChange={(event) => form.setData('phone', event.target.value)}
                                    autoComplete="tel"
                                    placeholder="+251 9XX XXX XXX"
                                    className="mt-1.5"
                                />
                                <InputError message={form.errors.phone} className="mt-1" />
                            </div>
                            <div>
                                <Label htmlFor="booking-notes">
                                    Anything to prepare? <span className="text-muted-foreground">(optional)</span>
                                </Label>
                                <textarea
                                    id="booking-notes"
                                    value={form.data.notes}
                                    onChange={(event) => form.setData('notes', event.target.value)}
                                    rows={3}
                                    className="mt-1.5 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                />
                                <InputError message={form.errors.notes} className="mt-1" />
                            </div>
                            <Button type="submit" disabled={!slot || form.processing} className="w-full">
                                {form.processing ? 'Booking…' : 'Confirm booking'}
                            </Button>
                            <p className="inline-flex items-start gap-1.5 text-xs text-muted-foreground">
                                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                You'll receive a confirmation email with links to reschedule or cancel.
                            </p>
                        </form>
                    </section>
                </div>
            </main>
        </PublicLayout>
    );
}
