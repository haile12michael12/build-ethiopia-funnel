import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import gsap from 'gsap';
import { BarChart3, BriefcaseBusiness, CalendarClock, Eye, FileText, FolderKanban, Plus, TrendingUp, Users, Zap } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/admin',
    },
];

interface DashboardProps {
    stats: {
        total_funnels: number;
        total_views: number;
        total_conversions: number;
        total_contacts: number;
    };
    recentContacts: Array<{
        id: number;
        email: string;
        name: string | null;
        funnel: string | null;
        last_submitted_at: string | null;
    }>;
    analytics: {
        daily: Array<{ date: string; views: number; conversions: number }>;
        sources: Array<{ source: string; conversions: number }>;
    };
    filters: { date_from: string; date_to: string; market: string; service: string; status: string };
    filterOptions: { markets: Record<string, string>; services: Record<string, string>; statuses: string[] };
    operations: {
        new_prospects: number;
        qualified_leads: number;
        open_opportunities: number;
        active_client_projects?: number;
        published_portfolio_projects: number;
        follow_ups_today: number;
        overdue_follow_ups: number;
        content_awaiting_review: number;
        scheduled_content: number;
        automation_failures: number;
    };
    followUps: Array<{ id: number; title: string; due_at: string; contact: string | null; contact_id: number }>;
    recentActivities: Array<{ id: number; type: string; contact: string | null; created_at: string }>;
    clientProjects?: Array<{
        id: number;
        title: string;
        status: string;
        currency: string;
        budget_amount: number;
        contact: string | null;
        target_completion_date: string | null;
    }>;
}

function formatNumber(value: number): string {
    if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
    }

    if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
    }

    return value.toString();
}

