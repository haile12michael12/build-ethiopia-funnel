import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

interface AnalyticsProps {
    period: { from: string; to: string };
    metrics: {
        unique_visitors: number;
        quiz_completions: number;
        github_profiles_connected: number;
        quiz_branch_evaluations: number;
        lead_conversions: number;
        offer_views: number;
        checkout_starts: number;
        paid_purchases: number;
        bundle_purchases: number;
    };
    revenue: Array<{ currency: string; amount_minor: number }>;
    attribution: Array<{ source: string; conversions: number }>;
    experiments: Array<{ variant_id: number; visitors: number; conversions: number; conversion_rate: number }>;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Developer funnel analytics', href: route('developer-analytics.index') }];

export default function DeveloperAnalytics({ period, metrics, revenue, attribution, experiments }: AnalyticsProps) {
    const cards = [
        ['Unique visitors', metrics.unique_visitors],
        ['Quiz completions', metrics.quiz_completions],
        ['GitHub profiles connected', metrics.github_profiles_connected],
        ['Quiz branch evaluations', metrics.quiz_branch_evaluations],
        ['Lead conversions', metrics.lead_conversions],
        ['Offer views', metrics.offer_views],
        ['Marketplace checkout starts', metrics.checkout_starts],
        ['Paid marketplace purchases', metrics.paid_purchases],
        ['Bundle purchases', metrics.bundle_purchases],
    ] as const;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Developer funnel analytics" />
            <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-6">
                <header>
                    <h1 className="text-3xl font-bold text-foreground">Developer funnel analytics</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Tracked events and verified marketplace payments, {period.from} to {period.to}.
                    </p>
                </header>
                <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {cards.map(([label, value]) => (
                        <article key={label} className="rounded-xl border border-border bg-card p-5">
                            <p className="text-sm text-muted-foreground">{label}</p>
                            <p className="mt-2 text-2xl font-semibold text-foreground">{value.toLocaleString()}</p>
                        </article>
                    ))}
                </section>
                <section className="rounded-xl border border-border bg-card p-5">
                    <h2 className="font-semibold text-foreground">Verified marketplace revenue</h2>
                    <div className="mt-3 flex flex-wrap gap-6">
                        {revenue.map((row) => (
                            <div key={row.currency}>
                                <p className="text-sm text-muted-foreground">{row.currency}</p>
                                <p className="text-xl font-semibold text-foreground">
                                    {(row.amount_minor / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                            </div>
                        ))}
                        {revenue.length === 0 && <p className="text-sm text-muted-foreground">No verified purchases in this period.</p>}
                    </div>
                </section>
                <section className="grid gap-6 lg:grid-cols-2">
                    <article className="rounded-xl border border-border bg-card p-5">
                        <h2 className="font-semibold text-foreground">Lead attribution</h2>
                        <div className="mt-4 space-y-3">
                            {attribution.map((row) => (
                                <div key={row.source} className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{row.source}</span>
                                    <span className="font-medium text-foreground">{row.conversions}</span>
                                </div>
                            ))}
                            {attribution.length === 0 && (
                                <p className="text-sm text-muted-foreground">No attributed lead conversions in this period.</p>
                            )}
                        </div>
                    </article>
                    <article className="rounded-xl border border-border bg-card p-5">
                        <h2 className="font-semibold text-foreground">Experiment variants</h2>
                        <div className="mt-4 space-y-3">
                            {experiments.map((variant) => (
                                <div key={variant.variant_id} className="flex flex-wrap justify-between gap-2 text-sm">
                                    <span className="text-muted-foreground">
                                        Variant {variant.variant_id} · {variant.visitors} visitors
                                    </span>
                                    <span className="font-medium text-foreground">
                                        {variant.conversions} conversions · {variant.conversion_rate}%
                                    </span>
                                </div>
                            ))}
                            {experiments.length === 0 && <p className="text-sm text-muted-foreground">No experiment events in this period.</p>}
                        </div>
                    </article>
                </section>
                <p className="text-xs text-muted-foreground">
                    Counts include only events recorded by the developer funnel and payments verified by the marketplace. Untracked actions are not
                    estimated.
                </p>
            </main>
        </AppLayout>
    );
}
