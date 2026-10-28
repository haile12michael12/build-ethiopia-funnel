import { Button } from '@/components/ui/button';
import PublicLayout from '@/layouts/public-layout';
import { Head, Link } from '@inertiajs/react';
import { CalendarPlus, CheckCircle2, Clock, MapPin, Settings2 } from 'lucide-react';

interface ConfirmationBooking {
    name: string;
    email: string;
    date_display: string;
    time_display: string;
    tz_label: string;
    manage_url: string;
    google_calendar_url: string;
    status: string;
    can_change: boolean;
}

interface BookingConfirmationProps {
    page: { title: string; location: string | null };
    booking: ConfirmationBooking;
}

export default function BookingConfirmation({ page, booking }: BookingConfirmationProps) {
    return (
        <PublicLayout>
            <Head title="Booking confirmed" />
            <main className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
                <div className="rounded-2xl border border-border bg-card p-8 text-center">
                    <CheckCircle2 className="mx-auto h-12 w-12 text-green-600 dark:text-green-400" />
                    <h1 className="mt-4 text-2xl font-bold text-foreground">You're booked, {booking.name.split(' ')[0]}!</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        A confirmation email is on its way to <span className="font-medium text-foreground">{booking.email}</span>.
                    </p>

                    <dl className="mt-6 space-y-3 rounded-xl bg-muted/60 p-5 text-left text-sm">
                        <div className="flex justify-between gap-4">
                            <dt className="text-muted-foreground">Booking</dt>
                            <dd className="font-medium text-foreground">{page.title}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <dt className="text-muted-foreground">Date</dt>
                            <dd className="font-medium text-foreground">{booking.date_display}</dd>
                        </div>
                        <div className="flex justify-between gap-4">
                            <dt className="inline-flex items-center gap-1.5 text-muted-foreground">
                                <Clock className="h-4 w-4" /> Time
                            </dt>
                            <dd className="font-medium text-foreground">
                                {booking.time_display} <span className="text-muted-foreground">({booking.tz_label.replace(/_/g, ' ')})</span>
                            </dd>
                        </div>
                        {page.location && (
                            <div className="flex justify-between gap-4">
                                <dt className="inline-flex items-center gap-1.5 text-muted-foreground">
                                    <MapPin className="h-4 w-4" /> Where
                                </dt>
                                <dd className="font-medium text-foreground">{page.location}</dd>
                            </div>
                        )}
                    </dl>

                    <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                        <Button asChild>
                            <a href={booking.google_calendar_url} target="_blank" rel="noopener noreferrer">
                                <CalendarPlus className="h-4 w-4" /> Add to Google Calendar
                            </a>
                        </Button>
                        {booking.can_change && (
                            <Button variant="outline" asChild>
                                <a href={booking.manage_url}>
                                    <Settings2 className="h-4 w-4" /> Reschedule or cancel
                                </a>
                            </Button>
                        )}
                    </div>
                </div>

                <p className="mt-6 text-center text-sm text-muted-foreground">
                    <Link href="/" className="text-primary hover:underline">
                        Back to home
                    </Link>
                </p>
            </main>
        </PublicLayout>
    );
}
