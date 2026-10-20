import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { BriefcaseBusiness, Calendar, CheckCircle2, Clock, Filter, FolderKanban, Plus, Search, User } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Client Delivery', href: '/client-projects' },
];

interface ClientProjectItem {
    id: number;
    title: string;
    status: 'planning' | 'in_progress' | 'review' | 'completed' | 'on_hold';
    currency: 'ETB' | 'USD';
    budget_amount: number;
    scope_summary: string | null;
    agreed_deliverables: string[];
    start_date: string | null;
    target_completion_date: string | null;
    completed_at: string | null;
    created_at: string;
    contact: {
        id: number;
        name: string | null;
        email: string;
        phone: string | null;
    } | null;
    milestones: Array<{
        id: number;
        title: string;
        status: string;
    }>;
}

interface Props {
    projects: {
        data: ClientProjectItem[];
        current_page: number;
        last_page: number;
        total: number;
    };
    filters: {
        search: string;
        status: string;
        currency: string;
    };
    statuses: string[];
    currencies: string[];
    counts: Record<string, number>;
}

export default function ClientProjectsIndex({ projects, filters, statuses, currencies, counts }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const [statusFilter, setStatusFilter] = useState(filters.status || '');
    const [currencyFilter, setCurrencyFilter] = useState(filters.currency || '');
    const [createOpen, setCreateOpen] = useState(false);

    const form = useForm({
        title: '',
        status: 'planning',
        currency: 'ETB',
        budget_amount: 0,
        scope_summary: '',
        start_date: new Date().toISOString().slice(0, 10),
        target_completion_date: '',
    });

    const handleFilter = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        router.get(
            route('client-projects.index'),
            {
                search: search || undefined,
                status: statusFilter || undefined,
                currency: currencyFilter || undefined,
            },
            { preserveState: true, preserveScroll: true },
        );
    };

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        form.post(route('client-projects.store'), {
            onSuccess: () => {
                setCreateOpen(false);
                form.reset();
            },
        });
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">Completed</Badge>;
            case 'in_progress':
                return <Badge className="bg-sky-500/10 text-sky-500 hover:bg-sky-500/20">In Progress</Badge>;
            case 'review':
                return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20">Client Review</Badge>;
            case 'on_hold':
                return <Badge className="bg-red-500/10 text-red-500 hover:bg-red-500/20">On Hold</Badge>;
            default:
                return <Badge variant="secondary">Planning</Badge>;
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Client Delivery Projects - Agency OS" />

            <div className="space-y-6 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-foreground">Client Delivery Projects</h1>
                        <p className="text-sm text-muted-foreground">Manage active client engagements, scope, and milestone deliverables.</p>
                    </div>
                    <Button onClick={() => setCreateOpen(true)} className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        New Project
                    </Button>
                </div>

                {/* Metric Summary */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div className="rounded-xl border border-border bg-card p-4">
                        <p className="text-xs font-medium text-muted-foreground">Total Projects</p>
                        <p className="mt-1 text-2xl font-bold text-foreground">{projects.total}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-4">
                        <p className="text-xs font-medium text-muted-foreground">In Progress</p>
                        <p className="mt-1 text-2xl font-bold text-sky-500">{counts['in_progress'] || 0}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-4">
                        <p className="text-xs font-medium text-muted-foreground">In Planning</p>
                        <p className="mt-1 text-2xl font-bold text-foreground">{counts['planning'] || 0}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-card p-4">
                        <p className="text-xs font-medium text-muted-foreground">Completed</p>
                        <p className="mt-1 text-2xl font-bold text-emerald-500">{counts['completed'] || 0}</p>
                    </div>
                </div>

                {/* Filters */}
                <form onSubmit={handleFilter} className="flex flex-wrap items-center gap-3">
                    <div className="relative min-w-[240px] flex-1">
                        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search by title, scope, client name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            router.get(
                                route('client-projects.index'),
                                { search: search || undefined, status: e.target.value || undefined, currency: currencyFilter || undefined },
                                { preserveState: true, preserveScroll: true },
                            );
                        }}
                        className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                    >
                        <option value="">All Statuses</option>
                        {statuses.map((st) => (
                            <option key={st} value={st}>
                                {st.replace('_', ' ')}
                            </option>
                        ))}
                    </select>
                    <select
                        value={currencyFilter}
                        onChange={(e) => {
                            setCurrencyFilter(e.target.value);
                            router.get(
                                route('client-projects.index'),
                                { search: search || undefined, status: statusFilter || undefined, currency: e.target.value || undefined },
                                { preserveState: true, preserveScroll: true },
                            );
                        }}
                        className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                    >
                        <option value="">All Currencies</option>
                        {currencies.map((curr) => (
                            <option key={curr} value={curr}>
                                {curr}
                            </option>
                        ))}
                    </select>
                    {(search || statusFilter || currencyFilter) && (
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setSearch('');
                                setStatusFilter('');
                                setCurrencyFilter('');
                                router.get(route('client-projects.index'));
                            }}
                        >
                            Reset
                        </Button>
                    )}
                </form>

                {/* Project List */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {projects.data.map((project) => {
                        const completedMilestones = project.milestones.filter((m) => m.status === 'completed').length;
                        const totalMilestones = project.milestones.length;
                        const progress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

                        return (
                            <div
                                key={project.id}
                                className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 transition hover:border-primary/50"
                            >
                                <div className="space-y-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <h3 className="font-semibold text-foreground">{project.title}</h3>
                                        {getStatusBadge(project.status)}
                                    </div>

                                    {project.contact && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <User className="h-3.5 w-3.5" />
                                            <span>{project.contact.name || project.contact.email}</span>
                                        </div>
                                    )}

                                    {project.scope_summary && (
                                        <p className="line-clamp-2 text-xs text-muted-foreground">{project.scope_summary}</p>
                                    )}

                                    <div className="flex items-center justify-between pt-2 text-sm">
                                        <span className="text-xs text-muted-foreground">Budget</span>
                                        <span className="font-semibold text-foreground">
                                            {project.currency} {project.budget_amount.toLocaleString()}
                                        </span>
                                    </div>

                                    {totalMilestones > 0 ? (
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>Milestones</span>
                                                <span>
                                                    {completedMilestones} / {totalMilestones} ({progress}%)
                                                </span>
                                            </div>
                                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                                <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground italic">No milestones defined yet.</p>
                                    )}
                                </div>

                                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                        <Calendar className="h-3.5 w-3.5" />
                                        <span>{project.target_completion_date ? `Due ${project.target_completion_date}` : 'Ongoing'}</span>
                                    </div>
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={route('client-projects.show', project.id)}>View Details</Link>
                                    </Button>
                                </div>
                            </div>
                        );
                    })}

                    {projects.data.length === 0 && (
                        <div className="col-span-full rounded-xl border border-dashed border-border p-12 text-center">
                            <FolderKanban className="mx-auto h-10 w-10 text-muted-foreground" />
                            <h3 className="mt-3 font-semibold text-foreground">No client projects found</h3>
                            <p className="mt-1 text-sm text-muted-foreground">Convert a won lead into a project or create one manually.</p>
                            <Button onClick={() => setCreateOpen(true)} className="mt-4">
                                Create Project
                            </Button>
                        </div>
                    )}
                </div>

                {/* Create Project Dialog */}
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogContent>
                        <form onSubmit={handleCreate} className="space-y-4">
                            <DialogHeader>
                                <DialogTitle>Create Client Project</DialogTitle>
                                <DialogDescription>Establish a new client engagement with agreed scope and budget.</DialogDescription>
                            </DialogHeader>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-medium text-foreground">Project Title</label>
                                    <Input
                                        required
                                        placeholder="e.g. Acme Corp Web Platform & CRM"
                                        value={form.data.title}
                                        onChange={(e) => form.setData('title', e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-foreground">Currency</label>
                                        <select
                                            value={form.data.currency}
                                            onChange={(e) => form.setData('currency', e.target.value)}
                                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                                        >
                                            <option value="ETB">ETB (Ethiopian Birr)</option>
                                            <option value="USD">USD (US Dollar)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-foreground">Budget Amount</label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={form.data.budget_amount}
                                            onChange={(e) => form.setData('budget_amount', parseInt(e.target.value) || 0)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-foreground">Scope Summary</label>
                                    <textarea
                                        rows={3}
                                        placeholder="Summary of agreed deliverables, requirements, tech stack..."
                                        value={form.data.scope_summary}
                                        onChange={(e) => form.setData('scope_summary', e.target.value)}
                                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-foreground">Start Date</label>
                                        <Input
                                            type="date"
                                            value={form.data.start_date}
                                            onChange={(e) => form.setData('start_date', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-foreground">Target Completion</label>
                                        <Input
                                            type="date"
                                            value={form.data.target_completion_date}
                                            onChange={(e) => form.setData('target_completion_date', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={form.processing}>
                                    Save Project
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}

