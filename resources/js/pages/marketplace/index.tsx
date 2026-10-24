import PublicLayout from '@/layouts/public-layout';
import { Head, Link, router } from '@inertiajs/react';
import { FormEvent, useState } from 'react';

interface MarketplaceProduct {
    id: number;
    slug: string;
    type: 'template' | 'bundle' | 'membership';
    name: string;
    description: string;
    category: string;
    preview_images: string[];
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
    workspace: string | null;
    can_edit: boolean;
}

interface ProductPage {
    data: MarketplaceProduct[];
    links: Array<{ url: string | null; label: string; active: boolean }>;
    total: number;
}

interface MarketplacePageProps {
    products: ProductPage;
    canReview: boolean;
    authenticated: boolean;
    mySubmissions: Submission[];
    workspaces: Array<{ id: number; name: string }>;
    categories: string[];
    filters: { search: string; category: string; type: string; price: string; currency: string; sort: string };
}

function priceLabel(product: MarketplaceProduct): string {
    if (product.amount_minor === null) return 'Price to be configured';
    if (product.amount_minor === 0) return 'Free';

    return `${product.currency} ${(product.amount_minor / 100).toFixed(2)}`;
}

export default function MarketplaceIndex({
    products,
    canReview,
    authenticated,
    mySubmissions,
    workspaces,
    categories,
    filters,
}: MarketplacePageProps) {
    const [submitting, setSubmitting] = useState(false);
    const [search, setSearch] = useState(filters.search);

    const applyFilters = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        router.get(
            route('marketplace.index'),
            {
                search: search || undefined,
                category: form.get('category') || undefined,
                type: form.get('filter_type') || undefined,
                price: form.get('price') || undefined,
                currency: form.get('currency') || undefined,
                sort: form.get('sort') || undefined,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

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
                category: form.get('category'),
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
                license_terms: form.get('license_terms'),
                documentation_url: form.get('documentation_url'),
                demo_url: form.get('demo_url'),
                compatibility: form.get('compatibility'),
                support_information: form.get('support_information'),
                workspace_id: form.get('workspace_id') || null,
            },
            { onFinish: () => setSubmitting(false) },
        );
    };

    return (
        <PublicLayout>
            <Head title="Products" />
            <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-6">
                <header className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Digital Products</h1>
                        <p className="mt-2 max-w-2xl text-muted-foreground">
                            Browse practical digital products for your business and development work.
                        </p>
                    </div>
                    {canReview && (
                        <Link
                            href={route('marketplace.review.index')}
                            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                        >
                            Review listings
                        </Link>
                    )}
                </header>

                <form onSubmit={applyFilters} className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="grid gap-1 text-sm font-medium">
                        Search
                        <input
                            name="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            maxLength={100}
                            placeholder="Search products"
                            className="rounded-md border border-border bg-background px-3 py-2"
                        />
                    </label>
                    <label className="grid gap-1 text-sm font-medium">
                        Category
                        <select name="category" defaultValue={filters.category} className="rounded-md border border-border bg-background px-3 py-2">
                            <option value="">All categories</option>
                            {categories.map((category) => (
                                <option key={category} value={category}>
                                    {category.replaceAll('_', ' ')}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="grid gap-1 text-sm font-medium">
                        Type
                        <select name="filter_type" defaultValue={filters.type} className="rounded-md border border-border bg-background px-3 py-2">
                            <option value="">All types</option>
                            <option value="template">Template</option>
                            <option value="bundle">Bundle</option>
                        </select>
                    </label>
                    <label className="grid gap-1 text-sm font-medium">
                        Price
                        <select name="price" defaultValue={filters.price} className="rounded-md border border-border bg-background px-3 py-2">
                            <option value="">All prices</option>
                            <option value="free">Free</option>
                            <option value="paid">Paid</option>
                        </select>
                    </label>
                    <label className="grid gap-1 text-sm font-medium">
                        Currency
                        <select name="currency" defaultValue={filters.currency} className="rounded-md border border-border bg-background px-3 py-2">
                            <option value="">All currencies</option>
                            <option value="ETB">ETB</option>
                            <option value="USD">USD</option>
                        </select>
                    </label>
                    <label className="grid gap-1 text-sm font-medium">
                        Sort
                        <select name="sort" defaultValue={filters.sort} className="rounded-md border border-border bg-background px-3 py-2">
                            <option value="relevance">Relevance</option>
                            <option value="newest">Newest</option>
                            <option value="price_asc">Price: low to high</option>
                            <option value="price_desc">Price: high to low</option>
                        </select>
                    </label>
                    <button className="self-end rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Apply filters</button>
                </form>

                <section aria-label="Marketplace products" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {products.data.map((product) => (
                        <article key={product.id} className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm">
                            {product.preview_images[0] && (
                                <img
                                    src={product.preview_images[0]}
                                    alt={`${product.name} preview`}
                                    className="mb-4 aspect-video w-full rounded-lg object-cover"
                                    loading="lazy"
                                />
                            )}
                            <div className="flex items-center justify-between gap-2">
                                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground capitalize">
                                    {product.category} · {product.type}
                                </span>
                                <span className="text-sm font-semibold text-foreground">{priceLabel(product)}</span>
                            </div>
                            <h2 className="mt-4 text-xl font-semibold text-foreground">{product.name}</h2>
                            <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{product.description}</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {product.tech_stack.slice(0, 5).map((technology) => (
                                    <span key={technology} className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                                        {technology}
                                    </span>
                                ))}
                            </div>
                            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                                <span>
                                    {product.contributor
                                        ? `By ${product.contributor}${product.contributor_badge ? ' · Featured contributor' : ''}`
                                        : 'Hailab curated'}
                                </span>
                                <Link
                                    href={route('marketplace.show', product.slug)}
                                    className="font-semibold text-foreground underline underline-offset-4"
                                >
                                    Details
                                </Link>
                            </div>
                        </article>
                    ))}
                </section>

                {products.data.length === 0 && (
                    <p className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
                        No published marketplace listings yet.
                    </p>
                )}
                {products.links.length > 3 && (
                    <nav aria-label="Marketplace pages" className="flex flex-wrap gap-2">
                        {products.links.map((link, index) => (
                            <Link
                                key={index}
                                href={link.url ?? '#'}
                                preserveScroll
                                aria-disabled={!link.url}
                                className={`rounded border border-border px-3 py-2 text-sm ${link.active ? 'bg-primary text-primary-foreground' : 'bg-card'} ${link.url ? '' : 'pointer-events-none opacity-50'}`}
                            >
                                {link.label.replace(/<[^>]*>/g, '')}
                            </Link>
                        ))}
                    </nav>
                )}

                {canReview && <section className="rounded-xl border border-border bg-card p-6">
                    <h2 className="text-xl font-semibold text-foreground">Contribute a template</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Submissions are private until reviewed and approved. Do not include secrets in submitted project files.
                    </p>
                    {authenticated ? (
                        <>
                            <form onSubmit={submitTemplate} className="mt-5 grid gap-4 md:grid-cols-2">
                                <label className="grid gap-1 text-sm font-medium">
                                    Listing type
                                    <select name="type" required className="rounded-md border border-border bg-background px-3 py-2">
                                        <option value="template">Template</option>
                                        <option value="bundle">Bundle</option>
                                    </select>
                                </label>
                                <label className="grid gap-1 text-sm font-medium">
                                    Category
                                    <select name="category" required className="rounded-md border border-border bg-background px-3 py-2">
                                        <option value="development">Development</option>
                                        <option value="funnels">Funnels</option>
                                        <option value="automation">Automation</option>
                                        <option value="content">Content</option>
                                        <option value="marketing">Marketing</option>
                                        <option value="other">Other</option>
                                    </select>
                                </label>
                                <label className="grid gap-1 text-sm font-medium">
                                    Name
                                    <input name="name" required maxLength={150} className="rounded-md border border-border bg-background px-3 py-2" />
                                </label>
                                {workspaces.length > 0 && (
                                    <label className="grid gap-1 text-sm font-medium">
                                        Submit for workspace
                                        <select name="workspace_id" className="rounded-md border border-border bg-background px-3 py-2">
                                            <option value="">My own submission</option>
                                            {workspaces.map((workspace) => (
                                                <option key={workspace.id} value={workspace.id}>
                                                    {workspace.name}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                )}
                                <label className="grid gap-1 text-sm font-medium md:col-span-2">
                                    Description
                                    <textarea
                                        name="description"
                                        required
                                        maxLength={5000}
                                        rows={3}
                                        className="rounded-md border border-border bg-background px-3 py-2"
                                    />
                                </label>
                                <label className="grid gap-1 text-sm font-medium">
                                    Tech stack (comma-separated)
                                    <input
                                        name="tech_stack"
                                        required
                                        placeholder="React, TypeScript, Node.js"
                                        className="rounded-md border border-border bg-background px-3 py-2"
                                    />
                                </label>
                                <label className="grid gap-1 text-sm font-medium">
                                    Included modules (comma-separated)
                                    <input
                                        name="included_modules"
                                        required
                                        placeholder="authentication, testing"
                                        className="rounded-md border border-border bg-background px-3 py-2"
                                    />
                                </label>
                                <label className="grid gap-1 text-sm font-medium">
                                    Version
                                    <input
                                        name="version"
                                        required
                                        defaultValue="1.0.0"
                                        maxLength={50}
                                        className="rounded-md border border-border bg-background px-3 py-2"
                                    />
                                </label>
                                <label className="grid gap-1 text-sm font-medium">
                                    License
                                    <input
                                        name="license"
                                        required
                                        defaultValue="Personal use"
                                        maxLength={100}
                                        className="rounded-md border border-border bg-background px-3 py-2"
                                    />
                                </label>
                                <label className="grid gap-1 text-sm font-medium">
                                    License terms (optional)
                                    <textarea
                                        name="license_terms"
                                        maxLength={10000}
                                        rows={3}
                                        className="rounded-md border border-border bg-background px-3 py-2"
                                    />
                                </label>
                                <label className="grid gap-1 text-sm font-medium">
                                    Documentation URL (HTTPS)
                                    <input name="documentation_url" type="url" className="rounded-md border border-border bg-background px-3 py-2" />
                                </label>
                                <label className="grid gap-1 text-sm font-medium">
                                    Demo URL (HTTPS)
                                    <input name="demo_url" type="url" className="rounded-md border border-border bg-background px-3 py-2" />
                                </label>
                                <label className="grid gap-1 text-sm font-medium">
                                    Compatibility (comma-separated)
                                    <input
                                        name="compatibility"
                                        maxLength={1000}
                                        placeholder="Laravel 13, PHP 8.3+"
                                        className="rounded-md border border-border bg-background px-3 py-2"
                                    />
                                </label>
                                <label className="grid gap-1 text-sm font-medium">
                                    Support information
                                    <textarea
                                        name="support_information"
                                        maxLength={2000}
                                        rows={2}
                                        className="rounded-md border border-border bg-background px-3 py-2"
                                    />
                                </label>
                                <label className="grid gap-1 text-sm font-medium md:col-span-2">
                                    Changelog
                                    <textarea
                                        name="changelog"
                                        maxLength={5000}
                                        rows={2}
                                        className="rounded-md border border-border bg-background px-3 py-2"
                                    />
                                </label>
                                <button
                                    disabled={submitting}
                                    className="w-fit rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                                >
                                    {submitting ? 'Submitting…' : 'Submit for review'}
                                </button>
                            </form>
                            {mySubmissions.length > 0 && (
                                <div className="mt-6 border-t border-border pt-4">
                                    <h3 className="font-semibold">Your submissions</h3>
                                    <ul className="mt-2 space-y-2 text-sm">
                                        {mySubmissions.map((submission) => (
                                            <li key={submission.id} className="flex justify-between gap-4">
                                                <span>
                                                    {submission.name}
                                                    {submission.workspace ? ` · ${submission.workspace}` : ''}
                                                </span>
                                                <span className="text-muted-foreground capitalize">{submission.status.replace('_', ' ')}</span>
                                                {submission.can_edit && (
                                                    <Link
                                                        href={route('marketplace.contributor-listings.edit', submission.id)}
                                                        className="font-medium underline"
                                                    >
                                                        Edit
                                                    </Link>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </>
                    ) : (
                        <Link href={route('login')} className="mt-4 inline-block font-medium underline">
                            Sign in to submit a template
                        </Link>
                    )}
                </section>}
            </main>
        </PublicLayout>
    );
}
