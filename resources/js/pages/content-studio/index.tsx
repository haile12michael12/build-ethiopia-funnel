import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { CalendarClock, FileText, Plus, Search, Settings2 } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface Draft {
    id: number;
    title: string;
    body: string | null;
    content_type: string;
    platform: string;
    status: string;
    scheduled_at: string | null;
    published_at: string | null;
    updated_at: string;
    portfolio_project: { id: number; title_en: string } | null;
}

interface Paginated<T> {
    data: T[];
    links: Array<{ url: string | null; label: string; active: boolean }>;
    total: number;
}

interface Props {
    drafts: Paginated<Draft>;
    filters: { search: string; status: string; platform: string };
    statuses: string[];
    platforms: Record<string, string>;
    counts: Record<string, number>;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/admin' },
    { title: 'Content Studio', href: '/admin/content-studio' },
];

const statusLabel: Record<string, string> = {
    idea: 'Idea',
    draft: 'Draft',
    in_review: 'In review',
    approved: 'Approved',
    scheduled: 'Scheduled',
    published: 'Published',
    failed: 'Failed',
    archived: 'Archived',
};

export default function ContentStudioIndex({ drafts, filters, statuses, platforms, counts }: Props) {
    const [search, setSearch] = useState(filters.search);
    const [status, setStatus] = useState(filters.status);
    const [platform, setPlatform] = useState(filters.platform);

    const applyFilters = (event: FormEvent) => {
        event.preventDefault();
        router.get(route('content-studio.index'), { search: search || undefined, status: status || undefined, platform: platform || undefined }, { preserveState: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Content Studio" />
            <main className="flex flex-1 flex-col gap-6 p-6">
                <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-2xl font-bold">Agency Content Studio</h1>
                        <p className="mt-1 text-sm text-muted-foreground">Create private drafts, review them, and track manual publication.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button asChild variant="outline">
                            <Link href={route('content-studio.settings')}><Settings2 className="mr-2 h-4 w-4" />Brand settings</Link>
                        </Button>
                        <Button asChild>
                            <Link href={route('content-studio.create')}><Plus className="mr-2 h-4 w-4" />Create content</Link>
                        </Button>
                    </div>
                </header>

                <section aria-label="Content status counts" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {['idea', 'draft', 'in_review', 'scheduled'].map((key) => (
                        <div key={key} className="rounded-xl border border-border bg-card p-4">
                            <p className="text-sm text-muted-foreground">{statusLabel[key]}</p>
                            <p className="mt-1 text-2xl font-semibold">{counts[key] ?? 0}</p>
                        </div>
                    ))}
                </section>

                <form onSubmit={applyFilters} className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 md:flex-row">
                    <Input aria-label="Search content" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title or copy" />
                    <select aria-label="Filter by status" className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}>
                        <option value="">All statuses</option>
                        {statuses.map((item) => <option key={item} value={item}>{statusLabel[item] ?? item}</option>)}
                    </select>
                    <select aria-label="Filter by platform" className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={platform} onChange={(event) => setPlatform(event.target.value)}>
                        <option value="">All platforms</option>
                        {Object.entries(platforms).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                    </select>
                    <Button type="submit" variant="outline"><Search className="mr-2 h-4 w-4" />Filter</Button>
                </form>

                <section className="overflow-hidden rounded-xl border border-border bg-card">
                    {drafts.data.length ? (
                        <div className="divide-y divide-border">
                            {drafts.data.map((draft) => (
                                <article key={draft.id} className="flex flex-col justify-between gap-4 p-4 lg:flex-row lg:items-start">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="font-semibold">{draft.title}</h2>
                                            <Badge variant="outline">{statusLabel[draft.status] ?? draft.status}</Badge>
                                        </div>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {draft.content_type.replaceAll('_', ' ')} · {platforms[draft.platform] ?? draft.platform}
                                            {draft.portfolio_project ? ` · Portfolio: ${draft.portfolio_project.title_en}` : ''}
                                        </p>
                                        {draft.scheduled_at && <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground"><CalendarClock className="h-4 w-4" />Manual reminder: {new Date(draft.scheduled_at).toLocaleString()}</p>}
                                        <details className="mt-3">
                                            <summary className="w-fit cursor-pointer text-sm font-medium text-primary">Preview draft</summary>
                                            <p className="mt-2 max-w-3xl whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm">{draft.body || 'No copy yet.'}</p>
                                        </details>
                                    </div>
                                    <Button asChild variant="outline"><Link href={route('content-studio.edit', draft.id)}>Open</Link></Button>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <div className="p-12 text-center">
                            <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
                            <p className="mt-3 font-medium">No content matches these filters.</p>
                            <p className="mt-1 text-sm text-muted-foreground">Create an idea or generate an editable draft using configured AI.</p>
                            <Button asChild className="mt-4"><Link href={route('content-studio.create')}>Create content</Link></Button>
                        </div>
                    )}
                </section>

                {drafts.links.length > 3 && (
                    <nav aria-label="Content pages" className="flex flex-wrap gap-2">
                        {drafts.links.map((link, index) => (
                            <Button key={index} size="sm" variant={link.active ? 'default' : 'outline'} disabled={!link.url} asChild={Boolean(link.url)}>
                                {link.url ? <Link href={link.url}>{link.label.replace(/&laquo;/g, '‹').replace(/&raquo;/g, '›')}</Link> : <span>{link.label}</span>}
                            </Button>
                        ))}
                    </nav>
                )}
            </main>
        </AppLayout>
    );
}
