import { type SharedData } from '@/types';
import { router, usePage } from '@inertiajs/react';
import { Bell, CalendarCheck2, CalendarClock, Clock3, Workflow } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface NotificationItem {
    id: string;
    type: 'booking_new' | 'booking_today' | 'task_overdue' | 'automation_failed';
    title: string;
    detail: string;
    url: string;
    occurred_at: string;
}

interface NotificationsResponse {
    count: number;
    items: NotificationItem[];
    generated_at: string;
}

const TYPE_ICONS: Record<NotificationItem['type'], typeof Bell> = {
    booking_new: CalendarCheck2,
    booking_today: CalendarClock,
    task_overdue: Clock3,
    automation_failed: Workflow,
};

const TYPE_TONES: Record<NotificationItem['type'], string> = {
    booking_new: 'bg-green-500/10 text-green-600 dark:text-green-400',
    booking_today: 'bg-primary/10 text-primary',
    task_overdue: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    automation_failed: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

function timeAgo(iso: string): string {
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

/**
 * Owner-only header bell. Items are derived live server-side — new bookings,
 * today's meetings, overdue follow-ups, and failed automation runs — so no
 * read-state storage is required.
 */
export function AppNotifications() {
    const { auth } = usePage<SharedData>().props;
    const [open, setOpen] = useState(false);
    const [data, setData] = useState<NotificationsResponse | null>(null);
    const [failed, setFailed] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const isOwner = auth?.is_business_owner === true;

    const load = () => {
        fetch(route('app-notifications.index'), {
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        })
            .then((response) => {
                if (!response.ok) throw new Error('notifications failed');
                return response.json();
            })
            .then((payload: NotificationsResponse) => {
                setData(payload);
                setFailed(false);
            })
            .catch(() => setFailed(true));
    };

    // Load the badge count on mount and refresh it periodically.
    useEffect(() => {
        if (!isOwner) return;
        load();
        const interval = window.setInterval(load, 60_000);
        return () => window.clearInterval(interval);
    }, [isOwner]);

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

    const count = data?.count ?? 0;

    const openItem = (url: string) => {
        setOpen(false);
        router.visit(url);
    };

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                onClick={() => {
                    const next = !open;
                    setOpen(next);
                    if (next) load();
                }}
                aria-label={`Notifications${count > 0 ? ` (${count})` : ''}`}
                aria-expanded={open}
                className="group relative inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md text-accent-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
                <Bell className="size-5 opacity-80 group-hover:opacity-100" />
                {count > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white tabular-nums">
                        {count > 99 ? '99+' : count}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute top-full right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-border bg-popover shadow-xl sm:w-96">
                    <div className="flex items-center justify-between border-b border-border px-3 py-2">
                        <p className="text-sm font-semibold text-foreground">Notifications</p>
                        <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
                    </div>

                    <div className="max-h-96 overflow-y-auto p-1.5">
                        {failed && <p className="px-3 py-6 text-center text-sm text-destructive">Could not load notifications.</p>}

                        {!failed && count === 0 && (
                            <div className="px-3 py-8 text-center">
                                <Bell className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                                <p className="text-sm font-medium text-foreground">You're all caught up</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    New bookings, overdue tasks, and automation failures appear here.
                                </p>
                            </div>
                        )}

                        {!failed &&
                            data?.items.map((item) => {
                                const Icon = TYPE_ICONS[item.type] ?? Bell;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => openItem(item.url)}
                                        className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent"
                                    >
                                        <span className={`mt-0.5 rounded-md p-1.5 ${TYPE_TONES[item.type]}`}>
                                            <Icon className="h-4 w-4" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block truncate text-sm font-medium text-foreground">{item.title}</span>
                                            <span className="block truncate text-xs text-muted-foreground">{item.detail}</span>
                                        </span>
                                        <span className="shrink-0 text-[10px] text-muted-foreground">{timeAgo(item.occurred_at)}</span>
                                    </button>
                                );
                            })}
                    </div>
                </div>
            )}
        </div>
    );
}
