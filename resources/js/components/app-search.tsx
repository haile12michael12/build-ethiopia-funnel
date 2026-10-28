import { type SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { CalendarCheck2, Loader2, Search, Users, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface SearchResultItem {
    id: string;
    title: string;
    detail: string;
    url: string;
}

interface SearchResponse {
    query: string;
    groups: {
        contacts: SearchResultItem[];
        funnels: SearchResultItem[];
        bookings: SearchResultItem[];
    };
}

const GROUPS: Array<{ key: keyof SearchResponse['groups']; label: string; icon: typeof Users }> = [
    { key: 'contacts', label: 'Contacts', icon: Users },
    { key: 'funnels', label: 'Funnels', icon: Zap },
    { key: 'bookings', label: 'Bookings', icon: CalendarCheck2 },
];

/** Owner-only, global search over contacts, funnels, and bookings. */
export function AppSearch() {
    const { auth } = usePage<SharedData>().props;
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResponse['groups'] | null>(null);
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const isOwner = auth?.is_business_owner === true;

    // Debounced remote search.
    useEffect(() => {
        if (!isOwner || query.trim().length < 2) {
            setResults(null);
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setFailed(false);
        const timer = window.setTimeout(() => {
            fetch(`${route('search')}?q=${encodeURIComponent(query.trim())}`, {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            })
                .then((response) => {
                    if (!response.ok) throw new Error('search failed');
                    return response.json();
                })
                .then((data: SearchResponse) => {
                    if (!cancelled) setResults(data.groups);
                })
                .catch(() => {
                    if (!cancelled) setFailed(true);
                })
                .finally(() => {
                    if (!cancelled) setLoading(false);
                });
        }, 250);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [query, isOwner]);

    // Close on outside click / Escape.
    useEffect(() => {
        if (!open) return;

        const onPointerDown = (event: PointerEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    if (!isOwner) return null;

    const resultCount = results ? GROUPS.reduce((sum, group) => sum + results[group.key].length, 0) : 0;

    const go = (url: string) => {
        setOpen(false);
        setQuery('');
        setResults(null);
        router.visit(url);
    };

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                aria-label="Search contacts, funnels, and bookings"
                aria-expanded={open}
                className="group inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-accent-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
                <Search className="size-5 opacity-80 group-hover:opacity-100" />
            </button>

            {open && (
                <div className="absolute top-full right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-popover shadow-xl sm:w-96">
                    <div className="flex items-center gap-2 border-b border-border px-3">
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        ) : (
                            <Search className="h-4 w-4 text-muted-foreground" />
                        )}
                        <input
                            autoFocus
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Search contacts, funnels, bookings…"
                            aria-label="Global search"
                            className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                        />
                        <kbd className="hidden rounded border border-border px-1.5 text-[10px] text-muted-foreground sm:inline">Esc</kbd>
                    </div>

                    <div className="max-h-80 overflow-y-auto p-1.5">
                        {failed && <p className="px-3 py-6 text-center text-sm text-destructive">Search failed — try again.</p>}

                        {!failed && query.trim().length < 2 && (
                            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Type at least 2 characters.</p>
                        )}

                        {!failed && results && resultCount === 0 && (
                            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No results for “{query.trim()}”.</p>
                        )}

                        {!failed &&
                            results &&
                            GROUPS.map((group) =>
                                results[group.key].length === 0 ? null : (
                                    <div key={group.key} className="py-1">
                                        <p className="px-3 py-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                                            {group.label}
                                        </p>
                                        {results[group.key].map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => go(item.url)}
                                                className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-accent"
                                            >
                                                <group.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                                                <span className="min-w-0">
                                                    <span className="block truncate text-sm font-medium text-foreground">{item.title}</span>
                                                    <span className="block truncate text-xs text-muted-foreground">{item.detail}</span>
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                ),
                            )}
                    </div>
                </div>
            )}
        </div>
    );
}
