import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEvent } from 'react';

interface WorkspaceSettings {
    id: number;
    name: string;
    description: string | null;
    type: string;
    country: string | null;
    language: string;
    timezone: string;
    market: string;
    currency: string;
}

interface Props {
    workspace: WorkspaceSettings;
}

export default function WorkspaceSettingsPage({ workspace }: Props) {
    const form = useForm({
        name: workspace.name,
        description: workspace.description ?? '',
        type: workspace.type,
        country: workspace.country ?? '',
        language: workspace.language,
        timezone: workspace.timezone,
        market: workspace.market,
        currency: workspace.currency,
    });
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Workspaces', href: route('workspaces.index') },
        { title: workspace.name, href: route('workspaces.settings.edit', workspace.id) },
        { title: 'Settings', href: route('workspaces.settings.edit', workspace.id) },
    ];

    const save = (event: FormEvent) => {
        event.preventDefault();
        form.put(route('workspaces.settings.update', workspace.id));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${workspace.name} settings`} />
            <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
                <header>
                    <h1 className="text-2xl font-bold">Workspace settings</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Manage workspace identity and regional defaults.</p>
                </header>

                {Object.keys(form.errors).length > 0 && (
                    <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                        {Object.entries(form.errors).map(([field, message]) => (
                            <p key={field}>{message}</p>
                        ))}
                    </div>
                )}

                <form onSubmit={save} className="grid gap-5 rounded-xl border border-border bg-card p-5">
                    <label className="grid gap-2 text-sm font-medium">
                        Workspace name
                        <input
                            value={form.data.name}
                            onChange={(event) => form.setData('name', event.target.value)}
                            required
                            maxLength={150}
                            className="h-10 rounded-md border border-input bg-background px-3"
                        />
                    </label>
                    <label className="grid gap-2 text-sm font-medium">
                        Description
                        <textarea
                            value={form.data.description}
                            onChange={(event) => form.setData('description', event.target.value)}
                            maxLength={2000}
                            rows={4}
                            className="rounded-md border border-input bg-background px-3 py-2"
                        />
                    </label>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="grid gap-2 text-sm font-medium">
                            Workspace type
                            <select
                                value={form.data.type}
                                onChange={(event) => form.setData('type', event.target.value)}
                                className="h-10 rounded-md border border-input bg-background px-3"
                            >
                                <option value="agency">Agency</option>
                                <option value="freelancer">Freelancer</option>
                                <option value="creator">Creator</option>
                                <option value="other">Other</option>
                            </select>
                        </label>
                        <label className="grid gap-2 text-sm font-medium">
                            Country code
                            <input
                                value={form.data.country}
                                onChange={(event) => form.setData('country', event.target.value.toUpperCase())}
                                maxLength={2}
                                placeholder="ET"
                                className="h-10 rounded-md border border-input bg-background px-3"
                            />
                        </label>
                        <label className="grid gap-2 text-sm font-medium">
                            Default language
                            <select
                                value={form.data.language}
                                onChange={(event) => form.setData('language', event.target.value)}
                                className="h-10 rounded-md border border-input bg-background px-3"
                            >
                                <option value="en">English</option>
                                <option value="am">Amharic</option>
                            </select>
                        </label>
                        <label className="grid gap-2 text-sm font-medium">
                            Timezone
                            <input
                                value={form.data.timezone}
                                onChange={(event) => form.setData('timezone', event.target.value)}
                                required
                                maxLength={64}
                                placeholder="Africa/Addis_Ababa"
                                className="h-10 rounded-md border border-input bg-background px-3"
                            />
                        </label>
                        <label className="grid gap-2 text-sm font-medium">
                            Primary market
                            <select
                                value={form.data.market}
                                onChange={(event) => form.setData('market', event.target.value)}
                                className="h-10 rounded-md border border-input bg-background px-3"
                            >
                                <option value="ethiopia">Ethiopia</option>
                                <option value="international">International</option>
                            </select>
                        </label>
                        <label className="grid gap-2 text-sm font-medium">
                            Default currency
                            <select
                                value={form.data.currency}
                                onChange={(event) => form.setData('currency', event.target.value)}
                                className="h-10 rounded-md border border-input bg-background px-3"
                            >
                                <option value="ETB">ETB</option>
                                <option value="USD">USD</option>
                            </select>
                        </label>
                    </div>
                    <div className="flex justify-end gap-3">
                        <Link href={route('workspaces.index')} className="rounded-md border border-border px-4 py-2 text-sm font-medium">
                            Back
                        </Link>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
                        >
                            {form.processing ? 'Saving…' : 'Save settings'}
                        </button>
                    </div>
                </form>
            </main>
        </AppLayout>
    );
}
