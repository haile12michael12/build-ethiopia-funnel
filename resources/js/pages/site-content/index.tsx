import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type SiteContent, type SiteContentType } from '@/types/site-content';
import { Head, Link, router } from '@inertiajs/react';
import { FileText, Plus, Search, Trash2 } from 'lucide-react';
import { FormEvent, useState } from 'react';

interface Paginated<T> {
    data: T[];
    links: Array<{ url: string | null; label: string; active: boolean }>;
    total: number;
}

interface ContentIndexProps {
    type: SiteContentType;
    label: string;
    entries: Paginated<SiteContent>;
    search: string;
}

const breadcrumbFor = (label: string, type: string): BreadcrumbItem[] => [
    { title: 'Content', href: '/dashboard' },
    { title: label, href: `/site-content/${type}` },
];

export default function SiteContentIndex({ type, label, entries, search }: ContentIndexProps) {
    const [term, setTerm] = useState(search);

    const submitSearch = (event: FormEvent) => {
        event.preventDefault();
        router.get(route('site-content.index', type), { search: term || undefined }, { preserveState: true, preserveScroll: true });
    };

    const deleteEntry = (entry: SiteContent) => {
        if (window.confirm(`Delete "${entry.title_en}"? This cannot be undone.`)) {
            router.delete(route('site-content.destroy', { type, entry: entry.id }), { preserveScroll: true });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbFor(label, type)}>
            <Head title={`${label} Management`} />
            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{label}</h1>
                        <p className="mt-1 text-sm text-muted-foreground">Manage bilingual content, publishing, and search metadata.</p>
                    </div>
                    <Button asChild>
                        <Link href={route('site-content.create', type)}>
                            <Plus className="mr-2 h-4 w-4" />
                            New {label.slice(0, -1)}
                        </Link>
                    </Button>
                </div>

                <form onSubmit={submitSearch} className="flex max-w-lg gap-2">
                    <Input value={term} onChange={(event) => setTerm(event.target.value)} placeholder={`Search ${label.toLowerCase()}...`} />
                    <Button type="submit" variant="outline">
                        <Search className="h-4 w-4" />
                    </Button>
                </form>

                <div className="overflow-hidden rounded-xl border border-border bg-card">
                    {entries.data.length ? (
                        <div className="divide-y divide-border">
                            {entries.data.map((entry) => (
                                <div key={entry.id} className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center">
                                    <div className="flex min-w-0 items-center gap-3">
                                        {entry.image ? (
                                            <img src={entry.image} alt="" className="h-12 w-16 rounded-md object-cover" />
                                        ) : (
                                            <FileText className="h-8 w-8 shrink-0 text-muted-foreground" />
                                        )}
                                        <div className="min-w-0">
                                            <p className="truncate font-medium text-foreground">{entry.title_en}</p>
                                            <p className="truncate text-sm text-muted-foreground">
                                                /{type === 'blog' ? 'blog/' : type === 'page' ? 'p/' : ''}
                                                {entry.slug}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span
                                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${entry.status === 'published' ? 'bg-green-500/10 text-green-600' : 'bg-muted text-muted-foreground'}`}
                                        >
                                            {entry.status}
                                        </span>
                                        <Button asChild size="sm" variant="outline">
                                            <Link href={route('site-content.edit', { type, entry: entry.id })}>Edit</Link>
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            aria-label={`Delete ${entry.title_en}`}
                                            onClick={() => deleteEntry(entry)}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-12 text-center">
                            <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
                            <p className="mt-3 font-medium">No {label.toLowerCase()} yet</p>
                            <p className="mt-1 text-sm text-muted-foreground">Create your first item to publish it on your site.</p>
                        </div>
                    )}
                </div>

                {entries.links.length > 3 && (
                    <div className="flex flex-wrap gap-2">
                        {entries.links.map((link, index) => (
                            <Button key={index} size="sm" variant={link.active ? 'default' : 'outline'} disabled={!link.url} asChild={!!link.url}>
                                {link.url ? (
                                    <Link href={link.url}>{link.label.replace(/&laquo;/g, '‹').replace(/&raquo;/g, '›')}</Link>
                                ) : (
                                    <span>{link.label.replace(/&laquo;/g, '‹').replace(/&raquo;/g, '›')}</span>
                                )}
                            </Button>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
