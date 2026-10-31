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
    source: string;
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

interface AppointmentSummary {
    id: number;
    company_name: string;
    contact_name: string;
    service_label: string;
    meeting_type: string;
    start_at: string | null;
    timezone: string;
    duration_minutes: number;
    status: string;
    notes: string | null;
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

interface DownloadSummary {
    id: number;
    name: string;
    url: string;
}

interface BookingSummary {
    uuid: string;
    name: string | null;
    starts_at: string | null;
    timezone: string | null;
    status: string;
}

interface ActivitySummary {
    id: number;
    action: string;
    meta: Record<string, unknown>;
    created_at: string | null;
}

interface AccountPage {
    profile: Profile;
    summary: {
        open_requests: number;
        active_projects: number;
        completed_projects: number;
        pending_orders: number;
        upcoming_appointments: number;
    };
    requests: RequestSummary[];
    projects: ProjectSummary[];
    appointments: AppointmentSummary[];
    orders: OrderSummary[];
    downloads: DownloadSummary[];
    upcomingBookings: BookingSummary[];
    activities: ActivitySummary[];
    order_count: number;
    paid_order_count: number;
}

const SOURCE_LABELS: Record<string, string> = {
    business_audit: 'Growth audit',
    client_acquisition: 'Project request',
    appointment_booking: 'Demo booking',
};

function formatMoney(amountMinor: number, currency: string): string {
    const formatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    });

    return formatter.format(amountMinor / 100);
}

function formatAppointmentDate(startAt: string | null): string {
    if (! startAt) {
        return 'Date pending';
    }

    return new Date(startAt).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });
}

export default function AccountIndex({ profile, summary, requests, projects, appointments, orders, downloads, upcomingBookings, activities, order_count, paid_order_count }: AccountPage) {
    const firstName = profile.name?.trim().split(/\s+/)[0] || profile.name;

    return (
        <PublicLayout>
            <Head title="My Account" />
            <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6">
                <header className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-primary">Customer dashboard</p>
                        <h1 className="mt-1 text-3xl font-bold">Welcome, {firstName}</h1>
                        <p className="mt-2 text-muted-foreground">Overview of your requests, projects, appointments, orders, and account details.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => router.post(route('logout'))}
                        className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
                    >
                        Log out
                    </button>
                </header>

                <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
                    <div className="rounded-xl border border-border bg-card p-5">
                        <p className="text-sm text-muted-foreground">Upcoming appointments</p>
                        <p className="mt-2 text-3xl font-bold">{summary.upcoming_appointments}</p>
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
                                            {SOURCE_LABELS[request.source] || request.source.replaceAll('_', ' ')}
                                            {request.last_submitted_at ? ` · ${new Date(request.last_submitted_at).toLocaleDateString()}` : ''}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium capitalize">
                                            {request.status.replaceAll('_', ' ')
                                        }
                                        </span>
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
                                            {project.status.replaceAll('_', ' ')
                                        }
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
                                            {order.status.replaceAll('_', ' ')
                                        }
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
                    <div className="flex items-center justify-between border-b border-border p-5">
                        <h2 className="text-lg font-semibold">My appointments</h2>
                        <Link href={route('appointments.show')} className="text-sm font-medium text-primary">Book a demo</Link>
                    </div>
                    <div className="divide-y divide-border">
                        {appointments.length > 0 ? appointments.map((appointment) => (
                            <div key={appointment.id} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="font-medium">{appointment.company_name || appointment.contact_name || 'Appointment'}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {appointment.service_label || appointment.meeting_type}
                                        {appointment.start_at ? ` · ${formatAppointmentDate(appointment.start_at)}` : ''}
                                        {appointment.timezone ? ` · ${appointment.timezone}` : ''}
                                    </p>
                                </div>
                                <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium capitalize">
                                    {appointment.status.replaceAll('_', ' ')}
                                </span>
                            </div>
                        )) : (
                            <div className="p-5 text-sm text-muted-foreground">You have no demo or consultation appointments booked yet.</div>
                        )}
                    </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-2">
                    <div className="overflow-hidden rounded-xl border border-border bg-card">
                        <div className="flex items-center justify-between border-b border-border p-5">
                            <h2 className="text-lg font-semibold">Purchased downloads</h2>
                            <Link href={route('account.orders.index')} className="text-sm font-medium text-primary">Orders</Link>
                        </div>
                        <div className="divide-y divide-border">
                            {downloads.length ? downloads.map((download) => (
                                <div key={download.id} className="flex items-center justify-between gap-4 p-5">
                                    <span className="font-medium">{download.name}</span>
                                    <Link href={download.url} className="shrink-0 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted">Download</Link>
                                </div>
                            )) : <p className="p-5 text-sm text-muted-foreground">Paid template downloads will appear here.</p>}
                        </div>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-border bg-card">
                        <div className="flex items-center justify-between border-b border-border p-5">
                            <h2 className="text-lg font-semibold">Upcoming bookings</h2>
                            <Link href={route('appointments.show')} className="text-sm font-medium text-primary">Book a demo</Link>
                        </div>
                        <div className="divide-y divide-border">
                            {upcomingBookings.length ? upcomingBookings.map((booking) => (
                                <div key={booking.uuid} className="flex flex-col gap-1 p-5">
                                    <span className="font-medium">{booking.name || 'Booking'}</span>
                                    <span className="text-sm text-muted-foreground">
                                        {booking.starts_at ? new Date(booking.starts_at).toLocaleString() : 'Date pending'}
                                        {booking.timezone ? ` · ${booking.timezone}` : ''}
                                    </span>
                                </div>
                            )) : <p className="p-5 text-sm text-muted-foreground">You have no upcoming calendar bookings.</p>}
                        </div>
                    </div>
                </section>

                <section className="overflow-hidden rounded-xl border border-border bg-card">
                    <div className="flex items-center justify-between border-b border-border p-5">
                        <h2 className="text-lg font-semibold">Recent activity</h2>
                        <Link href={route('customer.activity')} className="text-sm font-medium text-primary">View all</Link>
                    </div>
                    <div className="divide-y divide-border">
                        {activities.length ? activities.map((activity) => (
                            <div key={activity.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                                <span className="font-medium capitalize">{activity.action.replaceAll('_', ' ')}</span>
                                <time className="text-muted-foreground">
                                    {activity.created_at ? new Date(activity.created_at).toLocaleString() : ''}
                                </time>
                            </div>
                        )) : <p className="p-5 text-sm text-muted-foreground">Your account activity will appear here.</p>}
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
                        <Link href={route('customer.activity')} className="flex items-center justify-between gap-4 p-5 text-sm font-medium hover:bg-muted">
                            <span>My activity</span>
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
                        <Link href={route('business-audit.show')} className="flex items-center justify-between gap-4 p-5 text-sm font-medium hover:bg-muted">
                            <span>Request a free growth audit</span>
                            <span className="text-muted-foreground">Start &rarr;</span>
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
