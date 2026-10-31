import PublicLayout from '@/layouts/public-layout';
import { Head, Link } from '@inertiajs/react';
import { Activity as ActivityIcon } from 'lucide-react';

interface ActivityItem {
    id: number;
    action: string;
    meta: Record<string, unknown>;
    created_at: string | null;
}

interface ActivityPage {
    data: ActivityItem[];
    links: Array<{ url: string | null; label: string; active: boolean }>;
    total: number;
}

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

export default function AccountActivity({ activities }: { activities: ActivityPage }) {
    return (
        <PublicLayout>
            <Head title="My Activity" />
            <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
                <header className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-primary">Customer account</p>
                        <h1 className="mt-1 text-3xl font-bold">My Activity</h1>
                        <p className="mt-2 text-muted-foreground">A history of activity associated with your account.</p>
                    </div>
                    <Link href={route('customer.dashboard')} className="text-sm font-medium text-primary">Back to dashboard</Link>
                </header>

                <section className="overflow-hidden rounded-xl border border-border bg-card">
                    {activities.data.length ? (
                        <ul className="divide-y divide-border">
                            {activities.data.map((activity) => (
                                <li key={activity.id} className="flex items-start gap-3 p-5">
                                    <ActivityIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                                    <div className="min-w-0 flex-1">
                                        <p className="font-medium capitalize">{activity.action.replaceAll('_', ' ')}</p>
                                        <time className="mt-1 block text-sm text-muted-foreground">
                                            {activity.created_at ? new Date(activity.created_at).toLocaleString() : ''}
                                        </time>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="p-8 text-center">
                            <h2 className="font-semibold">No activity yet</h2>
                            <p className="mt-1 text-sm text-muted-foreground">Your account activity will appear here.</p>
                        </div>
                    )}
                    <Pagination links={activities.links} />
                </section>
            </main>
        </PublicLayout>
    );
}