export default function Dashboard({ stats, recentContacts, analytics, filters, filterOptions, operations, followUps, recentActivities }: DashboardProps) {
    const [dateFrom, setDateFrom] = useState(filters.date_from);
    const [dateTo, setDateTo] = useState(filters.date_to);
    const [market, setMarket] = useState(filters.market);
    const [service, setService] = useState(filters.service);
    const [status, setStatus] = useState(filters.status);
    const conversionRate = stats.total_views > 0 ? (stats.total_conversions / stats.total_views) * 100 : 0;
    const maxDailyViews = Math.max(1, ...analytics.daily.map((day) => day.views));
    const applyFilters = (event: FormEvent) => {
        event.preventDefault();
        router.get(route('dashboard'), {
            date_from: dateFrom,
            date_to: dateTo,
            market: market || undefined,
            service: service || undefined,
            status: status || undefined,
        }, { preserveState: true, preserveScroll: true });
    };

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.fromTo(
                '.dashboard-card',
                { opacity: 0, y: 20 },
                {
                    opacity: 1,
                    y: 0,
                    duration: 0.6,
                    stagger: 0.1,
                    ease: 'power3.out',
                },
            );
        });

        return () => ctx.revert();
    }, []);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 overflow-x-auto rounded-xl p-6">
                <section className="dashboard-card rounded-xl border border-border bg-card p-5">
                    <div className="mb-4">
                        <h2 className="text-lg font-semibold">Agency operations</h2>
                        <p className="text-sm text-muted-foreground">CRM and follow-up counts use persisted records and the selected filters. Portfolio items are not client delivery projects.</p>
                    </div>
                    <form onSubmit={applyFilters} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <label className="grid gap-1 text-xs font-medium text-muted-foreground">From
                            <input aria-label="Filter from date" type="date" className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
                        </label>
                        <label className="grid gap-1 text-xs font-medium text-muted-foreground">To
                            <input aria-label="Filter to date" type="date" className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
                        </label>
                        <label className="grid gap-1 text-xs font-medium text-muted-foreground">Market
                            <select aria-label="Filter by market" className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground" value={market} onChange={(event) => setMarket(event.target.value)}>
                                <option value="">All markets</option>
                                {Object.entries(filterOptions.markets).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                            </select>
                        </label>
                        <label className="grid gap-1 text-xs font-medium text-muted-foreground">Service
                            <select aria-label="Filter by service" className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground" value={service} onChange={(event) => setService(event.target.value)}>
                                <option value="">All services</option>
                                {Object.entries(filterOptions.services).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                            </select>
                        </label>
                        <label className="grid gap-1 text-xs font-medium text-muted-foreground">Lead status
                            <select aria-label="Filter by lead status" className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground" value={status} onChange={(event) => setStatus(event.target.value)}>
                                <option value="">All statuses</option>
                                {filterOptions.statuses.map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}
                            </select>
                        </label>
                        <button type="submit" className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground sm:col-span-2 lg:col-span-5 lg:justify-self-start">Apply filters</button>
                    </form>
                    <p className="mt-2 text-xs text-muted-foreground">Prospect and qualified-lead counts use the selected date range, market, service, and status. Follow-up counts use the selected CRM segments and current due dates.</p>
                </section>

                <section aria-label="Agency metrics" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Link href="/admin/contacts" className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50">
                        <p className="text-sm text-muted-foreground">New prospects in range</p><p className="mt-1 text-2xl font-semibold">{operations.new_prospects}</p>
                    </Link>
                    <Link href="/admin/contacts?status=qualified" className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50">
                        <p className="text-sm text-muted-foreground">Qualified leads in range</p><p className="mt-1 text-2xl font-semibold">{operations.qualified_leads}</p>
                    </Link>
                    <Link href="/admin/opportunities" className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50">
                        <p className="text-sm text-muted-foreground">Open opportunities</p><p className="mt-1 text-2xl font-semibold">{operations.open_opportunities}</p>
                    </Link>
                    <Link href="/admin/projects" className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50">
                        <p className="text-sm text-muted-foreground">Published portfolio projects</p><p className="mt-1 text-2xl font-semibold">{operations.published_portfolio_projects}</p>
                    </Link>
                    <Link href="/admin/follow-up-tasks" className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50">
                        <p className="text-sm text-muted-foreground">Follow-ups due today / overdue</p><p className="mt-1 text-2xl font-semibold">{operations.follow_ups_today} / {operations.overdue_follow_ups}</p>
                    </Link>
                    <Link href="/admin/content-studio?status=in_review" className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50">
                        <p className="text-sm text-muted-foreground">Content awaiting approval</p><p className="mt-1 text-2xl font-semibold">{operations.content_awaiting_review}</p>
                    </Link>
                    <Link href="/admin/content-studio?status=scheduled" className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50">
                        <p className="text-sm text-muted-foreground">Content scheduled for manual publishing</p><p className="mt-1 text-2xl font-semibold">{operations.scheduled_content}</p>
                    </Link>
                    <Link href="/admin/automations/runs?status=failed" className="rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50">
                        <p className="text-sm text-muted-foreground">Automation failures</p><p className="mt-1 text-2xl font-semibold">{operations.automation_failures}</p>
                    </Link>
                </section>

                <section className="grid gap-6 lg:grid-cols-2">
                    <div className="dashboard-card rounded-xl border border-border bg-card p-5">
                        <h2 className="mb-3 flex items-center gap-2 font-semibold"><CalendarClock className="h-4 w-4" />Follow-ups due</h2>
                        {followUps.length ? <div className="space-y-2">{followUps.map((task) => (
                            <Link key={task.id} href={`/admin/contacts/${task.contact_id}`} className="flex justify-between gap-3 rounded-lg bg-muted/50 p-3 text-sm hover:bg-muted">
                                <span className="min-w-0"><span className="block truncate font-medium">{task.title}</span><span className="text-muted-foreground">{task.contact || 'Contact'}</span></span>
                                <time className="shrink-0 text-muted-foreground">{new Date(task.due_at).toLocaleString()}</time>
                            </Link>
                        ))}</div> : <p className="text-sm text-muted-foreground">No pending follow-ups are due today or overdue for these filters.</p>}
                    </div>
                    <div className="dashboard-card rounded-xl border border-border bg-card p-5">
                        <h2 className="mb-3 flex items-center gap-2 font-semibold"><FileText className="h-4 w-4" />Recent CRM activity</h2>
                        {recentActivities.length ? <ul className="space-y-2">{recentActivities.map((activity) => (
                            <li key={activity.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 p-3 text-sm">
                                <span className="truncate"><span className="font-medium">{activity.contact || 'Contact'}</span> · {activity.type}</span>
                                <time className="shrink-0 text-muted-foreground">{activity.created_at}</time>
                            </li>
                        ))}</ul> : <p className="text-sm text-muted-foreground">No CRM activity has been recorded yet.</p>}
                    </div>
                </section>

                {/* Quick Stats */}
                <div className="grid auto-rows-min gap-4 md:grid-cols-4">
                    <div className="dashboard-card relative overflow-hidden rounded-xl border border-border bg-card p-6">
                        <div className="absolute inset-0 bg-chart-1/5"></div>
                        <div className="relative flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Funnels</p>
                                <p className="text-2xl font-bold text-foreground">{stats.total_funnels}</p>
                            </div>
                            <Zap className="h-8 w-8 text-chart-1" />
                        </div>
                    </div>

                    <div className="dashboard-card relative overflow-hidden rounded-xl border border-border bg-card p-6">
                        <div className="absolute inset-0 bg-chart-2/5"></div>
                        <div className="relative flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Views</p>
                                <p className="text-2xl font-bold text-foreground">{formatNumber(stats.total_views)}</p>
                            </div>
                            <Eye className="h-8 w-8 text-chart-2" />
                        </div>
                    </div>

                    <div className="dashboard-card relative overflow-hidden rounded-xl border border-border bg-card p-6">
                        <div className="absolute inset-0 bg-chart-3/5"></div>
                        <div className="relative flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Conversions</p>
                                <p className="text-2xl font-bold text-foreground">{formatNumber(stats.total_conversions)}</p>
                            </div>
                            <Users className="h-8 w-8 text-chart-3" />
                        </div>
                    </div>

                    <div className="dashboard-card relative overflow-hidden rounded-xl border border-border bg-card p-6">
                        <div className="absolute inset-0 bg-chart-4/5"></div>
                        <div className="relative flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Contacts</p>
                                <p className="text-2xl font-bold text-foreground">{formatNumber(stats.total_contacts)}</p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-chart-4" />
                        </div>
                    </div>
                </div>

                {/* Quick Actions & Recent Activity */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Quick Actions */}
                    <div className="dashboard-card rounded-xl border border-border bg-card p-6">
                        <h3 className="mb-4 text-lg font-semibold text-foreground">Quick Actions</h3>
                        <div className="space-y-3">
                            <Link
                                href="/admin/funnel-editor"
                                className="group flex items-center rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                            >
                                <div className="mr-3 rounded-lg bg-primary/10 p-2 transition-colors group-hover:bg-primary/20">
                                    <Plus className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">Create New Funnel</p>
                                    <p className="text-sm text-muted-foreground">Start building with our drag-and-drop editor</p>
                                </div>
                            </Link>

                            <Link
                                href="/admin/funnels"
                                className="group flex items-center rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                            >
                                <div className="mr-3 rounded-lg bg-chart-2/10 p-2 transition-colors group-hover:bg-chart-2/20">
                                    <Zap className="h-5 w-5 text-chart-2" />
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">View All Funnels</p>
                                    <p className="text-sm text-muted-foreground">Manage your existing funnels</p>
                                </div>
                            </Link>

                            <Link
                                href="/admin/contacts"
                                className="group flex items-center rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
                            >
                                <div className="mr-3 rounded-lg bg-chart-3/10 p-2 transition-colors group-hover:bg-chart-3/20">
                                    <Users className="h-5 w-5 text-chart-3" />
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">Review Captured Leads</p>
                                    <p className="text-sm text-muted-foreground">Follow up with contacts from funnel forms</p>
                                </div>
                            </Link>

                            <div className="group flex cursor-pointer items-center rounded-lg border border-border p-3 transition-colors hover:bg-muted/50">
                                <div className="mr-3 rounded-lg bg-chart-3/10 p-2 transition-colors group-hover:bg-chart-3/20">
                                    <BarChart3 className="h-5 w-5 text-chart-3" />
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">Analytics Overview</p>
                                    <p className="text-sm text-muted-foreground">View detailed performance metrics</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Recent Contacts */}
                    <div className="dashboard-card rounded-xl border border-border bg-card p-6">
                        <h3 className="mb-4 text-lg font-semibold text-foreground">Recent Contacts</h3>
                        <div className="space-y-3">
                            {recentContacts.map((contact) => (
                                <div key={contact.id} className="flex items-center rounded-lg bg-muted/50 p-3">
                                    <div className="mr-3 rounded-lg bg-chart-3/10 p-2">
                                        <Users className="h-4 w-4 text-chart-3" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium text-foreground">{contact.name || contact.email}</p>
                                        <p className="truncate text-sm text-muted-foreground">
                                            {contact.funnel || 'Unknown funnel'} | {contact.last_submitted_at || 'Just now'}
                                        </p>
                                    </div>
                                </div>
                            ))}

                            {recentContacts.length === 0 && (
                                <div className="rounded-lg bg-muted/50 p-6 text-center">
                                    <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                                    <p className="font-medium text-foreground">No contacts captured yet</p>
                                    <p className="text-sm text-muted-foreground">Add a form block to a published funnel.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="dashboard-card grid gap-6 rounded-xl border border-border bg-card p-6 lg:grid-cols-[minmax(0,2fr)_minmax(240px,1fr)]">
                    <div>
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-foreground">Last 14 days</h3>
                                <p className="text-sm text-muted-foreground">Views and attributed conversions</p>
                            </div>
                            <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                                {conversionRate.toFixed(1)}% overall
                            </span>
                        </div>
                        <div className="flex h-56 items-end gap-2 border-b border-border">
                            {analytics.daily.map((day) => (
                                <div
                                    key={day.date}
                                    className="group flex h-full min-w-0 flex-1 items-end gap-0.5"
                                    title={`${day.date}: ${day.views} views, ${day.conversions} conversions`}
                                >
                                    <div
                                        className="min-h-1 flex-1 rounded-t bg-chart-2/70 transition-colors group-hover:bg-chart-2"
                                        style={{ height: `${Math.max(2, (day.views / maxDailyViews) * 100)}%` }}
                                    />
                                    <div
                                        className="min-h-1 flex-1 rounded-t bg-primary/70 transition-colors group-hover:bg-primary"
                                        style={{ height: `${Math.max(2, (day.conversions / maxDailyViews) * 100)}%` }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="border-border lg:border-l lg:pl-6">
                        <h3 className="mb-4 text-sm font-semibold tracking-wide text-muted-foreground uppercase">Top conversion sources</h3>
                        <div className="space-y-3">
                            {analytics.sources.map((source) => (
                                <div key={source.source} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                                    <span className="truncate text-sm font-medium text-foreground">{source.source}</span>
                                    <span className="text-sm text-muted-foreground tabular-nums">{source.conversions}</span>
                                </div>
                            ))}
                            {analytics.sources.length === 0 && <p className="text-sm text-muted-foreground">No attributed conversions yet.</p>}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
