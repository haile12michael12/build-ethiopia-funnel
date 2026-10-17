import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';

interface Product {
    id: number;
    slug: string;
    type: 'template' | 'bundle' | 'membership';
    name: string;
    description: string;
    preview_images: string[];
    tech_stack: string[];
    amount_minor: number | null;
    currency: string;
    included_modules: string[];
    version: string;
    changelog: string | null;
    license: string;
    contributor: string | null;
    contributor_badge: boolean;
    bundle_items: Array<{ id: number; name: string; slug: string }>;
}

interface MarketplaceShowProps {
    product: Product;
    authenticated: boolean;
    hasAccess: boolean;
    checkoutEnabled: boolean;
}

export default function MarketplaceShow({ product, authenticated, hasAccess, checkoutEnabled }: MarketplaceShowProps) {
    const [checkingOut, setCheckingOut] = useState(false);
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Marketplace', href: route('marketplace.index') },
        { title: product.name, href: route('marketplace.show', product.slug) },
    ];
    const price =
        product.amount_minor === null
            ? 'Price to be configured'
            : product.amount_minor === 0
              ? 'Free'
              : `${product.currency} ${(product.amount_minor / 100).toFixed(2)}`;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${product.name} · Marketplace`} />
            <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
                <Link href={route('marketplace.index')} className="w-fit text-sm text-muted-foreground underline">
                    ← Back to marketplace
                </Link>
                <header className="rounded-xl border border-border bg-card p-6">
                    {product.preview_images[0] && (
                        <img
                            src={product.preview_images[0]}
                            alt={`${product.name} preview`}
                            className="mb-6 aspect-video w-full rounded-lg object-cover"
                        />
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground capitalize">{product.type}</span>
                        <span className="text-xl font-bold text-foreground">{price}</span>
                    </div>
                    <h1 className="mt-4 text-3xl font-bold text-foreground">{product.name}</h1>
                    <p className="mt-3 leading-7 text-muted-foreground">{product.description}</p>
                    <p className="mt-4 text-sm text-muted-foreground">
                        Version {product.version} · {product.license}
                        {product.contributor
                            ? ` · By ${product.contributor}${product.contributor_badge ? ' (featured contributor)' : ''}`
                            : ' · Hailab curated'}
                    </p>
                    {product.type === 'membership' ? (
                        <p className="mt-5 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                            Membership plans are listed for discovery, but recurring billing and access activation are not available until a supported
                            recurring-payment integration is configured.
                        </p>
                    ) : hasAccess ? (
                        product.type === 'template' ? (
                            <Link
                                href={route('marketplace.download', product.slug)}
                                className="mt-5 inline-block rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground"
                            >
                                Download your template
                            </Link>
                        ) : (
                            <p className="mt-5 rounded-lg bg-muted p-4 text-sm">You have access to this bundle and its included templates.</p>
                        )
                    ) : checkoutEnabled ? (
                        authenticated ? (
                            <button
                                disabled={checkingOut}
                                onClick={() => {
                                    setCheckingOut(true);
                                    router.post(route('marketplace.checkout', product.slug), {}, { onFinish: () => setCheckingOut(false) });
                                }}
                                className="mt-5 rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground disabled:opacity-50"
                            >
                                {checkingOut ? 'Opening Chapa…' : `Purchase for ${price}`}
                            </button>
                        ) : (
                            <Link
                                href={route('login')}
                                className="mt-5 inline-block rounded-md bg-primary px-4 py-2 font-semibold text-primary-foreground"
                            >
                                Sign in to purchase
                            </Link>
                        )
                    ) : (
                        <p className="mt-5 rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                            Checkout is unavailable until the listing has a configured price and download artifact, and Chapa credentials are set on
                            the server.
                        </p>
                    )}
                </header>

                <section className="grid gap-5 rounded-xl border border-border bg-card p-6 md:grid-cols-2">
                    <div>
                        <h2 className="font-semibold">Technology stack</h2>
                        <ul className="mt-3 flex flex-wrap gap-2">
                            {product.tech_stack.map((item) => (
                                <li key={item} className="rounded bg-muted px-2.5 py-1 text-sm">
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h2 className="font-semibold">Included modules</h2>
                        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                            {product.included_modules.map((item) => (
                                <li key={item}>{item.replaceAll('-', ' ')}</li>
                            ))}
                        </ul>
                    </div>
                </section>

                {product.type === 'bundle' && product.bundle_items.length > 0 && (
                    <section className="rounded-xl border border-border bg-card p-6">
                        <h2 className="font-semibold">Bundle contents</h2>
                        <ul className="mt-3 space-y-2">
                            {product.bundle_items.map((item) => (
                                <li key={item.id}>
                                    <Link className="underline" href={route('marketplace.show', item.slug)}>
                                        {item.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
                {product.changelog && (
                    <section className="rounded-xl border border-border bg-card p-6">
                        <h2 className="font-semibold">Changelog</h2>
                        <p className="mt-2 text-sm whitespace-pre-wrap text-muted-foreground">{product.changelog}</p>
                    </section>
                )}
            </main>
        </AppLayout>
    );
}
