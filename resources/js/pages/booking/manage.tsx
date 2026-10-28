import SlotPicker, { type SlotSelection } from '@/components/booking/slot-picker';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import PublicLayout from '@/layouts/public-layout';
import { detectTimeZone, formatDateLabel, timeZoneAbbreviation, timeZoneOptions } from '@/lib/timezones';
import type { SharedData } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { Ban, CalendarClock, CheckCircle2, XCircle } from 'lucide-react';
import { useMemo, useState } from 'react';

interface ManageBooking {
    uuid: string;
    token: string;
    status: 'confirmed' | 'cancelled' | 'completed' | 'no_show';
    name: string;
    email: string;
    date_display: string;
    time_display: string;
    tz_label: string;
    can_change: boolean;
}

interface BookingManageProps {
    page: {
        slug: string;
        title: string;
        location: string | null;
        duration_minutes: number;
        timezone: string;
    };
    booking: ManageBooking;
    availableDates: string[];
}

export default function BookingManage({ page, booking, availableDates }: BookingManageProps) {
    const { flash } = usePage<SharedData>().props as { flash?: { success?: string | null } };
    const [displayTz, setDisplayTz] = useState(() => detectTimeZone(page.timezone));
    const [slot, setSlot] = useState<SlotSelection | null>(null);
    const [confirmingCancel, setConfirmingCancel] = useState(false);

    const rescheduleForm = useForm({
        date: '',
        time: '',
        timezone: detectTimeZone(page.timezone),
    });
    const cancelForm = useForm({ reason: '' });

    const zones = useMemo(() => timeZoneOptions([displayTz, page.timezone]), [displayTz, page.timezone]);

    const chooseSlot = (next: SlotSelection | null) => {
        setSlot(next);
        rescheduleForm.setData((data) => ({
            ...data,
            date: next?.date ?? '',
            time: next?.time ?? '',
        }));
    };

    const bookingParams = { booking: booking.uuid, token: booking.token };

    return (
        <PublicLayout>
            <Head title="Manage booking" />
            <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
                {flash?.success && (
                    <div className="mb-6 rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-300">
                        {flash.success}
                    </div>
                )}

                <header className="mb-6">
                    <p className="text-sm font-medium tracking-wide text-primary uppercase">Manage booking</p>
                    <h1 className="mt-2 text-2xl font-bold text-foreground">{page.title}</h1>
                </header>

                <section className="rounded-xl border border-border bg-card p-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">
                                {booking.name} · {booking.email}
                            </p>
                            <p className="mt-1 text-lg font-semibold text-foreground">{booking.date_display}</p>
                            <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                                <CalendarClock className="h-4 w-4" />
                                {booking.time_display} <span>({booking.tz_label.replace(/_/g, ' ')})</span>
                            </p>
                        </div>
                        <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                                booking.status === 'confirmed'
                                    ? 'bg-green-500/10 text-green-700 dark:text-green-300'
                                    : booking.status === 'cancelled'
                                      ? 'bg-red-500/10 text-red-700 dark:text-red-300'
                                      : 'bg-muted text-muted-foreground'
                            }`}
                        >
                            {booking.status === 'confirmed' ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                            {booking.status === 'cancelled' ? <XCircle className="h-3.5 w-3.5" /> : null}
                            {booking.status.replace('_', ' ')}
                        </span>
                    </div>
                </section>

                {booking.can_change && (
                    <>
                        <section className="mt-6 rounded-xl border border-border bg-card p-6">
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                <h2 className="text-lg font-semibold text-foreground">Reschedule</h2>
                                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                    Times in
                                    <select
                                        value={displayTz}
                                        onChange={(event) => {
                                            setDisplayTz(event.target.value);
                                            rescheduleForm.setData('timezone', event.target.value);
                                            chooseSlot(null);
                                        }}
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

                            <SlotPicker
                                slug={page.slug}
                                availableDates={availableDates}
                                displayTz={displayTz}
                                selected={slot}
                                onSelect={chooseSlot}
                                query={{ booking: booking.uuid, token: booking.token }}
                            />

                            {slot && (
                                <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
                                    New time: {formatDateLabel(slot.date, { weekday: 'long', month: 'long', day: 'numeric' })} at {slot.label} (
                                    {timeZoneAbbreviation(displayTz)})
                                </p>
                            )}
                            <InputError message={rescheduleForm.errors.time ?? rescheduleForm.errors.date} className="mt-2" />
                            <Button
                                type="button"
                                className="mt-4"
                                disabled={!slot || rescheduleForm.processing}
                                onClick={() => rescheduleForm.post(route('booking.reschedule', bookingParams), { preserveScroll: true })}
                            >
                                {rescheduleForm.processing ? 'Rescheduling…' : 'Confirm new time'}
                            </Button>
                        </section>

                        <section className="mt-6 rounded-xl border border-red-500/30 bg-card p-6">
                            <h2 className="text-lg font-semibold text-foreground">Cancel booking</h2>
                            {!confirmingCancel ? (
                                <Button variant="outline" className="mt-3" onClick={() => setConfirmingCancel(true)}>
                                    <Ban className="h-4 w-4" /> Cancel this booking
                                </Button>
                            ) : (
                                <div className="mt-4 flex flex-col gap-3">
                                    <label className="text-sm text-muted-foreground" htmlFor="cancel-reason">
                                        Optional note for the host
                                    </label>
                                    <textarea
                                        id="cancel-reason"
                                        rows={2}
                                        value={cancelForm.data.reason}
                                        onChange={(event) => cancelForm.setData('reason', event.target.value)}
                                        className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                    />
                                    <InputError message={cancelForm.errors.reason} />
                                    <div className="flex flex-wrap gap-2">
                                        <Button
                                            variant="destructive"
                                            disabled={cancelForm.processing}
                                            onClick={() => cancelForm.post(route('booking.cancel', bookingParams), { preserveScroll: true })}
                                        >
                                            {cancelForm.processing ? 'Cancelling…' : 'Yes, cancel my booking'}
                                        </Button>
                                        <Button variant="ghost" onClick={() => setConfirmingCancel(false)}>
                                            Keep my booking
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </section>
                    </>
                )}

                {booking.status === 'cancelled' && (
                    <div className="mt-6 rounded-xl border border-border bg-card p-6 text-center">
                        <p className="text-sm text-muted-foreground">This booking was cancelled. Want a different time?</p>
                        <Button asChild className="mt-4">
                            <Link href={route('booking.show', { page: page.slug })}>Book a new time</Link>
                        </Button>
                    </div>
                )}
            </main>
        </PublicLayout>
    );
}
