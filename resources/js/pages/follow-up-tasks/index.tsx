import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { CalendarClock, Check, ClipboardList } from 'lucide-react';

interface TaskItem {
    id: number;
    title: string;
    description: string | null;
    due_at: string;
    status: 'pending' | 'completed' | 'cancelled';
    completed_at: string | null;
    contact: { id: number; name: string | null; email: string; status: string };
}

interface PageLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface FollowUpTasksProps {
    tasks: { data: TaskItem[]; links: PageLink[]; total: number; from: number | null; to: number | null };
    view: 'overdue' | 'today' | 'upcoming' | 'all';
    counts: { overdue: number; today: number; upcoming: number };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Follow-up tasks', href: route('follow-up-tasks.index') }];
const views: Array<{ key: FollowUpTasksProps['view']; title: string }> = [
    { key: 'overdue', title: 'Overdue' },
    { key: 'today', title: 'Due today' },
    { key: 'upcoming', title: 'Upcoming' },
    { key: 'all', title: 'All tasks' },
];

export default function FollowUpTasks({ tasks, view, counts }: FollowUpTasksProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Follow-up tasks" />
            <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6">
                <header>
                    <h1 className="text-2xl font-bold text-foreground">Follow-up tasks</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Internal task tracking only; no reminder notification or message is sent.</p>
                </header>
                <nav className="flex flex-wrap gap-2" aria-label="Task views">
                    {views.map((item) => (
                        <Link
                            key={item.key}
                            href={route('follow-up-tasks.index', { view: item.key })}
                            className={`rounded-lg border px-3 py-2 text-sm font-medium ${view === item.key ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:text-foreground'}`}
                        >
                            {item.title}
                            {item.key !== 'all' && <span className="ml-2 tabular-nums">{counts[item.key]}</span>}
                        </Link>
                    ))}
                </nav>
                <section className="overflow-hidden rounded-xl border border-border bg-card">
                    {tasks.data.map((task) => (
                        <article
                            key={task.id}
                            className="flex flex-col gap-4 border-b border-border p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                        >
                            <div className="min-w-0">
                                <h2 className="font-semibold text-foreground">{task.title}</h2>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {task.due_at} · {task.status}
                                </p>
                                {task.description && <p className="mt-2 text-sm whitespace-pre-wrap text-muted-foreground">{task.description}</p>}
                                <Link
                                    href={route('contacts.show', task.contact.id)}
                                    className="mt-2 inline-block text-sm text-primary hover:underline"
                                >
                                    {task.contact.name || task.contact.email} · {task.contact.email}
                                </Link>
                            </div>
                            {task.status === 'pending' && (
                                <div className="flex shrink-0 gap-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            router.patch(route('follow-up-tasks.update', task.id), { status: 'completed' }, { preserveScroll: true })
                                        }
                                        className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
                                    >
                                        <Check className="h-4 w-4" /> Complete
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (window.confirm('Cancel this follow-up task?')) {
                                                router.patch(
                                                    route('follow-up-tasks.update', task.id),
                                                    { status: 'cancelled' },
                                                    { preserveScroll: true },
                                                );
                                            }
                                        }}
                                        className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </article>
                    ))}
                    {tasks.data.length === 0 && (
                        <div className="px-6 py-14 text-center">
                            {tasks.total === 0 ? (
                                <CalendarClock className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
                            ) : (
                                <ClipboardList className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
                            )}
                            <p className="font-medium text-foreground">No tasks in this view</p>
                            <p className="mt-1 text-sm text-muted-foreground">Create a follow-up from a lead's detail page.</p>
                        </div>
                    )}
                </section>
                {tasks.links.length > 3 && (
                    <nav className="flex flex-wrap justify-center gap-1" aria-label="Task pages">
                        {tasks.links.map((link, index) =>
                            link.url ? (
                                <Link
                                    key={`${link.label}-${index}`}
                                    href={link.url}
                                    preserveScroll
                                    className={`rounded-md border px-3 py-1.5 text-sm ${link.active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:bg-muted'}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ) : (
                                <span
                                    key={`${link.label}-${index}`}
                                    className="px-3 py-1.5 text-sm text-muted-foreground"
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ),
                        )}
                    </nav>
                )}
            </main>
        </AppLayout>
    );
}
