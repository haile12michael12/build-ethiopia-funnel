import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

interface Product {
    id: number;
    slug: string;
    type: 'template' | 'bundle' | 'membership';
    name: string;
    description: string;
    amount_minor: number | null;
    currency: string;
    license: string;
    status: string;
    file_configured: boolean;
    owner: { name: string; email: string } | null;
    revenue_share_percent: string;
    bundle_item_count: number;
}

interface Option {
    id: number;
    name: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Marketplace', href: route('marketplace.index') },
    { title: 'Listing review', href: route('marketplace.review.index') },
];

export default function MarketplaceReview({ products, bundleOptions }: { products: Product[]; bundleOptions: Option[] }) {
    const [savingId, setSavingId] = useState<number | null>(null);

    const save = (event: FormEvent<HTMLFormElement>, product: Product) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setSavingId(product.id);
        const file = form.get('file');
        const payload = {
            status: String(form.get('status') ?? ''),
            amount: form.get('amount') ? String(form.get('amount')) : null,
            currency: String(form.get('currency') ?? ''),
            license: String(form.get('license') ?? ''),
            contributor_revenue_share_percent: String(form.get('contributor_revenue_share_percent') ?? ''),
            bundle_template_ids: form.getAll('bundle_template_ids').map(Number),
            file: file instanceof File && file.size > 0 ? file : null,
            preview_images: form.getAll('preview_images').filter((entry): entry is File => entry instanceof File && entry.size > 0),
        };
        router.put(route('marketplace.review.update', product.id), payload, { forceFormData: true, onFinish: () => setSavingId(null) });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Review marketplace listings" />
            <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
                <header>
                    <h1 className="text-3xl font-bold">Marketplace review</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Configure prices and private ZIP artifacts. Membership checkout stays disabled pending recurring-payment support. Contributor
                        shares are tracked for manual settlement; no payouts are automated.
                    </p>
                </header>
                {products.map((product) => (
                    <form
                        key={product.id}
                        onSubmit={(event) => save(event, product)}
                        className="grid gap-4 rounded-xl border border-border bg-card p-5 md:grid-cols-2"
                    >
                        <div className="md:col-span-2">
                            <div className="flex flex-wrap justify-between gap-2">
                                <div>
                                    <h2 className="text-lg font-semibold">{product.name}</h2>
                                    <p className="text-sm text-muted-foreground">
                                        {product.slug} · {product.type} · {product.status}
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {product.owner ? `${product.owner.name} (${product.owner.email})` : 'Hailab curated'} · ZIP:{' '}
                                        {product.file_configured ? 'configured' : 'missing'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <label className="grid gap-1 text-sm font-medium">
                            Listing status
                            <select name="status" defaultValue="" required className="rounded-md border border-border bg-background px-3 py-2">
                                <option value="" disabled>
                                    Select a review decision
                                </option>
                                <option value="published">Published</option>
                                <option value="rejected">Rejected</option>
                            </select>
                        </label>
                        <label className="grid gap-1 text-sm font-medium">
                            Price (blank disables checkout; 0 means free)
                            <input
                                name="amount"
                                type="number"
                                min="0"
                                max="99999999.99"
                                step="0.01"
                                defaultValue={product.amount_minor === null ? '' : (product.amount_minor / 100).toFixed(2)}
                                className="rounded-md border border-border bg-background px-3 py-2"
                            />
                        </label>
                        <label className="grid gap-1 text-sm font-medium">
                            Currency
                            <input
                                name="currency"
                                required
                                maxLength={3}
                                minLength={3}
                                defaultValue={product.currency}
                                className="rounded-md border border-border bg-background px-3 py-2 uppercase"
                            />
                        </label>
                        <label className="grid gap-1 text-sm font-medium">
                            License
                            <input
                                name="license"
                                required
                                defaultValue={product.license}
                                maxLength={100}
                                className="rounded-md border border-border bg-background px-3 py-2"
                            />
                        </label>
                        <label className="grid gap-1 text-sm font-medium">
                            Contributor revenue share (%; manual settlement)
                            <input
                                name="contributor_revenue_share_percent"
                                type="number"
                                min="0"
                                max="90"
                                step="0.01"
                                required
                                defaultValue={product.revenue_share_percent}
                                className="rounded-md border border-border bg-background px-3 py-2"
                            />
                        </label>
                        {product.type === 'template' && (
                            <label className="grid gap-1 text-sm font-medium">
                                Private ZIP artifact {product.file_configured ? '(replace optional)' : '(required to publish)'}
                                <input
                                    name="file"
                                    type="file"
                                    accept=".zip,application/zip"
                                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                                />
                            </label>
                        )}
                        <label className="grid gap-1 text-sm font-medium">
                            Preview images (optional, up to 4)
                            <input
                                name="preview_images"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                multiple
                                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                            />
                        </label>
                        {product.type === 'bundle' && (
                            <label className="grid gap-1 text-sm font-medium">
                                Included templates
                                <select
                                    name="bundle_template_ids"
                                    multiple
                                    defaultValue={[]}
                                    className="min-h-28 rounded-md border border-border bg-background px-3 py-2"
                                >
                                    {bundleOptions.map((option) => (
                                        <option key={option.id} value={option.id}>
                                            {option.name}
                                        </option>
                                    ))}
                                </select>
                                <span className="text-xs font-normal text-muted-foreground">
                                    Currently includes {product.bundle_item_count} listing(s).
                                </span>
                            </label>
                        )}
                        <div className="flex items-center gap-3 md:col-span-2">
                            <button
                                disabled={savingId === product.id}
                                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                            >
                                {savingId === product.id ? 'Saving…' : 'Save listing'}
                            </button>
                            {product.type === 'membership' && (
                                <span className="text-xs text-muted-foreground">Recurring purchase remains unavailable.</span>
                            )}
                        </div>
                    </form>
                ))}
            </main>
        </AppLayout>
    );
}
