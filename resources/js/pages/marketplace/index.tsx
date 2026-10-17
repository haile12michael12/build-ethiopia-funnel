import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

interface MarketplaceProduct {
    id: number;
    slug: string;
    type: 'template' | 'bundle' | 'membership';
    name: string;
    description: string;
    tech_stack: string[];
    amount_minor: number | null;
    currency: string;
    included_modules: string[];
    contributor: string | null;
    contributor_badge: boolean;
}

interface Submission {
    id: number;
    name: string;
    slug: string;
    status: string;
    type: string;
}

interface MarketplacePageProps {
    products: MarketplaceProduct[];
    canReview: boolean;
    authenticated: boolean;
    mySubmissions: Submission[];
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Marketplace', href: route('marketplace.index') }];

function priceLabel(product: MarketplaceProduct): string {
    if (product.amount_minor === null) return 'Price to be configured';
    if (product.amount_minor === 0) return 'Free';

    return `${product.currency} ${(product.amount_minor / 100).toFixed(2)}`;
}

export default function MarketplaceIndex({ products, canReview, authenticated, mySubmissions }: MarketplacePageProps) {
    const [submitting, setSubmitting] = useState(false);

    const submitTemplate = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setSubmitting(true);
        router.post(
            route('marketplace.submissions.store'),
            {
                type: form.get('type'),
                name: form.get('name'),
                description: form.get('description'),
                tech_stack: String(form.get('tech_stack') ?? '')
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean),
                included_modules: String(form.get('included_modules') ?? '')
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean),
                version: form.get('version'),
                changelog: form.get('changelog'),
                license: form.get('license'),
            },
            { onFinish: () => setSubmitting(false) },
        );
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Developer Marketplace" />
            <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-6">
                <header className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Developer Marketplace</h1>
                        <p className="mt-2 max-w-2xl text-muted-foreground">
                            Browse developer starters and templates. Prices are configured by marketplace reviewers; recurring Pro membership checkout is not available yet.
                        </p>
                    </div>
                    {canReview && (
                        <Link href={route('marketplace.review.index')} className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted">
                            Review listings
                        </Link>
                    )}
                </header>

                <section aria-label="Marketplace products" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {products.map((product) => (
                        <article key={product.id} className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
                            <div className="flex items-center justify-between gap-2">
                                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground">{product.type}</span>
                                <span className="text-sm font-semibold text-foreground">{priceLabel(product)}</span>
                            </div>
                            <h2 className="mt-4 text-xl font-semibold text-foreground">{product.name}</h2>
                            <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{product.description}</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {product.tech_stack.slice(0, 5).map((technology) => (
                                    <span key={technology} className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">{technology}</span>
                                ))}
                            </div>
                            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                                <span>{product.contributor ? `By ${product.contributor}${product.contributor_badge ? ' · Featured contributor' : ''}` : 'Hailab curated'}</span>
                                <Link href={route('marketplace.show', product.slug)} className="font-semibold text-foreground underline underline-offset-4">
                                    Details
                                </Link>
                            </div>
                        </article>
                    ))}
                </section>

                {products.length === 0 && <p className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">No published marketplace listings yet.</p>}

                <section className="rounded-xl border border-border bg-card p-6">
                    <h2 className="text-xl font-semibold text-foreground">Contribute a template</h2>
                    <p className="mt-1 text-sm text-muted-foreground">Submissions are private until reviewed and approved. Do not include secrets in submitted project files.</p>
                    {authenticated ? (
                        <>
                            <form onSubmit={submitTemplate} className="mt-5 grid gap-4 md:grid-cols-2">
                                <label className="grid gap-1 text-sm font-medium">
                                    Listing type
                                    <select name="type" required className="rounded-md border border-border bg-background px-3 py-2">
                                        <option value="template">Template</option>
                                        <option value="bundle">Bundle</option>
                                        <option value="membership">Membership plan (recurring checkout deferred)</option>
                                    </select>
                                </label>
                                <label className="grid gap-1 text-sm font-medium">
                                    Name
                                    <input name="name" required maxLength={150} className="rounded-md border border-border bg-background px-3 py-2" />
                                </label>
                                <label className="grid gap-1 text-sm font-medium md:col-span-2">
                                    Description
                                    <textarea name="description" required maxLength={5000} rows={3} className="rounded-md border border-border bg-background px-3 py-2" />
                                </label>
                                <label className="grid gap-1 text-sm font-medium">
                                    Tech stack (comma-separated)
                                    <input name="tech_stack" required placeholder="React, TypeScript, Node.js" className="rounded-md border border-border bg-background px-3 py-2" />
                                </label>
                                <label className="grid gap-1 text-sm font-medium">
                                    Included modules (comma-separated)
                                    <input name="included_modules" required placeholder="authentication, testing" className="rounded-md border border-border bg-background px-3 py-2" />
                                </label>
                                <label className="grid gap-1 text-sm font-medium">
                                    Version
                                    <input name="version" required defaultValue="1.0.0" maxLength={50} className="rounded-md border border-border bg-background px-3 py-2" />
                                </label>
                                <label className="grid gap-1 text-sm font-medium">
                                    License
                                    <input name="license" required defaultValue="Personal use" maxLength={100} className="rounded-md border border-border bg-background px-3 py-2" />
                                </label>
                                <label className="grid gap-1 text-sm font-medium md:col-span-2">
                                    Changelog
                                    <textarea name="changelog" maxLength={5000} rows={2} className="rounded-md border border-border bg-background px-3 py-2" />
                                </label>
                                <button disabled={submitting} className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                                    {submitting ? 'Submitting…' : 'Submit for review'}
                                </button>
                            </form>
                            {mySubmissions.length > 0 && (
                                <div className="mt-6 border-t border-border pt-4">
                                    <h3 className="font-semibold">Your submissions</h3>
                                    <ul className="mt-2 space-y-2 text-sm">
                                        {mySubmissions.map((submission) => (
                                            <li key={submission.id} className="flex justify-between gap-4">
                                                <span>{submission.name}</span><span className="capitalize text-muted-foreground">{submission.status.replace('_', ' ')}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </>
                    ) : (
                        <Link href={route('login')} className="mt-4 inline-block font-medium underline">Sign in to submit a template</Link>
                    )}
                </section>
            </main>
        </AppLayout>
    );
}
