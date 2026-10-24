import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link } from '@inertiajs/react';

interface Order {
    id: number;
    reference: string;
    status: string;
    amount_minor: number;
    currency: string;
    created_at: string | null;
    paid_at: string | null;
    product: { name: string; slug: string; type: string } | null;
    buyer: { name: string; email: string } | null;
}

interface OrdersPage {
    data: Order[];
    links: Array<{ url: string | null; label: string; active: boolean }>;
    total: number;
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Orders', href: route('marketplace.orders.index') }];

export default function OrdersIndex({ orders }: { orders: OrdersPage }) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Orders" />
            <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
                <header>
                    <h1 className="text-3xl font-bold text-foreground">Customer orders</h1>
                    <p className="mt-2 text-muted-foreground">
                        Payment status is updated only after Chapa verification. Refund processing is not supported in the current integration.
                    </p>
                </header>
                <section className="overflow-x-auto rounded-xl border border-border bg-card">
                    {orders.data.length ? (
                        <table className="w-full min-w-[760px] text-left text-sm">
                            <thead className="border-b border-border bg-muted/50 text-muted-foreground">
                                <tr>
                                    <th scope="col" className="px-4 py-3 font-medium">
                                        Order / reference
                                    </th>
                                    <th scope="col" className="px-4 py-3 font-medium">
                                        Customer
                                    </th>
                                    <th scope="col" className="px-4 py-3 font-medium">
                                        Product
                                    </th>
                                    <th scope="col" className="px-4 py-3 font-medium">
                                        Total
                                    </th>
                                    <th scope="col" className="px-4 py-3 font-medium">
                                        Status
                                    </th>
                                    <th scope="col" className="px-4 py-3 font-medium">
                                        Paid at
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {orders.data.map((order) => (
                                    <tr key={order.id}>
                                        <td className="px-4 py-4">
                                            <span className="font-medium">#{order.id}</span>
                                            <span className="mt-1 block font-mono text-xs break-all text-muted-foreground">{order.reference}</span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="block font-medium">{order.buyer?.name ?? 'Customer'}</span>
                                            <span className="text-muted-foreground">{order.buyer?.email ?? 'Account unavailable'}</span>
                                        </td>
                                        <td className="px-4 py-4">{order.product?.name ?? 'Product unavailable'}</td>
                                        <td className="px-4 py-4 font-medium">
                                            {order.currency} {(order.amount_minor / 100).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-4 capitalize">{order.status}</td>
                                        <td className="px-4 py-4 text-muted-foreground">
                                            {order.paid_at ? new Date(order.paid_at).toLocaleString() : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="p-8 text-center text-muted-foreground">No customer orders have been recorded.</p>
                    )}
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
            </main>
        </AppLayout>
    );
}
