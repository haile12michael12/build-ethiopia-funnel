import PublicLayout from '@/layouts/public-layout';
import { Head, Link } from '@inertiajs/react';

interface Order {
    id: number;
    reference: string;
    status: string;
    amount_minor: number;
    currency: string;
    created_at: string | null;
    paid_at: string | null;
    product: {
        name: string;
        slug: string;
        type: string;
        support_information?: string | null;
    } | null;
    can_download: boolean;
    download_url: string | null;
}

export default function OrderShow({ order }: { order: Order }) {
    return (
        <PublicLayout>
            <Head title={`Order ${order.reference} · My Account`} />
            <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-10 sm:px-6">
                <Link href={route('account.orders.index')} className="w-fit text-sm underline underline-offset-4">
                    Back to my orders
                </Link>
                <section className="rounded-xl border border-border bg-card p-6 sm:p-8">
                    <p className="text-sm font-medium text-primary">Order details</p>
                    <h1 className="mt-1 text-3xl font-bold">{order.product?.name ?? 'Product no longer available'}</h1>
                    <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                        <div>
                            <dt className="text-sm text-muted-foreground">Payment status</dt>
                            <dd className="mt-1 font-semibold capitalize">{order.status}</dd>
                        </div>
                        <div>
                            <dt className="text-sm text-muted-foreground">Order total</dt>
                            <dd className="mt-1 font-semibold">
                                {order.currency} {(order.amount_minor / 100).toFixed(2)}
                            </dd>
                        </div>
                        <div>
                            <dt className="text-sm text-muted-foreground">Payment reference</dt>
                            <dd className="mt-1 break-all font-mono text-sm">{order.reference}</dd>
                        </div>
                        <div>
                            <dt className="text-sm text-muted-foreground">Paid on</dt>
                            <dd className="mt-1">{order.paid_at ? new Date(order.paid_at).toLocaleString() : 'Not confirmed'}</dd>
                        </div>
                    </dl>

                    {order.can_download && order.download_url ? (
                        <a
                            href={order.download_url}
                            className="mt-7 inline-flex rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground"
                        >
                            Download your product
                        </a>
                    ) : order.status !== 'paid' ? (
                        <p className="mt-7 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                            Access will be available after the payment provider confirms your payment. A return page alone does not confirm payment.
                        </p>
                    ) : null}

                    <div className="mt-7 border-t border-border pt-5 text-sm text-muted-foreground">
                        Need help with this purchase?{' '}
                        <Link href={route('client-acquisition.show')} className="font-medium text-foreground underline underline-offset-4">
                            Contact the business
                        </Link>
                    </div>
                </section>
            </main>
        </PublicLayout>
    );
}
