import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, SharedData } from '@/types';
import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Check, Copy, ExternalLink, Plus } from 'lucide-react';
import { type FormEvent, useState } from 'react';

interface BookingPageItem {
    id: number;
    title: string;
    slug: string;
    location: string | null;
    duration_minutes: number;
    timezone: string;
    is_active: boolean;
    bookings_count: number;
    upcoming_count: number;
    public_url: string;
}

interface CalendarsProps {
    pages: BookingPageItem[];
    durations: number[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Appointments', href: route('appointments.index') },
    { title: 'Booking pages', href: route('booking-pages.index') },
];

export default function Calendars({ pages, durations }: CalendarsProps) {
    const { flash } = usePage<SharedData>().props as { flash?: { success?: string | null } };
    const [copiedId, setCopiedId] = useState<number | null>(null);
    const [showCreate, setShowCreate] = useState(pages.length === 0);

    const form = useForm({
        title: '',
        location: '',
        duration_minutes: 30,
    });

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(route('booking-pages.store'), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setShowCreate(false);
            },
        });
    };

    const copy = async (page: BookingPageItem) => {
        try {
            await navigator.clipboard.writeText(page.public_url);
            setCopiedId(page.id);
            window.setTimeout(() => setCopiedId((current) => (current === page.id ? null : current)), 2000);
        } catch {
            window.prompt('Copy the booking page link:', page.public_url);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Booking pages" />
            <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6">
                <header className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <Link
                            href={route('appointments.index')}
                            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="h-4 w-4" /> Appointments
                        </Link>
                        <h1 className="text-2xl font-bold text-foreground">Booking pages</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Each page gets a public link visitors use to pick a time from your availability.
                        </p>
                    </div>
                    <Button onClick={() => setShowCreate((current) => !current)}>
                        <Plus className="h-4 w-4" /> New booking page
                    </Button>
                </header>

                {flash?.success && (
                    <div className="rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-300">
                        {flash.success}
                    </div>
                )}

                {showCreate && (
                    <form onSubmit={submit} className="rounded-xl border border-border bg-card p-5 sm:p-6">
                        <h2 className="text-lg font-semibold text-foreground">Create a booking page</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Starts with weekday 09:00–17:00 availability on your default timezone — fine-tune it after creating.
                        </p>
                        <div className="mt-4 grid gap-4 sm:grid-cols-3">
                            <div>
                                <Label htmlFor="new-title">Title</Label>
                                <Input
                                    id="new-title"
                                    value={form.data.title}
                                    onChange={(event) => form.setData('title', event.target.value)}
                                    placeholder="Discovery call"
                                    required
                                    className="mt-1.5"
                                />
                                <InputError message={form.errors.title} className="mt-1" />
                            </div>
                            <div>
                                <Label htmlFor="new-location">Location</Label>
                                <Input
                                    id="new-location"
                                    value={form.data.location}
                                    onChange={(event) => form.setData('location', event.target.value)}
                                    placeholder="Google Meet, phone, office…"
                                    className="mt-1.5"
                                />
                                <InputError message={form.errors.location} className="mt-1" />
                            </div>
                            <div>
                                <Label htmlFor="new-duration">Duration</Label>
                                <select
                                    id="new-duration"
                                    value={form.data.duration_minutes}
                                    onChange={(event) => form.setData('duration_minutes', Number(event.target.value))}
                                    className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                >
                                    {durations.map((minutes) => (
                                        <option key={minutes} value={minutes}>
                                            {minutes} minutes
                                        </option>
                                    ))}
                                </select>
                                <InputError message={form.errors.duration_minutes} className="mt-1" />
                            </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                            <Button type="submit" disabled={form.processing}>
                                {form.processing ? 'Creating…' : 'Create page'}
                            </Button>
                            {pages.length > 0 && (
                                <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
                                    Dismiss
                                </Button>
                            )}
                        </div>
                    </form>
                )}

                <section className="overflow-hidden rounded-xl border border-border bg-card">
                    {pages.map((page) => (
                        <article
                            key={page.id}
                            className="flex flex-col gap-4 border-b border-border p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="font-semibold text-foreground">{page.title}</h2>
                                    <Badge variant={page.is_active ? 'default' : 'secondary'}>{page.is_active ? 'Active' : 'Inactive'}</Badge>
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {page.duration_minutes} min · {page.timezone.replace(/_/g, ' ')}
                                    {page.location ? ` · ${page.location}` : ''} · {page.upcoming_count} upcoming / {page.bookings_count} total
                                </p>
                                <p className="mt-1 truncate text-xs text-muted-foreground">{page.public_url}</p>
                            </div>
                            <div className="flex shrink-0 flex-wrap gap-2">
                                <Button size="sm" variant="outline" onClick={() => void copy(page)}>
                                    {copiedId === page.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                    {copiedId === page.id ? 'Copied' : 'Copy link'}
                                </Button>
                                <Button size="sm" variant="outline" asChild>
                                    <a href={page.public_url} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="h-4 w-4" /> Open
                                    </a>
                                </Button>
                                <Button size="sm" asChild>
                                    <Link href={route('booking-pages.edit', page.id)}>Edit</Link>
                                </Button>
                            </div>
                        </article>
                    ))}
                    {pages.length === 0 && (
                        <div className="px-6 py-14 text-center">
                            <p className="font-medium text-foreground">No booking pages yet</p>
                            <p className="mt-1 text-sm text-muted-foreground">Create your first page to start accepting appointments.</p>
                        </div>
                    )}
                </section>
            </main>
        </AppLayout>
    );
}
