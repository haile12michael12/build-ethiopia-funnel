import PublicLayout from '@/layouts/public-layout';
import { Head, Link, router } from '@inertiajs/react';

interface Profile {
    name: string;
    email: string;
}

interface AccountPage {
    profile: Profile;
    order_count: number;
    paid_order_count: number;
}

export default function AccountIndex({ profile, order_count, paid_order_count }: AccountPage) {
    const firstName = profile.name?.trim().split(/\s+/)[0] || profile.name;

    return (
        <PublicLayout>
            <Head title="My Account" />
            <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
                <header className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-primary">Customer account</p>
                        <h1 className="mt-1 text-3xl font-bold">Welcome, {firstName}</h1>
                        <p className="mt-2 text-muted-foreground">Manage your profile, orders, and purchased digital products.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => router.post(route('logout'))}
                        className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
                    >
                        Log out
                    </button>
                </header>

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

                <section className="overflow-hidden rounded-xl border border-border bg-card">
                    <div className="border-b border-border p-6">
                        <h2 className="text-lg font-semibold">Profile</h2>
                        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                            <div>
                                <dt className="text-muted-foreground">Name</dt>
                                <dd className="font-medium">{profile.name}</dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">Email</dt>
                                <dd className="font-medium break-all">{profile.email}</dd>
                            </div>
                        </dl>
                    </div>
                    <nav aria-label="Account actions" className="divide-y divide-border">
                        <Link
                            href={route('account.orders.index')}
                            className="flex items-center justify-between gap-4 p-5 text-sm font-medium hover:bg-muted"
                        >
                            <span>My orders and downloads</span>
                            <span className="text-muted-foreground">View &rarr;</span>
                        </Link>
                        <Link
                            href={route('profile.edit')}
                            className="flex items-center justify-between gap-4 p-5 text-sm font-medium hover:bg-muted"
                        >
                            <span>Edit profile details</span>
                            <span className="text-muted-foreground">Manage &rarr;</span>
                        </Link>
                        <Link
                            href={route('products.index')}
                            className="flex items-center justify-between gap-4 p-5 text-sm font-medium hover:bg-muted"
                        >
                            <span>Browse products</span>
                            <span className="text-muted-foreground">Shop &rarr;</span>
                        </Link>
                        <Link
                            href={route('client-acquisition.show')}
                            className="flex items-center justify-between gap-4 p-5 text-sm font-medium hover:bg-muted"
                        >
                            <span>Contact support or start a project</span>
                            <span className="text-muted-foreground">Reach out &rarr;</span>
                        </Link>
                    </nav>
                </section>
            </main>
        </PublicLayout>
    );
}
