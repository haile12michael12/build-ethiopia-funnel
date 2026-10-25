import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';

interface AnalyticsProps {
    filters: { date_from: string; date_to: string };
    metrics: {
        total_inquiries: number;
        new_inquiries: number;
        total_leads: number;
        qualified_leads: number;
        status_counts: Record<string, number>;
        service_counts: Record<string, number>;
        market_counts: Record<string, number>;
        budget_counts: Record<string, Record<string, number>>;
        score_counts: Record<string, number>;
        source_counts: Record<string, number>;
        campaign_counts: Record<string, number>;
        overdue_tasks: number;
        won_revenue: Array<{ currency: string; amount_minor: number; won_count: number }>;
        site_event_counts: Record<string, number>;
    };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Lead analytics', href: route('client-acquisition.analytics') }];

function MetricCard({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
        </div>
    );
}

function Breakdown({ title, values }: { title: string; values: Record<string, number> }) {
    const entries = Object.entries(values).sort((a, b) => b[1] - a[1]);

    return (
        <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-4 font-semibold text-foreground">{title}</h2>
            {entries.length ? (
                <ul className="space-y-2">
                    {entries.map(([label, count]) => (
                        <li key={label} className="flex justify-between gap-4 text-sm">
                            <span className="break-words text-muted-foreground">{label.replaceAll('_', ' ')}</span>
                            <span className="font-medium text-foreground tabular-nums">{count}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-muted-foreground">No recorded data in this period.</p>
            )}
        </section>
    );
}

export default function ClientAcquisitionAnalytics({ filters, metrics }: AnalyticsProps) {
    const [dates, setDates] = useState(filters);
    const apply = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.get(route('client-acquisition.analytics'), dates, { preserveState: true, preserveScroll: true, replace: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Lead analytics" />
            <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-4 sm:p-6">
                <header className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Lead analytics</h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            Metrics use persisted contacts, tasks, and recorded closed-won opportunities. Scores are follow-up suggestions, not
                            judgments.
                        </p>
                    </div>
                    <Link href={route('contacts.index')} className="text-sm font-medium text-primary hover:underline">
                        Open lead list
                    </Link>
                </header>
                <form onSubmit={apply} className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
                    <label className="space-y-1 text-sm text-muted-foreground">
                        From
                        <input
                            type="date"
                            required
                            value={dates.date_from}
                            onChange={(event) => setDates((current) => ({ ...current, date_from: event.target.value }))}
                            className="block rounded-md border border-border bg-background px-3 py-2 text-foreground"
                        />
                    </label>
                    <label className="space-y-1 text-sm text-muted-foreground">
                        Through
                        <input
                            type="date"
                            required
                            value={dates.date_to}
                            onChange={(event) => setDates((current) => ({ ...current, date_to: event.target.value }))}
                            className="block rounded-md border border-border bg-background px-3 py-2 text-foreground"
                        />
                    </label>
                    <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
                        Apply dates
                    </button>
                </form>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                    <MetricCard label="Inquiries (submissions, lifetime)" value={metrics.total_inquiries} />
                    <MetricCard label="Inquiries (submissions, period)" value={metrics.new_inquiries} />
                    <MetricCard label="Leads (contacts, lifetime)" value={metrics.total_leads} />
                    <MetricCard label="Qualified leads (period)" value={metrics.qualified_leads} />
                    <MetricCard label="Overdue follow-up tasks" value={metrics.overdue_tasks} />
                    <MetricCard label="Recorded won opportunities" value={metrics.won_revenue.reduce((total, item) => total + item.won_count, 0)} />
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Breakdown title="Current lead status (inquiry cohort)" values={metrics.status_counts} />
                    <Breakdown title="Requested services" values={metrics.service_counts} />
                    <Breakdown title="Selected market" values={metrics.market_counts} />
                    <Breakdown title="Lead score bands" values={metrics.score_counts} />
                    <Breakdown title="Inquiry sources" values={metrics.source_counts} />
                    <Breakdown title="Campaigns" values={metrics.campaign_counts} />
                    <Breakdown title="Concierge & audit site events" values={metrics.site_event_counts ?? {}} />
                </div>
                <section className="rounded-xl border border-border bg-card p-5">
                    <h2 className="mb-3 font-semibold text-foreground">Self-reported budget ranges (separate currencies)</h2>
                    <div className="grid gap-5 md:grid-cols-2">
                        {(['ETB', 'USD'] as const).map((currency) => (
                            <div key={currency}>
                                <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{currency}</h3>
                                <Breakdown title="" values={metrics.budget_counts[currency] ?? {}} />
                            </div>
                        ))}
                    </div>
                </section>
                <section className="rounded-xl border border-border bg-card p-5">
                    <h2 className="mb-3 font-semibold text-foreground">Recorded won opportunity value (actual records only)</h2>
                    {metrics.won_revenue.length ? (
                        <ul className="space-y-2">
                            {metrics.won_revenue.map((item) => (
                                <li key={item.currency} className="flex justify-between text-sm">
                                    <span>
                                        {item.currency} · {item.won_count} won opportunities
                                    </span>
                                    <span className="font-semibold">
                                        {new Intl.NumberFormat(undefined, { style: 'currency', currency: item.currency }).format(
                                            item.amount_minor / 100,
                                        )}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground">No closed-won opportunity value was recorded for this period.</p>
                    )}
                </section>
                <p className="text-xs text-muted-foreground">
                    Inquiry counts are persisted contact submissions created in the selected period or over the contact's lifetime. Lead breakdowns
                    use contacts created in the selected period; qualified leads are those currently in qualified status. Won value uses opportunities
                    closed as won in the period. No conversion rate or estimated revenue is calculated.
                </p>
            </main>
        </AppLayout>
    );
}
