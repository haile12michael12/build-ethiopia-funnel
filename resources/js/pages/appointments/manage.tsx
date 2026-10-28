import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, SharedData } from '@/types';
import type { AppointmentSummary } from '@/types/appointment';
import { Head, router, usePage } from '@inertiajs/react';
import { CalendarCheck, CalendarMinus, CalendarX, Clock, Users } from 'lucide-react';
import { type FormEvent, useState } from 'react';

interface AppointmentsIndexProps {
    timezone: string;
    stats: {
        upcoming: number;
        confirmed: number;
        cancelled: number;
        completed: number;
        no_show: number;
    };
    filters: {
        status: string;
        date_from: string;
        date_to: string;
        service_key: string;
        view: string;
    };
    appointments: AppointmentSummary[];
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Appointments', href: route('appointments.manage') }];

const statusLabels: Record<string, string> = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    cancelled: 'Cancelled',
    completed: 'Completed',
    no_show: 'No show',
};

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Users }) {
    return (
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
            </div>
            <div>
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
            </div>
        </div>
    );
}

export default function AppointmentsIndex({ timezone, stats, filters, appointments }: AppointmentsIndexProps) {
    const page = usePage<SharedData>();
    const flash = (page.props as { flash?: { success?: string } }).flash;
    const [filterState, setFilterState] = useState(filters);

    const apply = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.get(route('appointments.manage'), filterState, { preserveState: true, preserveScroll: true, replace: true });
    };

    const changeStatus = (appointment: AppointmentSummary, status: string) => {
        router.patch(
            route('appointments.manage.status.update', appointment.id),
            { status },
            {
                preserveScroll: true,
                onSuccess: () => router.reload(),
            },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Appointments" />
            <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6">
                <header className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Appointments</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Booked meetings from the public demo scheduler, shown in {timezone}. Times are never converted between timezones.
                        </p>
                    </div>
                </header>

                {flash?.success && (
                    <div role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-600">
                        {flash.success}
                    </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <StatCard label="Upcoming" value={stats.upcoming} icon={Clock} />
                    <StatCard label="Confirmed upcoming" value={stats.confirmed} icon={CalendarCheck} />
                    <StatCard label="Completed" value={stats.completed} icon={Users} />
                    <StatCard label="No show" value={stats.no_show} icon={CalendarMinus} />
                    <StatCard label="Cancelled" value={stats.cancelled} icon={CalendarX} />
                </div>

                <form onSubmit={apply} className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
                    <label className="space-y-1 text-sm text-muted-foreground">
                        View
                        <select
                            value={filterState.view}
                            onChange={(event) => setFilterState((current) => ({ ...current, view: event.target.value }))}
                            className="block w-40 rounded-md border border-border bg-background px-3 py-2 text-foreground"
                        >
                            <option value="upcoming">Upcoming</option>
                            <option value="past">Past</option>
                            <option value="all">All</option>
                        </select>
                    </label>
                    <label className="space-y-1 text-sm text-muted-foreground">
                        Status
                        <select
                            value={filterState.status}
                            onChange={(event) => setFilterState((current) => ({ ...current, status: event.target.value }))}
                            className="block w-40 rounded-md border border-border bg-background px-3 py-2 text-foreground"
                        >
                            <option value="">Any</option>
                            {Object.entries(statusLabels).map(([key, label]) => (
                                <option key={key} value={key}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="space-y-1 text-sm text-muted-foreground">
                        From
                        <input
                            type="date"
                            value={filterState.date_from}
                            onChange={(event) => setFilterState((current) => ({ ...current, date_from: event.target.value }))}
                            className="block rounded-md border border-border bg-background px-3 py-2 text-foreground"
                        />
                    </label>
                    <label className="space-y-1 text-sm text-muted-foreground">
                        Through
                        <input
                            type="date"
                            value={filterState.date_to}
                            onChange={(event) => setFilterState((current) => ({ ...current, date_to: event.target.value }))}
                            className="block rounded-md border border-border bg-background px-3 py-2 text-foreground"
                        />
                    </label>
                    <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                        Apply filters
                    </button>
                </form>

                <section className="rounded-xl border border-border bg-card">
                    <div className="border-b border-border px-5 py-4">
                        <h2 className="font-semibold text-foreground">
                            {filterState.view === 'upcoming'
                                ? 'Upcoming appointments'
                                : filterState.view === 'past'
                                  ? 'Past appointments'
                                  : 'All appointments'}
                        </h2>
                    </div>

                    {appointments.length === 0 ? (
                        <p className="px-5 py-12 text-center text-sm text-muted-foreground">No appointments match these filters.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[860px] text-sm">
                                <thead>
                                    <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                                        <th className="px-5 py-3 font-medium">Company / contact</th>
                                        <th className="px-5 py-3 font-medium">Service</th>
                                        <th className="px-5 py-3 font-medium">When</th>
                                        <th className="px-5 py-3 font-medium">Status</th>
                                        <th className="px-5 py-3 text-right font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {appointments.map((appointment) => (
                                        <tr key={appointment.id} className="border-b border-border last:border-0">
                                            <td className="px-5 py-4">
                                                <p className="font-medium text-foreground">{appointment.company_name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {appointment.contact_name} · {appointment.email}
                                                </p>
                                            </td>
                                            <td className="px-5 py-4">
                                                <p className="text-foreground">{appointment.service_label}</p>
                                                <p className="text-xs text-muted-foreground capitalize">
                                                    {appointment.meeting_type.replace('_', ' ')}
                                                </p>
                                            </td>
                                            <td className="px-5 py-4">
                                                <p className="text-foreground">{appointment.start_display}</p>
                                                <p className="text-xs text-muted-foreground">{appointment.timezone}</p>
                                            </td>
                                            <td className="px-5 py-4">
                                                <span
                                                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                                                        appointment.status === 'confirmed'
                                                            ? 'bg-emerald-500/10 text-emerald-600'
                                                            : appointment.status === 'cancelled'
                                                              ? 'bg-rose-500/10 text-rose-600'
                                                              : appointment.status === 'no_show'
                                                                ? 'bg-amber-500/10 text-amber-600'
                                                                : 'bg-muted text-muted-foreground'
                                                    }`}
                                                >
                                                    {statusLabel(appointment.status)}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    {appointment.status === 'pending' && (
                                                        <button
                                                            type="button"
                                                            onClick={() => changeStatus(appointment, 'confirmed')}
                                                            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium"
                                                        >
                                                            Confirm
                                                        </button>
                                                    )}
                                                    {(appointment.status === 'pending' || appointment.status === 'confirmed') && (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={() => changeStatus(appointment, 'completed')}
                                                                className="rounded-md border border-border px-2.5 py-1 text-xs font-medium"
                                                            >
                                                                Complete
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => changeStatus(appointment, 'no_show')}
                                                                className="rounded-md border border-border px-2.5 py-1 text-xs font-medium"
                                                            >
                                                                No show
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => changeStatus(appointment, 'cancelled')}
                                                                className="rounded-md border border-rose-500/40 px-2.5 py-1 text-xs font-medium text-rose-600"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </main>
        </AppLayout>
    );
}

function statusLabel(status: string): string {
    return statusLabels[status] ?? status;
}
