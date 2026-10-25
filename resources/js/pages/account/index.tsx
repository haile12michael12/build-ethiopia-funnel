import PublicLayout from '@/layouts/public-layout';
import { Head, Link, router } from '@inertiajs/react';

interface Profile {
    name: string;
    email: string;
}

interface RequestSummary {
    id: number;
    name: string | null;
    email: string | null;
    status: string;
    last_submitted_at: string | null;
}

interface ProjectSummary {
    id: number;
    title: string | null;
    status: string;
    scope_summary: string | null;
    target_completion_date: string | null;
    milestones_count: number;
    milestones_completed: number;
}

interface OrderSummary {
    id: number;
    reference: string | null;
    status: string;
    created_at: string | null;
    amount_minor: number;
    currency: string;
    product_name: string | null;
}

interface AccountPage {
    profile: Profile;
    summary: {
        open_requests: number;
        active_projects: number;
        completed_projects: number;
        pending_orders: number;
    };
    requests: RequestSummary[];
    projects: ProjectSummary[];
    orders: OrderSummary[];
    order_count: number;
    paid_order_count: number;
}

function formatMoney(amountMinor: number, currency: string): string {
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    });

    return formatter.format(amountMinor / 100);
}

export default function AccountIndex({ profile, summary, requests, projects, orders, order_count, paid_order_count }: AccountPage) {
    const firstName = profile.name?.trim().split(/\s+/)[0] || profile.name;

    return (
        <PublicLayout>
            <Head title="My Account" />
            <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
                <header className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-primary">Customer dashboard</p>
                        <h1 className="mt-1 text-3xl font-bold">Welcome, {firstName}</h1>
                        <p className="mt-2 text-muted-foreground">Overview of your requests, projects, orders, and account details.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => router.post(route('logout'))}
                        className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
                    >
                        Log out
                    </button>
                </header>

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-border bg-card p-5">
                        <p className="text-sm text-muted-foreground">Open requests</p>
                        <p className="mt-2 text-3xl font-bold">{summary.open_requests}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-5">
                        <p className="text-sm text-muted-foreground">Active projects</p>
                        <p className="mt-2 text-3xl font-bold">{summary.active_projects}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-5">
                        <p className="text-sm text-muted-foreground">Completed projects</p>
                        <p className="mt-2 text-3xl font-bold">{summary.completed_projects}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-5">
                        <p className="text-sm text-muted-foreground">Pending orders</p>
                        <p className="mt-2 text-3xl font-bold">{summary.pending_orders}</p>
                    </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <div className="overflow-hidden rounded-xl border border-border bg-card">
                        <div className="flex items-center justify-between border-b border-border p-5">
                            <h2 className="text-lg font-semibold">My requests</h2>
                            <Link href={route('client-acquisition.show')} className="text-sm font-medium text-primary">New request</Link>
                        </div>
                        <div className="divide-y divide-border">
                            {requests.length > 0 ? requests.map((request) => (
                                <div key={request.id} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="font-medium">{request.name || request.email || 'Project request'}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {request.last_submitted_at ? new Date(request.last_submitted_at).toLocaleDateString() : 'No date'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium capitalize">
                                            {request.status.replaceAll('_', ' ')}
                                        </span>
                                        <Link href={route('account.orders.index')} className="text-sm text-primary">Details</Link>
                                    </div>
                                </div>
                            )) : (
                                <div className="p-5 text-sm text-muted-foreground">You have no recent service inquiries or project requests.</div>
                            )}
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-border bg-card">
                        <div className="border-b border-border p-5">
                            <h2 className="text-lg font-semibold">Profile</h2>
                        </div>
                        <dl className="space-y-4 p-5 text-sm">
                            <div>
                                <dt className="text-muted-foreground">Name</dt>
                                <dd className="mt-1 font-medium">{profile.name}</dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">Email</dt>
                                <dd className="mt-1 break-all font-medium">{profile.email}</dd>
                            </div>
                            <div className="pt-3">
                                <Link href={route('profile.edit')} className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted">
                                    Update profile
                                </Link>
                            </div>
                        </dl>
                    </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-2">
                    <div className="overflow-hidden rounded-xl border border-border bg-card">
                        <div className="flex items-center justify-between border-b border-border p-5">
                            <h2 className="text-lg font-semibold">My projects</h2>
                            <Link href={route('client-acquisition.show')} className="text-sm font-medium text-primary">Start a project</Link>
                        </div>
                        <div className="divide-y divide-border">
                            {projects.length > 0 ? projects.map((project) => (
                                <div key={project.id} className="space-y-2 p-5">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-medium">{project.title || 'Untitled project'}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {project.target_completion_date ? `Target: ${new Date(project.target_completion_date).toLocaleDateString()}` : 'Target date pending'}
                                            </p>
                                        </div>
                                        <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium capitalize">
                                            {project.status.replaceAll('_', ' ')}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{project.scope_summary || 'No project summary yet.'}</p>
                                    <div className="text-sm text-muted-foreground">
                                        Milestones: {project.milestones_completed}/{project.milestones_count}
                                    </div>
                                </div>
                            )) : (
                                <div className="p-5 text-sm text-muted-foreground">No projects are linked to your account yet.</div>
                            )}
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-border bg-card">
                        <div className="flex items-center justify-between border-b border-border p-5">
                            <h2 className="text-lg font-semibold">Orders & payments</h2>
                            <Link href={route('account.orders.index')} className="text-sm font-medium text-primary">View all</Link>
                        </div>
                        <div className="divide-y divide-border">
                            {orders.length > 0 ? orders.map((order) => (
                                <div key={order.id} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="font-medium">{order.product_name || 'Product order'}</p>
                                        <p className="text-sm text-muted-foreground">{order.reference || `Order #${order.id}`}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium">{formatMoney(order.amount_minor, order.currency || 'USD')}</p>
                                        <span className="mt-1 inline-flex rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium capitalize">
                                            {order.status.replaceAll('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                            )) : (
                                <div className="p-5 text-sm text-muted-foreground">You have no orders or payment records yet.</div>
                            )}
                        </div>
                    </div>
                </section>

                <section className="overflow-hidden rounded-xl border border-border bg-card">
                    <div className="border-b border-border p-5">
                        <h2 className="text-lg font-semibold">Account shortcuts</h2>
                    </div>
                    <nav aria-label="Account actions" className="divide-y divide-border">
                        <Link href={route('account.orders.index')} className="flex items-center justify-between gap-4 p-5 text-sm font-medium hover:bg-muted">
                            <span>My orders and downloads</span>
                            <span className="text-muted-foreground">View &rarr;</span>
                        </Link>
                        <Link href={route('products.index')} className="flex items-center justify-between gap-4 p-5 text-sm font-medium hover:bg-muted">
                            <span>Browse products</span>
                            <span className="text-muted-foreground">Shop &rarr;</span>
                        </Link>
                        <Link href={route('services')} className="flex items-center justify-between gap-4 p-5 text-sm font-medium hover:bg-muted">
                            <span>Explore services</span>
                            <span className="text-muted-foreground">View &rarr;</span>
                        </Link>
                        <Link href={route('client-acquisition.show')} className="flex items-center justify-between gap-4 p-5 text-sm font-medium hover:bg-muted">
                            <span>Contact support or start a project</span>
                            <span className="text-muted-foreground">Reach out &rarr;</span>
                        </Link>
                    </nav>
                </section>

                <section className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-border bg-card p-6">
                        <p className="text-sm text-muted-foreground">Total orders</p>
                        <p className="mt-1 text-3xl font-bold">{order_count}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-6">
                        <p className="text-sm text-muted-foreground">Confirmed purchases</p>
                        <p className="mt-1 text-3xl font-bold">{paid_order_count}</p>
                    </div>
                </section>
            </main>
        </PublicLayout>
    );
}
