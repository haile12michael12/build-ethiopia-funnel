import PublicLayout from '@/layouts/public-layout';
import { Head, Link } from '@inertiajs/react';

interface Product {
    name: string;
    slug: string;
    type: string;
}

interface Order {
    id: number;
    reference: string;
    status: string;
    amount_minor: number;
    currency: string;
    created_at: string | null;
    paid_at: string | null;
    product: Product | null;
}

interface OrdersPage {
    data: Order[];
    links: Array<{ url: string | null; label: string; active: boolean }>;
    total: number;
}

export default function OrdersIndex({ orders }: { orders: OrdersPage }) {
    return (
        <PublicLayout>
            <Head title="My Account · Orders" />
            <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6">
                <header className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-sm font-medium text-primary">Customer account</p>
                        <h1 className="mt-1 text-3xl font-bold">My Orders</h1>
                        <p className="mt-2 text-muted-foreground">Review your purchase status and access eligible digital products.</p>
                    </div>
                    <div className="flex gap-3 text-sm">
                        <Link href={route('profile.edit')} className="underline underline-offset-4">
                            Profile
                        </Link>
                        <Link href={route('client-acquisition.show')} className="underline underline-offset-4">
                            Contact support
                        </Link>
                    </div>
                </header>

                {orders.data.length ? (
                    <section className="overflow-hidden rounded-xl border border-border bg-card">
                        <ul className="divide-y divide-border">
                            {orders.data.map((order) => (
                                <li key={order.id} className="flex flex-wrap items-center justify-between gap-4 p-5">
                                    <div>
                                        <h2 className="font-semibold">{order.product?.name ?? 'Product no longer available'}</h2>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Order {order.reference}
                                            {order.created_at ? ` · ${new Date(order.created_at).toLocaleDateString()}` : ''}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="font-semibold">
                                                {order.currency} {(order.amount_minor / 100).toFixed(2)}
                                            </p>
                                            <p className="text-sm text-muted-foreground capitalize">{order.status}</p>
                                        </div>
                                        <Link
                                            href={route('account.orders.show', order.id)}
                                            className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted"
                                        >
                                            Details
                                        </Link>
                                    </div>
                                </li>
                            ))}
                        </ul>
                        {orders.links.length > 3 && (
                            <nav aria-label="Order pages" className="flex flex-wrap gap-2 border-t border-border p-4">
                                {orders.links.map((link, index) => (
                                    <Link
                                        key={index}
                                        href={link.url ?? '#'}
                                        preserveScroll
                                        aria-disabled={!link.url}
                                        className={`rounded border border-border px-3 py-2 text-sm ${link.active ? 'bg-primary text-primary-foreground' : 'bg-background'} ${link.url ? '' : 'pointer-events-none opacity-50'}`}
                                    >
                                        {link.label.replace(/<[^>]*>/g, '')}
                                    </Link>
                                ))}
                            </nav>
                        )}
                    </section>
                ) : (
                    <section className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
                        <h2 className="text-lg font-semibold">No orders yet</h2>
                        <p className="mt-2 text-sm text-muted-foreground">Your completed and pending purchases will appear here.</p>
                        <Link
                            href={route('marketplace.index')}
                            className="mt-5 inline-flex rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground"
                        >
                            Browse products
                        </Link>
                    </section>
                )}
            </main>
        </PublicLayout>
    );
}
