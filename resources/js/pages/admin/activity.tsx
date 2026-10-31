import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Activity as ActivityIcon } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface ActivityItem {
    id: number;
    action: string;
    meta: Record<string, unknown>;
    created_at: string | null;
    user: { id: number; name: string; email: string } | null;
}

interface ActivityPage {
    data: ActivityItem[];
    links: Array<{ url: string | null; label: string; active: boolean }>;
    total: number;
}

interface ActivityFilters {
    action: string;
    user_id: string;
    date_from: string;
    date_to: string;
}

interface UserOption {
    id: number;
    name: string;
    email: string;
}

interface ActivityProps {
    activities: ActivityPage;
    filters: ActivityFilters;
    actions: string[];
    users: UserOption[];
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/admin' },
    { title: 'Activity', href: '/admin/activity' },
];

function Pagination({ links }: { links: ActivityPage['links'] }) {
    if (links.length <= 3) return null;

    return (
        <nav aria-label="Activity pages" className="flex flex-wrap gap-2 border-t border-border p-4">
            {links.map((link, index) => (
                <Link
                    key={`${link.label}-${index}`}
                    href={link.url ?? '#'}
                    preserveScroll
                    aria-disabled={!link.url}
                    className={`rounded border border-border px-3 py-2 text-sm ${link.active ? 'bg-primary text-primary-foreground' : 'bg-background'} ${link.url ? '' : 'pointer-events-none opacity-50'}`}
                >
                    {link.label.replace(/<[^>]*>/g, '')}
                </Link>
            ))}
        </nav>
    );
}

export default function AdminActivity({ activities, filters, actions, users }: ActivityProps) {
    const [action, setAction] = useState(filters.action);
    const [userId, setUserId] = useState(filters.user_id);
    const [dateFrom, setDateFrom] = useState(filters.date_from);
    const [dateTo, setDateTo] = useState(filters.date_to);

    const applyFilters = (event: FormEvent) => {
        event.preventDefault();
        router.get(route('activity.index'), {
            action: action || undefined,
            user_id: userId || undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
        }, { preserveState: true, preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Activity" />
            <main className="flex flex-1 flex-col gap-6 p-6">
                <header className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-primary">Owner console</p>
                        <h1 className="mt-1 text-3xl font-bold">Activity</h1>
                        <p className="mt-2 text-sm text-muted-foreground">All recorded account and business activity.</p>
                    </div>
                    <span className="text-sm tabular-nums text-muted-foreground">{activities.total} records</span>
                </header>

                <form onSubmit={applyFilters} className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 xl:grid-cols-5">
                    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                        Action
                        <select aria-label="Filter by action" value={action} onChange={(event) => setAction(event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                            <option value="">All actions</option>
                            {actions.map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}
                        </select>
                    </label>
                    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                        User
                        <select aria-label="Filter by user" value={userId} onChange={(event) => setUserId(event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                            <option value="">All users, including guests</option>
                            {users.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.email}</option>)}
                        </select>
                    </label>
                    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                        From
                        <input aria-label="Filter from date" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground" />
                    </label>
                    <label className="grid gap-1 text-xs font-medium text-muted-foreground">
                        To
                        <input aria-label="Filter to date" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground" />
                    </label>
                    <div className="flex items-end gap-2">
                        <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">Apply</button>
                        <Link href={route('activity.index')} className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm font-medium hover:bg-muted">Clear</Link>
                    </div>
                </form>

                <section className="overflow-hidden rounded-xl border border-border bg-card">
                    {activities.data.length ? (
                        <ul className="divide-y divide-border">
                            {activities.data.map((activity) => (
                                <li key={activity.id} className="flex items-start gap-3 p-5">
                                    <ActivityIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                                            <p className="font-medium capitalize">{activity.action.replaceAll('_', ' ')}</p>
                                            <time className="text-sm text-muted-foreground">
                                                {activity.created_at ? new Date(activity.created_at).toLocaleString() : ''}
                                            </time>
                                        </div>
                                        <p className="mt-1 break-all text-sm text-muted-foreground">
                                            {activity.user ? `${activity.user.name} · ${activity.user.email}` : 'Guest / system'}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="p-8 text-center">
                            <h2 className="font-semibold">No matching activity</h2>
                            <p className="mt-1 text-sm text-muted-foreground">Try clearing one or more filters.</p>
                        </div>
                    )}
                    <Pagination links={activities.links} />
                </section>
            </main>
        </AppLayout>
    );
}