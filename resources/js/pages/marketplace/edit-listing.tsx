import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';

interface Product {
    id: number;
    name: string;
    description: string;
    category: string;
    tech_stack: string[];
    included_modules: string[];
    version: string;
    changelog: string | null;
    license: string;
    license_terms: string | null;
    documentation_url: string | null;
    demo_url: string | null;
    compatibility: string;
    support_information: string | null;
    status: string;
}

export default function MarketplaceEditListing({ product, categories }: { product: Product; categories: string[] }) {
    const form = useForm({
        name: product.name,
        description: product.description,
        category: product.category,
        tech_stack: product.tech_stack,
        included_modules: product.included_modules,
        version: product.version,
        changelog: product.changelog ?? '',
        license: product.license,
        license_terms: product.license_terms ?? '',
        documentation_url: product.documentation_url ?? '',
        demo_url: product.demo_url ?? '',
        compatibility: product.compatibility,
        support_information: product.support_information ?? '',
    });
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Marketplace', href: route('marketplace.index') },
        { title: 'Edit listing', href: route('marketplace.contributor-listings.edit', product.id) },
    ];

    const save = (event: FormEvent) => {
        event.preventDefault();
        form.put(route('marketplace.contributor-listings.update', product.id));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${product.name}`} />
            <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6">
                <header>
                    <h1 className="text-2xl font-bold">Edit listing</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Current status: {product.status.replaceAll('_', ' ')}. Saving sends changes to review and hides this listing until it is
                        approved.
                    </p>
                </header>
                {Object.keys(form.errors).length > 0 && (
                    <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                        {Object.entries(form.errors).map(([field, message]) => (
                            <p key={field}>{message}</p>
                        ))}
                    </div>
                )}
                <form onSubmit={save} className="grid gap-4 rounded-xl border border-border bg-card p-5 md:grid-cols-2">
                    <label className="grid gap-1 text-sm font-medium">
                        Name
                        <input
                            value={form.data.name}
                            onChange={(event) => form.setData('name', event.target.value)}
                            maxLength={150}
                            required
                            className="rounded-md border border-border bg-background px-3 py-2"
                        />
                    </label>
                    <label className="grid gap-1 text-sm font-medium">
                        Category
                        <select
                            value={form.data.category}
                            onChange={(event) => form.setData('category', event.target.value)}
                            className="rounded-md border border-border bg-background px-3 py-2"
                        >
                            {categories.map((category) => (
                                <option key={category} value={category}>
                                    {category}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="grid gap-1 text-sm font-medium md:col-span-2">
                        Description
                        <textarea
                            value={form.data.description}
                            onChange={(event) => form.setData('description', event.target.value)}
                            maxLength={5000}
                            required
                            rows={4}
                            className="rounded-md border border-border bg-background px-3 py-2"
                        />
                    </label>
                    <label className="grid gap-1 text-sm font-medium">
                        Technology stack (comma-separated)
                        <input
                            value={form.data.tech_stack.join(', ')}
                            onChange={(event) =>
                                form.setData(
                                    'tech_stack',
                                    event.target.value
                                        .split(',')
                                        .map((value) => value.trim())
                                        .filter(Boolean),
                                )
                            }
                            required
                            className="rounded-md border border-border bg-background px-3 py-2"
                        />
                    </label>
                    <label className="grid gap-1 text-sm font-medium">
                        Included modules (comma-separated)
                        <input
                            value={form.data.included_modules.join(', ')}
                            onChange={(event) =>
                                form.setData(
                                    'included_modules',
                                    event.target.value
                                        .split(',')
                                        .map((value) => value.trim())
                                        .filter(Boolean),
                                )
                            }
                            required
                            className="rounded-md border border-border bg-background px-3 py-2"
                        />
                    </label>
                    <label className="grid gap-1 text-sm font-medium">
                        Version
                        <input
                            value={form.data.version}
                            onChange={(event) => form.setData('version', event.target.value)}
                            maxLength={50}
                            required
                            className="rounded-md border border-border bg-background px-3 py-2"
                        />
                    </label>
                    <label className="grid gap-1 text-sm font-medium">
                        License label
                        <input
                            value={form.data.license}
                            onChange={(event) => form.setData('license', event.target.value)}
                            maxLength={100}
                            required
                            className="rounded-md border border-border bg-background px-3 py-2"
                        />
                    </label>
                    <label className="grid gap-1 text-sm font-medium md:col-span-2">
                        License terms
                        <textarea
                            value={form.data.license_terms}
                            onChange={(event) => form.setData('license_terms', event.target.value)}
                            maxLength={10000}
                            rows={4}
                            className="rounded-md border border-border bg-background px-3 py-2"
                        />
                    </label>
                    <label className="grid gap-1 text-sm font-medium">
                        Documentation URL (HTTPS)
                        <input
                            type="url"
                            value={form.data.documentation_url}
                            onChange={(event) => form.setData('documentation_url', event.target.value)}
                            className="rounded-md border border-border bg-background px-3 py-2"
                        />
                    </label>
                    <label className="grid gap-1 text-sm font-medium">
                        Demo URL (HTTPS)
                        <input
                            type="url"
                            value={form.data.demo_url}
                            onChange={(event) => form.setData('demo_url', event.target.value)}
                            className="rounded-md border border-border bg-background px-3 py-2"
                        />
                    </label>
                    <label className="grid gap-1 text-sm font-medium">
                        Compatibility (comma-separated)
                        <input
                            value={form.data.compatibility}
                            onChange={(event) => form.setData('compatibility', event.target.value)}
                            maxLength={1000}
                            className="rounded-md border border-border bg-background px-3 py-2"
                        />
                    </label>
                    <label className="grid gap-1 text-sm font-medium">
                        Support information
                        <textarea
                            value={form.data.support_information}
                            onChange={(event) => form.setData('support_information', event.target.value)}
                            maxLength={2000}
                            rows={2}
                            className="rounded-md border border-border bg-background px-3 py-2"
                        />
                    </label>
                    <label className="grid gap-1 text-sm font-medium md:col-span-2">
                        Changelog
                        <textarea
                            value={form.data.changelog}
                            onChange={(event) => form.setData('changelog', event.target.value)}
                            maxLength={5000}
                            rows={3}
                            className="rounded-md border border-border bg-background px-3 py-2"
                        />
                    </label>
                    <div className="flex justify-end gap-3 md:col-span-2">
                        <Link href={route('marketplace.index')} className="rounded-md border border-border px-4 py-2 text-sm font-medium">
                            Cancel
                        </Link>
                        <button
                            disabled={form.processing}
                            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                        >
                            {form.processing ? 'Submitting…' : 'Save and submit for review'}
                        </button>
                    </div>
                </form>
            </main>
        </AppLayout>
    );
}
