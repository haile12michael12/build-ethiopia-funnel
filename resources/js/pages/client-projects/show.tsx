import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, Circle, Clock, DollarSign, Mail, Phone, Plus, Trash2, User } from 'lucide-react';
import { useState } from 'react';

interface Milestone {
    id: number;
    title: string;
    description: string | null;
    status: 'pending' | 'in_progress' | 'completed';
    due_date: string | null;
    completed_at: string | null;
}

interface ProjectData {
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
        status: string;
    } | null;
    milestones: Milestone[];
}

interface Props {
    project: ProjectData;
    statuses: string[];
    currencies: string[];
    milestoneStatuses: string[];
}

export default function ClientProjectShow({ project, statuses, currencies, milestoneStatuses }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: 'Client Delivery', href: '/client-projects' },
        { title: project.title, href: route('client-projects.show', project.id) },
    ];

    const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);

    const projectForm = useForm({
        title: project.title,
        status: project.status,
        currency: project.currency,
        budget_amount: project.budget_amount,
        scope_summary: project.scope_summary ?? '',
        start_date: project.start_date ?? '',
        target_completion_date: project.target_completion_date ?? '',
    });

    const milestoneForm = useForm({
        title: '',
        description: '',
        status: 'pending',
        due_date: '',
    });

    const handleUpdateProject = (e: React.FormEvent) => {
        e.preventDefault();
        projectForm.put(route('client-projects.update', project.id), {
            preserveScroll: true,
        });
    };

    const handleAddMilestone = (e: React.FormEvent) => {
        e.preventDefault();
        milestoneForm.post(route('client-projects.milestones.store', project.id), {
            preserveScroll: true,
            onSuccess: () => {
                setMilestoneModalOpen(false);
                milestoneForm.reset();
            },
        });
    };

    const toggleMilestone = (milestone: Milestone) => {
        const nextStatus = milestone.status === 'completed' ? 'pending' : 'completed';
        router.patch(
            route('client-projects.milestones.update', [project.id, milestone.id]),
            {
                title: milestone.title,
                description: milestone.description,
                due_date: milestone.due_date,
                status: nextStatus,
            },
            { preserveScroll: true },
        );
    };

    const deleteMilestone = (milestoneId: number) => {
        if (!confirm('Remove this milestone?')) return;
        router.delete(route('client-projects.milestones.destroy', [project.id, milestoneId]), {
            preserveScroll: true,
        });
    };

    const completedMilestones = project.milestones.filter((m) => m.status === 'completed').length;
    const totalMilestones = project.milestones.length;
    const progress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${project.title} - Client Delivery Project`} />

            <div className="space-y-6 p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" asChild>
                            <Link href={route('client-projects.index')}>
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">{project.title}</h1>
                            <p className="text-sm text-muted-foreground">Client Engagement & Delivery Tracker</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Left Column: Project Overview & Milestones */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* Milestone Progress Card */}
                        <div className="rounded-xl border border-border bg-card p-6">
                            <div className="flex items-center justify-between pb-4 border-b border-border">
                                <div>
                                    <h2 className="text-base font-semibold text-foreground">Project Milestones</h2>
                                    <p className="text-xs text-muted-foreground">
                                        {completedMilestones} of {totalMilestones} completed ({progress}%)
                                    </p>
                                </div>
                                <Button size="sm" onClick={() => setMilestoneModalOpen(true)} className="flex items-center gap-1.5">
                                    <Plus className="h-4 w-4" />
                                    Add Milestone
                                </Button>
                            </div>

                            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
                                <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                            </div>

                            <div className="mt-6 space-y-3">
                                {project.milestones.map((milestone) => (
                                    <div
                                        key={milestone.id}
                                        className="flex items-start justify-between rounded-lg border border-border bg-background p-4 transition hover:bg-muted/30"
                                    >
                                        <div className="flex items-start gap-3">
                                            <button
                                                type="button"
                                                onClick={() => toggleMilestone(milestone)}
                                                className="mt-0.5 text-muted-foreground hover:text-foreground"
                                            >
                                                {milestone.status === 'completed' ? (
                                                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                                ) : (
                                                    <Circle className="h-5 w-5" />
                                                )}
                                            </button>
                                            <div className="space-y-1">
                                                <p
                                                    className={`text-sm font-medium ${
                                                        milestone.status === 'completed' ? 'text-muted-foreground line-through' : 'text-foreground'
                                                    }`}
                                                >
                                                    {milestone.title}
                                                </p>
                                                {milestone.description && (
                                                    <p className="text-xs text-muted-foreground">{milestone.description}</p>
                                                )}
                                                {milestone.due_date && (
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Clock className="h-3 w-3" /> Due {milestone.due_date}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => deleteMilestone(milestone.id)}
                                            className="text-muted-foreground hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}

                                {project.milestones.length === 0 && (
                                    <p className="py-6 text-center text-sm text-muted-foreground">
                                        No deliverables or milestones added yet. Click &quot;Add Milestone&quot; to establish delivery stages.
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Project Details Edit Card */}
                        <div className="rounded-xl border border-border bg-card p-6">
                            <h2 className="text-base font-semibold text-foreground mb-4">Project Parameters & Scope</h2>
                            <form onSubmit={handleUpdateProject} className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-foreground">Project Title</label>
                                    <Input
                                        value={projectForm.data.title}
                                        onChange={(e) => projectForm.setData('title', e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-medium text-foreground">Project Status</label>
                                        <select
                                            value={projectForm.data.status}
                                            onChange={(e) => projectForm.setData('status', e.target.value as any)}
                                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                                        >
                                            {statuses.map((st) => (
                                                <option key={st} value={st}>
                                                    {st.replace('_', ' ')}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-xs font-medium text-foreground">Currency</label>
                                            <select
                                                value={projectForm.data.currency}
                                                onChange={(e) => projectForm.setData('currency', e.target.value as any)}
                                                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                                            >
                                                {currencies.map((c) => (
                                                    <option key={c} value={c}>
                                                        {c}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-foreground">Budget</label>
                                            <Input
                                                type="number"
                                                min={0}
                                                value={projectForm.data.budget_amount}
                                                onChange={(e) => projectForm.setData('budget_amount', parseInt(e.target.value) || 0)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs font-medium text-foreground">Start Date</label>
                                        <Input
                                            type="date"
                                            value={projectForm.data.start_date}
                                            onChange={(e) => projectForm.setData('start_date', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-foreground">Target Completion Date</label>
                                        <Input
                                            type="date"
                                            value={projectForm.data.target_completion_date}
                                            onChange={(e) => projectForm.setData('target_completion_date', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-foreground">Scope Summary & Agreed Deliverables</label>
                                    <textarea
                                        rows={4}
                                        value={projectForm.data.scope_summary}
                                        onChange={(e) => projectForm.setData('scope_summary', e.target.value)}
                                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                                    />
                                </div>

                                <div className="flex justify-end">
                                    <Button type="submit" disabled={projectForm.processing}>
                                        Save Changes
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Right Column: Client / Lead Connection */}
                    <div className="space-y-6">
                        <div className="rounded-xl border border-border bg-card p-6">
                            <h2 className="text-base font-semibold text-foreground mb-4">Client Contact</h2>

                            {project.contact ? (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                                            {(project.contact.name || project.contact.email)[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-medium text-foreground">{project.contact.name || 'Anonymous Contact'}</p>
                                            <p className="text-xs text-muted-foreground">{project.contact.email}</p>
                                        </div>
                                    </div>

                                    {project.contact.phone && (
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <Phone className="h-3.5 w-3.5" />
                                            <span>{project.contact.phone}</span>
                                        </div>
                                    )}

                                    <div className="pt-2">
                                        <Button variant="outline" size="sm" className="w-full" asChild>
                                            <Link href={route('contacts.show', project.contact.id)}>View CRM Profile & Inquiries</Link>
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">This project is not linked to an inquiry contact.</p>
                            )}
                        </div>

                        <div className="rounded-xl border border-border bg-card p-6 space-y-3">
                            <h2 className="text-base font-semibold text-foreground">Delivery Summary</h2>
                            <div className="flex justify-between text-sm py-1 border-b border-border">
                                <span className="text-muted-foreground">Status</span>
                                <span className="font-medium capitalize">{project.status.replace('_', ' ')}</span>
                            </div>
                            <div className="flex justify-between text-sm py-1 border-b border-border">
                                <span className="text-muted-foreground">Budget</span>
                                <span className="font-medium">
                                    {project.currency} {project.budget_amount.toLocaleString()}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm py-1 border-b border-border">
                                <span className="text-muted-foreground">Milestones</span>
                                <span className="font-medium">
                                    {completedMilestones} / {totalMilestones} Done
                                </span>
                            </div>
                            <div className="flex justify-between text-sm py-1">
                                <span className="text-muted-foreground">Start Date</span>
                                <span className="font-medium">{project.start_date || 'Not set'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Add Milestone Dialog */}
                <Dialog open={milestoneModalOpen} onOpenChange={setMilestoneModalOpen}>
                    <DialogContent>
                        <form onSubmit={handleAddMilestone} className="space-y-4">
                            <DialogHeader>
                                <DialogTitle>Add Project Milestone</DialogTitle>
                                <DialogDescription>Create a traceable milestone or deliverable for this project.</DialogDescription>
                            </DialogHeader>

                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-medium text-foreground">Milestone Title</label>
                                    <Input
                                        placeholder="e.g. Design Wireframes Approval"
                                        required
                                        value={milestoneForm.data.title}
                                        onChange={(e) => milestoneForm.setData('title', e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-foreground">Description</label>
                                    <textarea
                                        rows={2}
                                        placeholder="Specific acceptance criteria or deliverables..."
                                        value={milestoneForm.data.description}
                                        onChange={(e) => milestoneForm.setData('description', e.target.value)}
                                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs font-medium text-foreground">Status</label>
                                        <select
                                            value={milestoneForm.data.status}
                                            onChange={(e) => milestoneForm.setData('status', e.target.value as any)}
                                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                                        >
                                            {milestoneStatuses.map((st) => (
                                                <option key={st} value={st}>
                                                    {st.replace('_', ' ')}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-foreground">Due Date</label>
                                        <Input
                                            type="date"
                                            value={milestoneForm.data.due_date}
                                            onChange={(e) => milestoneForm.setData('due_date', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setMilestoneModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={milestoneForm.processing}>
                                    Save Milestone
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}

