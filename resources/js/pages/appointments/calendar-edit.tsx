import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, SharedData } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { type FormEvent } from 'react';

interface AvailabilityWindow {
    start: string;
    end: string;
}

interface EditableBookingPage {
    id: number;
    title: string;
    slug: string;
    description: string | null;
    location: string | null;
    duration_minutes: number;
    buffer_minutes: number;
    min_notice_hours: number;
    advance_days: number;
    timezone: string;
    is_active: boolean;
    /** Keyed '1' (Mon) – '7' (Sun); zero or one windows are edited in this UI. */
    availability: Record<string, AvailabilityWindow[]>;
    public_url: string;
}

interface CalendarEditProps {
    page: EditableBookingPage;
    durations: number[];
    timezones: string[];
    limits: { max_advance_days: number; max_min_notice_hours: number };
}

const WEEKDAYS: Array<{ key: string; label: string }> = [
    { key: '1', label: 'Monday' },
    { key: '2', label: 'Tuesday' },
    { key: '3', label: 'Wednesday' },
    { key: '4', label: 'Thursday' },
    { key: '5', label: 'Friday' },
    { key: '6', label: 'Saturday' },
    { key: '7', label: 'Sunday' },
];

export default function CalendarEdit({ page, durations, timezones, limits }: CalendarEditProps) {
    const { flash } = usePage<SharedData>().props as { flash?: { success?: string | null } };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Appointments', href: route('appointments.index') },
        { title: 'Booking pages', href: route('booking-pages.index') },
        { title: page.title, href: route('booking-pages.edit', page.id) },
    ];

    const form = useForm({
        title: page.title,
        description: page.description ?? '',
        location: page.location ?? '',
        duration_minutes: page.duration_minutes,
        buffer_minutes: page.buffer_minutes,
        min_notice_hours: page.min_notice_hours,
        advance_days: page.advance_days,
        timezone: page.timezone,
        is_active: page.is_active,
        availability: page.availability,
    });

    const dayEnabled = (key: string) => (form.data.availability[key] ?? []).length > 0;

    const toggleDay = (key: string, enabled: boolean) => {
        form.setData('availability', {
            ...form.data.availability,
            [key]: enabled ? [{ start: '09:00', end: '17:00' }] : [],
        });
    };

    const setWindow = (key: string, field: 'start' | 'end', value: string) => {
        const current = form.data.availability[key]?.[0] ?? { start: '09:00', end: '17:00' };
        form.setData('availability', {
            ...form.data.availability,
            [key]: [{ ...current, [field]: value }],
        });
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.put(route('booking-pages.update', page.id), { preserveScroll: true });
    };

    const timezonesList = timezones.includes(form.data.timezone) ? timezones : [form.data.timezone, ...timezones];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit booking page · ${page.title}`} />
            <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-6">
                <header>
                    <Link
                        href={route('booking-pages.index')}
                        className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="h-4 w-4" /> Booking pages
                    </Link>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">{page.title}</h1>
                            <p className="mt-1 text-sm text-muted-foreground">/book/{page.slug}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant={page.is_active ? 'default' : 'secondary'}>{page.is_active ? 'Active' : 'Inactive'}</Badge>
                            <Button variant="outline" size="sm" asChild>
                                <a href={page.public_url} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4" /> Preview
                                </a>
                            </Button>
                        </div>
                    </div>
                </header>

                {flash?.success && (
                    <div className="rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-300">
                        {flash.success}
                    </div>
                )}

                <form onSubmit={submit} className="flex flex-col gap-6">
                    <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
                        <h2 className="text-lg font-semibold text-foreground">Basics</h2>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <div>
                                <Label htmlFor="edit-title">Title</Label>
                                <Input
                                    id="edit-title"
                                    value={form.data.title}
                                    onChange={(event) => form.setData('title', event.target.value)}
                                    required
                                    className="mt-1.5"
                                />
                                <InputError message={form.errors.title} className="mt-1" />
                            </div>
                            <div>
                                <Label htmlFor="edit-location">Location</Label>
                                <Input
                                    id="edit-location"
                                    value={form.data.location}
                                    onChange={(event) => form.setData('location', event.target.value)}
                                    placeholder="Google Meet, phone, office…"
                                    className="mt-1.5"
                                />
                                <InputError message={form.errors.location} className="mt-1" />
                            </div>
                            <div className="sm:col-span-2">
                                <Label htmlFor="edit-description">
                                    Description <span className="text-muted-foreground">(optional)</span>
                                </Label>
                                <textarea
                                    id="edit-description"
                                    rows={3}
                                    value={form.data.description}
                                    onChange={(event) => form.setData('description', event.target.value)}
                                    className="mt-1.5 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                />
                                <InputError message={form.errors.description} className="mt-1" />
                            </div>
                        </div>
                        <label className="mt-4 flex items-center gap-2 text-sm text-foreground">
                            <Checkbox checked={form.data.is_active} onCheckedChange={(checked) => form.setData('is_active', checked === true)} />
                            Accepting bookings (public link is live)
                        </label>
                        <InputError message={form.errors.is_active} className="mt-1" />
                    </section>

                    <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
                        <h2 className="text-lg font-semibold text-foreground">Scheduling rules</h2>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                                <Label htmlFor="edit-duration">Duration</Label>
                                <select
                                    id="edit-duration"
                                    value={form.data.duration_minutes}
                                    onChange={(event) => form.setData('duration_minutes', Number(event.target.value))}
                                    className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                >
                                    {durations.map((minutes) => (
                                        <option key={minutes} value={minutes}>
                                            {minutes} min
                                        </option>
                                    ))}
                                </select>
                                <InputError message={form.errors.duration_minutes} className="mt-1" />
                            </div>
                            <div>
                                <Label htmlFor="edit-buffer">Buffer between (min)</Label>
                                <Input
                                    id="edit-buffer"
                                    type="number"
                                    min={0}
                                    max={120}
                                    value={form.data.buffer_minutes}
                                    onChange={(event) => form.setData('buffer_minutes', Number(event.target.value))}
                                    className="mt-1.5"
                                />
                                <InputError message={form.errors.buffer_minutes} className="mt-1" />
                            </div>
                            <div>
                                <Label htmlFor="edit-notice">Min. notice (hours)</Label>
                                <Input
                                    id="edit-notice"
                                    type="number"
                                    min={0}
                                    max={limits.max_min_notice_hours}
                                    value={form.data.min_notice_hours}
                                    onChange={(event) => form.setData('min_notice_hours', Number(event.target.value))}
                                    className="mt-1.5"
                                />
                                <InputError message={form.errors.min_notice_hours} className="mt-1" />
                            </div>
                            <div>
                                <Label htmlFor="edit-advance">Advance window (days)</Label>
                                <Input
                                    id="edit-advance"
                                    type="number"
                                    min={1}
                                    max={limits.max_advance_days}
                                    value={form.data.advance_days}
                                    onChange={(event) => form.setData('advance_days', Number(event.target.value))}
                                    className="mt-1.5"
                                />
                                <InputError message={form.errors.advance_days} className="mt-1" />
                            </div>
                        </div>
                        <div className="mt-4">
                            <Label htmlFor="edit-timezone">Meeting timezone</Label>
                            <select
                                id="edit-timezone"
                                value={form.data.timezone}
                                onChange={(event) => form.setData('timezone', event.target.value)}
                                className="mt-1.5 h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            >
                                {timezonesList.map((zone) => (
                                    <option key={zone} value={zone}>
                                        {zone.replace(/_/g, ' ')}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Availability below is entered in this timezone; visitors see times in their own timezone.
                            </p>
                            <InputError message={form.errors.timezone} className="mt-1" />
                        </div>
                    </section>

                    <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
                        <h2 className="text-lg font-semibold text-foreground">Weekly availability</h2>
                        <p className="mt-1 text-sm text-muted-foreground">Enable the days you take meetings and set the hours for each day.</p>
                        <div className="mt-4 divide-y divide-border rounded-lg border border-border">
                            {WEEKDAYS.map((day) => {
                                const window = form.data.availability[day.key]?.[0] ?? { start: '09:00', end: '17:00' };
                                const enabled = dayEnabled(day.key);
                                return (
                                    <div key={day.key} className="flex flex-wrap items-center gap-3 p-3">
                                        <label className="flex w-36 items-center gap-2 text-sm font-medium text-foreground">
                                            <Checkbox checked={enabled} onCheckedChange={(checked) => toggleDay(day.key, checked === true)} />
                                            {day.label}
                                        </label>
                                        {enabled ? (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <input
                                                    type="time"
                                                    value={window.start}
                                                    onChange={(event) => setWindow(day.key, 'start', event.target.value)}
                                                    className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                                    aria-label={`${day.label} start`}
                                                />
                                                <span>to</span>
                                                <input
                                                    type="time"
                                                    value={window.end}
                                                    onChange={(event) => setWindow(day.key, 'end', event.target.value)}
                                                    className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                                    aria-label={`${day.label} end`}
                                                />
                                            </div>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">Unavailable</span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <InputError message={form.errors.availability} className="mt-2" />
                    </section>

                    <div className="flex gap-2">
                        <Button type="submit" disabled={form.processing}>
                            {form.processing ? 'Saving…' : 'Save changes'}
                        </Button>
                        <Button type="button" variant="ghost" asChild>
                            <Link href={route('booking-pages.index')}>Back</Link>
                        </Button>
                    </div>
                </form>
            </main>
        </AppLayout>
    );
}
