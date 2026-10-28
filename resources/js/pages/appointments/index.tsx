import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Ban, CalendarClock, Check, PhoneOff, Settings2 } from 'lucide-react';

interface BookingItem {
    id: number;
    page_title: string;
    location: string | null;
    duration_minutes: number;
    invitee_name: string;
    invitee_email: string;
    invitee_phone: string | null;
    invitee_notes: string | null;
    date_display: string;
    time_display: string;
    timezone: string;
    status: 'confirmed' | 'cancelled' | 'completed' | 'no_show';
    cancellation_reason: string | null;
    starts_in_future: boolean;
    contact_id: number | null;
    contact_name: string | null;
}

interface PageLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface AppointmentsProps {
    bookings: { data: BookingItem[]; links: PageLink[]; total: number };
    view: 'upcoming' | 'past' | 'cancelled';
    counts: { upcoming: number; past: number; cancelled: number };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Appointments', href: route('appointments.index') }];

const views: Array<{ key: AppointmentsProps['view']; title: string }> = [
    { key: 'upcoming', title: 'Upcoming' },
    { key: 'past', title: 'Past & outcomes' },
    { key: 'cancelled', title: 'Cancelled' },
];

const statusVariant: Record<BookingItem['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
    confirmed: 'default',
    cancelled: 'destructive',
    completed: 'secondary',
    no_show: 'outline',
};

export default function Appointments({ bookings, view, counts }: AppointmentsProps) {
    const act = (bookingId: number, action: 'completed' | 'no_show' | 'cancelled') => {
        const messages: Record<typeof action, string | null> = {
            completed: null,
            no_show: 'Mark this booking as a no-show? A re-engagement task will be created.',
            cancelled: 'Cancel this booking? The invitee will be emailed a cancellation notice.',
        };
        const message = messages[action];
        if (message && !window.confirm(message)) return;
        router.patch(route('appointments.update', bookingId), { action }, { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Appointments" />
            <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6">
                <header className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Appointments</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Bookings from your public calendar pages. Mark outcomes after each meeting to keep the CRM accurate.
                        </p>
                    </div>
                    <Button variant="outline" asChild>
                        <Link href={route('booking-pages.index')}>
                            <Settings2 className="h-4 w-4" /> Manage booking pages
                        </Link>
                    </Button>
                </header>

                <nav className="flex flex-wrap gap-2" aria-label="Appointment views">
                    {views.map((item) => (
                        <Link
                            key={item.key}
                            href={route('appointments.index', { view: item.key })}
                            className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                                view === item.key
                                    ? 'border-primary bg-primary text-primary-foreground'
                                    : 'border-border bg-card text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {item.title}
                            <span className="ml-2 tabular-nums">{counts[item.key]}</span>
                        </Link>
                    ))}
                </nav>

                <section className="overflow-hidden rounded-xl border border-border bg-card">
                    {bookings.data.map((booking) => (
                        <article
                            key={booking.id}
                            className="flex flex-col gap-4 border-b border-border p-4 last:border-b-0 sm:flex-row sm:items-start sm:justify-between"
                        >
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="font-semibold text-foreground">{booking.invitee_name}</h2>
                                    <Badge variant={statusVariant[booking.status]}>{booking.status.replace('_', ' ')}</Badge>
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {booking.page_title} · {booking.date_display} · {booking.time_display} ({booking.timezone.replace(/_/g, ' ')})
                                </p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {booking.invitee_email}
                                    {booking.invitee_phone ? ` · ${booking.invitee_phone}` : ''}
                                    {booking.location ? ` · ${booking.location}` : ''}
                                </p>
                                {booking.invitee_notes && (
                                    <p className="mt-2 text-sm whitespace-pre-wrap text-muted-foreground">{booking.invitee_notes}</p>
                                )}
                                {booking.cancellation_reason && (
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        <span className="font-medium text-foreground">Cancellation reason:</span> {booking.cancellation_reason}
                                    </p>
                                )}
                                {booking.contact_id && (
                                    <Link
                                        href={route('contacts.show', booking.contact_id)}
                                        className="mt-2 inline-block text-sm text-primary hover:underline"
                                    >
                                        View contact · {booking.contact_name}
                                    </Link>
                                )}
                            </div>
                            {booking.status === 'confirmed' && (
                                <div className="flex shrink-0 flex-wrap gap-2">
                                    {!booking.starts_in_future && (
                                        <>
                                            <Button size="sm" variant="outline" onClick={() => act(booking.id, 'completed')}>
                                                <Check className="h-4 w-4" /> Completed
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => act(booking.id, 'no_show')}>
                                                <PhoneOff className="h-4 w-4" /> No-show
                                            </Button>
                                        </>
                                    )}
                                    {booking.starts_in_future && (
                                        <Button size="sm" variant="outline" onClick={() => act(booking.id, 'cancelled')}>
                                            <Ban className="h-4 w-4" /> Cancel
                                        </Button>
                                    )}
                                </div>
                            )}
                        </article>
                    ))}
                    {bookings.data.length === 0 && (
                        <div className="px-6 py-14 text-center">
                            <CalendarClock className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
                            <p className="font-medium text-foreground">No appointments in this view</p>
                            <p className="mt-1 text-sm text-muted-foreground">Share your booking page link so visitors can pick a time.</p>
                        </div>
                    )}
                </section>

                {bookings.links.length > 3 && (
                    <nav className="flex flex-wrap justify-center gap-1" aria-label="Appointment pages">
                        {bookings.links.map((link, index) =>
                            link.url ? (
                                <Link
                                    key={`${link.label}-${index}`}
                                    href={link.url}
                                    preserveScroll
                                    className={`rounded-md border px-3 py-1.5 text-sm ${
                                        link.active
                                            ? 'border-primary bg-primary text-primary-foreground'
                                            : 'border-border bg-card text-muted-foreground hover:bg-muted'
                                    }`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ) : (
                                <span
                                    key={`${link.label}-${index}`}
                                    className="px-3 py-1.5 text-sm text-muted-foreground"
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ),
                        )}
                    </nav>
                )}
            </main>
        </AppLayout>
    );
}
