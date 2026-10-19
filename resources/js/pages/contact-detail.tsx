import { BusinessAuditSummary } from '@/components/crm/BusinessAuditSummary';
import { LeadScoreBadge } from '@/components/crm/LeadScoreBadge';
import { LeadScoreBreakdown } from '@/components/crm/LeadScoreBreakdown';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { type BusinessAuditData } from '@/types/business-audit';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    ArrowLeft,
    BriefcaseBusiness,
    CalendarClock,
    Check,
    Clock,
    Mail,
    MessageSquare,
    Phone,
    Plus,
    Save,
    Send,
    UserRound,
    Workflow,
} from 'lucide-react';
import { useState } from 'react';

interface ContactSubmission {
    id: number;
    form_id: string | null;
    variant_id: number | null;
    fields: Record<string, unknown>;
    source: string;
    url: string | null;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
    funnel: {
        id: number;
        name: string;
        slug: string;
    } | null;
}

interface ContactDetailProps {
    contact: {
        id: number;
        email: string;
        name: string | null;
        phone: string | null;
        status: string;
        lost_reason: string | null;
        source: string;
        lead_score: number;
        lead_priority: 'high' | 'medium' | 'low';
        last_scored_at: string | null;
        priority_thresholds: { high: number; medium: number };
        lead_score_breakdown: Record<string, number>;
        lead_score_reasons: Array<{ key: string; points: number; reason: string }>;
        business_audit: BusinessAuditData | null;
        client_project: {
            business_name: string | null;
            market: 'ethiopia' | 'international';
            country: string;
            budget: string;
            service_interests: string[];
            service_labels: string[];
            project_description: string;
            budget_label: string;
            timeline_label: string;
            timeline: string;
            website: string | null;
            social_links: string[];
            preferred_contact: string;
            additional_requirements: string | null;
            marketing_consent: boolean;
            attribution?: Record<string, string>;
        } | null;
        tags: string[];
        metadata: Record<string, unknown>;
        notes: Array<{
            id: string;
            body: string;
            created_at: string;
        }>;
        email_preference: {
            status: 'unknown' | 'subscribed' | 'unsubscribed' | 'bounced';
            source: string | null;
            consented_at: string | null;
            unsubscribed_at: string | null;
        };
        funnel: {
            id: number;
            name: string;
            slug: string;
        } | null;
        ip_address: string | null;
        user_agent: string | null;
        last_submitted_at: string | null;
        last_contacted_at: string | null;
        created_at: string;
        updated_at: string;
        submissions: ContactSubmission[];
        activities: Array<{
            id: number;
            type: string;
            payload: Record<string, string | number | null>;
            actor: string | null;
            created_at: string;
        }>;
        follow_up_tasks: Array<{
            id: number;
            title: string;
            description: string | null;
            due_at: string;
            due_label: string;
            status: 'pending' | 'completed' | 'cancelled';
            completed_at: string | null;
        }>;
        follow_up_templates: Array<{
            key: string;
            label_en: string;
            label_am: string | null;
            body_en: string;
            body_am: string | null;
            kind: 'transactional' | 'promotional';
        }>;
        opportunities: Array<{
            id: number;
            title: string;
            value_cents: number;
            status: string;
            expected_close_date: string | null;
            pipeline: {
                id: number;
                name: string;
                currency: string;
            };
            stage: {
                id: number;
                name: string;
            };
        }>;
        developer_ai_recommendations: Array<{
            id: number;
            status: string;
            recommendations: {
                next_steps?: string[];
                experiment_hypotheses?: Array<{ hypothesis: string; primary_metric: string; variant_description: string }>;
                copy_suggestions?: Array<{ type: string; suggestion: string; rationale: string }>;
            } | null;
            error_message: string | null;
            created_at: string;
        }>;
    };
    statusOptions: string[];
    projectOptions: {
        services: Array<{ key: string; label: string }>;
        budgets: Array<{ key: string; label: string; currency: string }>;
        timelines: Array<{ key: string; label: string }>;
    };
}

function formatOpportunityValue(cents: number, currency: string): string {
    try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(cents / 100);
    } catch {
        return `${currency} ${(cents / 100).toFixed(2)}`;
    }
}

export default function ContactDetail({ contact, statusOptions, projectOptions }: ContactDetailProps) {
    const [lostReason, setLostReason] = useState(contact.lost_reason ?? '');
    const [taskDueValues, setTaskDueValues] = useState<Record<number, string>>(
        Object.fromEntries(contact.follow_up_tasks.map((task) => [task.id, task.due_at])),
    );
    const [contactChannel, setContactChannel] = useState<'email' | 'phone' | 'whatsapp' | 'meeting' | 'proposal'>('email');
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [copyState, setCopyState] = useState('');
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Contacts', href: '/contacts' },
        { title: contact.name || contact.email, href: `/contacts/${contact.id}` },
    ];

    const noteForm = useForm({
        note: '',
    });
    const taskForm = useForm({
        title: '',
        description: '',
        due_at: '',
    });
    const contactAttemptForm = useForm({
        note: '',
    });
    const detailForm = useForm({
        name: contact.name ?? '',
        email: contact.email,
        phone: contact.phone ?? '',
        business_name: contact.client_project?.business_name ?? '',
        market: contact.client_project?.market ?? 'ethiopia',
        country: contact.client_project?.country ?? '',
        service_interests: contact.client_project?.service_interests ?? [],
        project_description: contact.client_project?.project_description ?? '',
        budget: contact.client_project?.budget ?? '',
        timeline: contact.client_project?.timeline ?? '',
        website: contact.client_project?.website ?? '',
        additional_requirements: contact.client_project?.additional_requirements ?? '',
        preferred_contact: contact.client_project?.preferred_contact ?? 'email',
    });

    const updateStatus = (status: string) => {
        if (
            ['won', 'lost'].includes(status) &&
            !window.confirm(`Mark this lead as ${status}? This change will be recorded in its activity history.`)
        ) {
            return;
        }
        router.patch(route('contacts.update', contact.id), { status, lost_reason: status === 'lost' ? lostReason : null }, { preserveScroll: true });
    };

    const addNote = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        noteForm.post(route('contacts.notes.store', contact.id), {
            preserveScroll: true,
            onSuccess: () => noteForm.reset(),
        });
    };

    const addTask = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        taskForm.post(route('follow-up-tasks.store', contact.id), {
            preserveScroll: true,
            onSuccess: () => taskForm.reset(),
        });
    };

    const updateDetails = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        detailForm.put(route('contacts.details.update', contact.id), { preserveScroll: true });
    };

    const recordContactAttempt = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        contactAttemptForm.transform((data) => ({ ...data, channel: contactChannel }));
        contactAttemptForm.post(route('contacts.contact-attempts.store', contact.id), {
            preserveScroll: true,
            onSuccess: () => contactAttemptForm.reset(),
        });
    };

    const renderTemplate = (body: string) => {
        const project = contact.client_project;
        const service = project?.service_labels.join(', ') || project?.service_interests.join(', ') || 'your project';
        const replacements: Record<string, string> = {
            name: contact.name || 'there',
            service,
            company: project?.business_name || 'your company',
            timeline: project?.timeline_label || 'your preferred timeline',
        };

        return body.replace(/\{\{(name|service|company|timeline)\}\}/g, (_, key: string) => replacements[key] ?? '');
    };

    const copyTemplate = () => {
        const template = contact.follow_up_templates.find((item) => item.key === selectedTemplate);
        if (!template) return;
        if (!navigator.clipboard) {
            setCopyState('Clipboard access is unavailable. Select and copy the preview manually.');
            return;
        }

        void navigator.clipboard
            .writeText(renderTemplate(template.body_en))
            .then(() => setCopyState('Template copied. You still need to send it yourself.'))
            .catch(() => setCopyState('Could not access the clipboard. Select and copy the preview manually.'));
    };

    const activityDescription = (type: string, payload: Record<string, string | number | null>) => {
        if (type === 'status_changed') return `Status changed from ${payload.from ?? 'unknown'} to ${payload.to ?? 'unknown'}.`;
        if (type === 'note_added') return `Internal note: ${payload.body ?? ''}`;
        if (type === 'contact_attempt') return `Recorded ${payload.channel ?? 'contact'} attempt. No message was sent. ${payload.note ?? ''}`;
        if (type.startsWith('task_')) return `${type.replaceAll('_', ' ')}: ${payload.title ?? 'follow-up task'}.`;

        return type.replaceAll('_', ' ');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${contact.name || contact.email} - Contact`} />
            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/contacts"
                            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">{contact.name || contact.email}</h1>
                            <p className="text-muted-foreground">
                                Captured from{' '}
                                {contact.funnel?.name ||
                                    (contact.source === 'business_audit'
                                        ? 'Business growth audit'
                                        : contact.source === 'client_acquisition'
                                          ? 'Client project request'
                                          : contact.source)}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {(contact.business_audit || contact.client_project) && (
                            <div className="flex flex-wrap items-center gap-2">
                                <LeadScoreBadge score={contact.lead_score} />
                                <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground capitalize">
                                    {contact.lead_priority} operational priority
                                </span>
                            </div>
                        )}
                        <select
                            value={contact.status}
                            onChange={(event) => updateStatus(event.target.value)}
                            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                        >
                            {statusOptions.map((status) => (
                                <option key={status} value={status}>
                                    {status.replaceAll('_', ' ')}
                                </option>
                            ))}
                        </select>
                        {contact.status === 'lost' && (
                            <select
                                aria-label="Reason lead was lost"
                                value={lostReason}
                                onChange={(event) => {
                                    setLostReason(event.target.value);
                                    router.patch(
                                        route('contacts.update', contact.id),
                                        { status: 'lost', lost_reason: event.target.value || null },
                                        { preserveScroll: true },
                                    );
                                }}
                                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                            >
                                <option value="">No loss reason</option>
                                <option value="budget_mismatch">Budget mismatch</option>
                                <option value="timing">Timing</option>
                                <option value="scope_mismatch">Scope mismatch</option>
                                <option value="no_response">No response</option>
                                <option value="other">Other</option>
                            </select>
                        )}
                    </div>
                </div>

                <div className="flex justify-end">
                    <Link
                        href={route('automation-runs.index', { search: contact.email })}
                        className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                    >
                        <Workflow className="h-4 w-4" />
                        Automation history
                    </Link>
                </div>

                <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
                    <div className="space-y-6">
                        <div className="rounded-xl border border-border bg-card p-5">
                            <h2 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
                                <UserRound className="h-4 w-4" />
                                Profile
                            </h2>
                            <div className="space-y-3 text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Mail className="h-4 w-4" />
                                    <span className="text-foreground">{contact.email}</span>
                                </div>
                                {contact.phone && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Phone className="h-4 w-4" />
                                        <span className="text-foreground">{contact.phone}</span>
                                    </div>
                                )}
                                <div className="border-t border-border pt-3">
                                    <div className="text-muted-foreground">Source</div>
                                    <div className="text-foreground">{contact.source}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Last submitted</div>
                                    <div className="text-foreground">{contact.last_submitted_at || 'Not available'}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">Last contact attempt</div>
                                    <div className="text-foreground">{contact.last_contacted_at || 'Not recorded'}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground">IP address</div>
                                    <div className="text-foreground">{contact.ip_address || 'Not available'}</div>
                                </div>
                            </div>
                        </div>

                        <BusinessAuditSummary audit={contact.business_audit} score={contact.lead_score} />
                        {contact.client_project && (
                            <section className="rounded-xl border border-border bg-card p-5">
                                <h2 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
                                    <BriefcaseBusiness className="h-4 w-4" />
                                    Project request
                                </h2>
                                <dl className="space-y-3 text-sm">
                                    {contact.client_project.business_name && (
                                        <div>
                                            <dt className="text-muted-foreground">Business</dt>
                                            <dd className="text-foreground">{contact.client_project.business_name}</dd>
                                        </div>
                                    )}
                                    <div>
                                        <dt className="text-muted-foreground">Market</dt>
                                        <dd className="text-foreground capitalize">
                                            {contact.client_project.market} · {contact.client_project.country}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-muted-foreground">Services</dt>
                                        <dd className="text-foreground">
                                            {contact.client_project.service_labels.join(', ') || contact.client_project.service_interests.join(', ')}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-muted-foreground">Budget range</dt>
                                        <dd className="text-foreground">
                                            {contact.client_project.budget_label} ({contact.client_project.market === 'ethiopia' ? 'ETB' : 'USD'})
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-muted-foreground">Timeline</dt>
                                        <dd className="text-foreground">{contact.client_project.timeline_label}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-muted-foreground">Project details</dt>
                                        <dd className="whitespace-pre-wrap text-foreground">{contact.client_project.project_description}</dd>
                                    </div>
                                    {contact.client_project.additional_requirements && (
                                        <div>
                                            <dt className="text-muted-foreground">Additional requirements</dt>
                                            <dd className="whitespace-pre-wrap text-foreground">{contact.client_project.additional_requirements}</dd>
                                        </div>
                                    )}
                                    {contact.client_project.website && (
                                        <div>
                                            <dt className="text-muted-foreground">Website</dt>
                                            <dd>
                                                <a
                                                    href={contact.client_project.website}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-primary underline"
                                                >
                                                    {contact.client_project.website}
                                                </a>
                                            </dd>
                                        </div>
                                    )}
                                    {contact.client_project.social_links.length > 0 && (
                                        <div>
                                            <dt className="text-muted-foreground">Social links</dt>
                                            <dd className="flex flex-col">
                                                {contact.client_project.social_links.map((url) => (
                                                    <a
                                                        key={url}
                                                        href={url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="truncate text-primary underline"
                                                    >
                                                        {url}
                                                    </a>
                                                ))}
                                            </dd>
                                        </div>
                                    )}
                                    <div>
                                        <dt className="text-muted-foreground">Preferred contact</dt>
                                        <dd className="text-foreground capitalize">{contact.client_project.preferred_contact}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-muted-foreground">Marketing consent</dt>
                                        <dd className="text-foreground">{contact.client_project.marketing_consent ? 'Granted' : 'Not granted'}</dd>
                                    </div>
                                    {contact.client_project.attribution &&
                                        Object.entries(contact.client_project.attribution).some(([, value]) => Boolean(value)) && (
                                            <div>
                                                <dt className="text-muted-foreground">Original attribution</dt>
                                                <dd className="space-y-1 text-foreground">
                                                    {Object.entries(contact.client_project.attribution)
                                                        .filter(([, value]) => Boolean(value))
                                                        .map(([key, value]) => (
                                                            <div key={key}>
                                                                {key.replaceAll('_', ' ')}: {value}
                                                            </div>
                                                        ))}
                                                </dd>
                                            </div>
                                        )}
                                </dl>
                                <details className="mt-5 border-t border-border pt-4">
                                    <summary className="cursor-pointer font-medium text-primary">Edit contact and project details</summary>
                                    <form onSubmit={updateDetails} className="mt-4 space-y-3">
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <label className="space-y-1 text-xs text-muted-foreground">
                                                Name
                                                <input
                                                    required
                                                    maxLength={255}
                                                    value={detailForm.data.name}
                                                    onChange={(event) => detailForm.setData('name', event.target.value)}
                                                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                                                />
                                            </label>
                                            <label className="space-y-1 text-xs text-muted-foreground">
                                                Email
                                                <input
                                                    required
                                                    type="email"
                                                    maxLength={255}
                                                    value={detailForm.data.email}
                                                    onChange={(event) => detailForm.setData('email', event.target.value)}
                                                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                                                />
                                            </label>
                                            <label className="space-y-1 text-xs text-muted-foreground">
                                                Phone
                                                <input
                                                    type="tel"
                                                    maxLength={50}
                                                    value={detailForm.data.phone}
                                                    onChange={(event) => detailForm.setData('phone', event.target.value)}
                                                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                                                />
                                            </label>
                                            <label className="space-y-1 text-xs text-muted-foreground">
                                                Company
                                                <input
                                                    maxLength={255}
                                                    value={detailForm.data.business_name}
                                                    onChange={(event) => detailForm.setData('business_name', event.target.value)}
                                                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                                                />
                                            </label>
                                            <label className="space-y-1 text-xs text-muted-foreground">
                                                Market
                                                <select
                                                    value={detailForm.data.market}
                                                    onChange={(event) =>
                                                        detailForm.setData('market', event.target.value as 'ethiopia' | 'international')
                                                    }
                                                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                                                >
                                                    <option value="ethiopia">Ethiopia</option>
                                                    <option value="international">International</option>
                                                </select>
                                            </label>
                                            <label className="space-y-1 text-xs text-muted-foreground">
                                                Country
                                                <input
                                                    required
                                                    maxLength={120}
                                                    value={detailForm.data.country}
                                                    onChange={(event) => detailForm.setData('country', event.target.value)}
                                                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                                                />
                                            </label>
                                            <label className="space-y-1 text-xs text-muted-foreground sm:col-span-2">
                                                Services
                                                <select
                                                    multiple
                                                    value={detailForm.data.service_interests}
                                                    onChange={(event) =>
                                                        detailForm.setData(
                                                            'service_interests',
                                                            Array.from(event.target.selectedOptions, (option) => option.value),
                                                        )
                                                    }
                                                    className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                                                >
                                                    {projectOptions.services.map((option) => (
                                                        <option key={option.key} value={option.key}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                                <span className="block">Use Ctrl/Command to select up to five services.</span>
                                            </label>
                                            <label className="space-y-1 text-xs text-muted-foreground sm:col-span-2">
                                                Project description
                                                <textarea
                                                    required
                                                    minLength={30}
                                                    maxLength={5000}
                                                    value={detailForm.data.project_description}
                                                    onChange={(event) => detailForm.setData('project_description', event.target.value)}
                                                    className="min-h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                                                />
                                            </label>
                                            <label className="space-y-1 text-xs text-muted-foreground">
                                                Budget range
                                                <select
                                                    required
                                                    value={detailForm.data.budget}
                                                    onChange={(event) => detailForm.setData('budget', event.target.value)}
                                                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                                                >
                                                    {projectOptions.budgets
                                                        .filter(
                                                            (option) => option.currency === (detailForm.data.market === 'ethiopia' ? 'ETB' : 'USD'),
                                                        )
                                                        .map((option) => (
                                                            <option key={option.key} value={option.key}>
                                                                {option.label}
                                                            </option>
                                                        ))}
                                                </select>
                                            </label>
                                            <label className="space-y-1 text-xs text-muted-foreground">
                                                Timeline
                                                <select
                                                    required
                                                    value={detailForm.data.timeline}
                                                    onChange={(event) => detailForm.setData('timeline', event.target.value)}
                                                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                                                >
                                                    {projectOptions.timelines.map((option) => (
                                                        <option key={option.key} value={option.key}>
                                                            {option.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </label>
                                            <label className="space-y-1 text-xs text-muted-foreground">
                                                Website
                                                <input
                                                    type="url"
                                                    value={detailForm.data.website}
                                                    onChange={(event) => detailForm.setData('website', event.target.value)}
                                                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                                                />
                                            </label>
                                            <label className="space-y-1 text-xs text-muted-foreground">
                                                Preferred contact
                                                <select
                                                    value={detailForm.data.preferred_contact}
                                                    onChange={(event) =>
                                                        detailForm.setData('preferred_contact', event.target.value as 'email' | 'phone' | 'whatsapp')
                                                    }
                                                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                                                >
                                                    <option value="email">Email</option>
                                                    <option value="phone">Phone</option>
                                                    <option value="whatsapp">WhatsApp</option>
                                                </select>
                                            </label>
                                            <label className="space-y-1 text-xs text-muted-foreground sm:col-span-2">
                                                Additional requirements
                                                <textarea
                                                    maxLength={3000}
                                                    value={detailForm.data.additional_requirements}
                                                    onChange={(event) => detailForm.setData('additional_requirements', event.target.value)}
                                                    className="min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                                                />
                                            </label>
                                        </div>
                                        {Object.values(detailForm.errors).length > 0 && (
                                            <p role="alert" className="text-sm text-destructive">
                                                {Object.values(detailForm.errors)[0]}
                                            </p>
                                        )}
                                        <button
                                            type="submit"
                                            disabled={detailForm.processing}
                                            className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                                        >
                                            <Save className="h-4 w-4" />
                                            Save and recalculate score
                                        </button>
                                    </form>
                                </details>
                                <div className="mt-5 border-t border-border pt-4">
                                    <h3 className="mb-3 font-medium text-foreground">Lead score rationale</h3>
                                    <p className="mb-3 text-xs text-muted-foreground">
                                        Operational follow-up suggestion only; it is not an objective judgment about the person. High ≥
                                        {contact.priority_thresholds.high}, medium ≥{contact.priority_thresholds.medium}. Last calculated{' '}
                                        {contact.last_scored_at || 'not recorded'}.
                                    </p>
                                    <LeadScoreBreakdown breakdown={contact.lead_score_breakdown} />
                                    {contact.lead_score_reasons.length > 0 && (
                                        <ul className="mt-3 space-y-2 text-xs text-muted-foreground">
                                            {contact.lead_score_reasons.map((item) => (
                                                <li key={item.key}>
                                                    <span className="font-medium text-foreground">{item.points} points:</span> {item.reason}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </section>
                        )}
                        {contact.business_audit && (
                            <div className="rounded-xl border border-border bg-card p-5">
                                <h2 className="mb-4 font-semibold text-foreground">Lead score breakdown</h2>
                                <LeadScoreBreakdown breakdown={contact.lead_score_breakdown} />
                            </div>
                        )}
                        <section className="rounded-xl border border-border bg-card p-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2 className="font-semibold text-foreground">AI developer recommendations</h2>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        Generated asynchronously from minimized profile signals. Review suggestions before using them.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() =>
                                        router.post(route('contacts.developer-ai-recommendations.store', contact.id), {}, { preserveScroll: true })
                                    }
                                    disabled={contact.developer_ai_recommendations.some((item) =>
                                        ['queued', 'processing', 'pending_review'].includes(item.status),
                                    )}
                                    className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                                >
                                    Queue recommendations
                                </button>
                            </div>
                            <div className="mt-4 space-y-4">
                                {contact.developer_ai_recommendations.map((item) => (
                                    <div key={item.id} className="rounded-lg border border-border p-4">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                            <span className="text-sm font-medium text-foreground capitalize">{item.status.replace('_', ' ')}</span>
                                            <span className="text-xs text-muted-foreground">{item.created_at}</span>
                                        </div>
                                        {item.error_message && <p className="mt-2 text-sm text-destructive">{item.error_message}</p>}
                                        {item.recommendations && (
                                            <>
                                                {item.recommendations.next_steps && (
                                                    <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-foreground">
                                                        {item.recommendations.next_steps.map((step, index) => (
                                                            <li key={index}>{step}</li>
                                                        ))}
                                                    </ul>
                                                )}
                                                {item.recommendations.experiment_hypotheses?.map((experiment, index) => (
                                                    <p key={index} className="mt-3 text-sm text-muted-foreground">
                                                        {experiment.hypothesis} · Metric: {experiment.primary_metric}
                                                    </p>
                                                ))}
                                                {item.recommendations.copy_suggestions?.map((suggestion, index) => (
                                                    <p key={index} className="mt-2 text-sm text-muted-foreground">
                                                        {suggestion.suggestion} — {suggestion.rationale}
                                                    </p>
                                                ))}
                                            </>
                                        )}
                                        {item.status === 'pending_review' && (
                                            <div className="mt-3 flex gap-2">
                                                {(['accepted', 'dismissed'] as const).map((decision) => (
                                                    <button
                                                        key={decision}
                                                        type="button"
                                                        onClick={() =>
                                                            router.patch(
                                                                route('contacts.developer-ai-recommendations.review', {
                                                                    contact: contact.id,
                                                                    recommendation: item.id,
                                                                }),
                                                                { decision },
                                                                { preserveScroll: true },
                                                            )
                                                        }
                                                        className="rounded border border-border px-3 py-1.5 text-xs font-medium capitalize hover:bg-muted"
                                                    >
                                                        {decision}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {contact.developer_ai_recommendations.length === 0 && (
                                    <p className="text-sm text-muted-foreground">No AI recommendations have been requested.</p>
                                )}
                            </div>
                        </section>

                        <div className="rounded-xl border border-border bg-card p-5">
                            <h2 className="flex items-center gap-2 font-semibold">
                                <Mail className="h-4 w-4 text-primary" />
                                Email preference
                            </h2>
                            <div className="mt-4 flex items-center justify-between gap-3">
                                <span className="text-sm text-muted-foreground">Marketing status</span>
                                <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium capitalize">
                                    {contact.email_preference.status}
                                </span>
                            </div>
                            {(contact.email_preference.consented_at || contact.email_preference.unsubscribed_at) && (
                                <p className="mt-3 text-xs text-muted-foreground">
                                    {contact.email_preference.unsubscribed_at
                                        ? `Unsubscribed ${contact.email_preference.unsubscribed_at}`
                                        : `Consented ${contact.email_preference.consented_at}`}
                                </p>
                            )}
                        </div>

                        <section className="rounded-xl border border-border bg-card p-5">
                            <h2 className="mb-3 flex items-center gap-2 font-semibold text-foreground">
                                <CalendarClock className="h-4 w-4" />
                                Follow-up tasks
                            </h2>
                            <p className="mb-4 text-xs text-muted-foreground">
                                Tasks are internal reminders only. No scheduled reminder or message is sent.
                            </p>
                            <form onSubmit={addTask} className="space-y-3">
                                <input
                                    aria-label="Task title"
                                    required
                                    maxLength={160}
                                    value={taskForm.data.title}
                                    onChange={(event) => taskForm.setData('title', event.target.value)}
                                    placeholder="Task title"
                                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                                />
                                <textarea
                                    aria-label="Task description"
                                    maxLength={2000}
                                    value={taskForm.data.description}
                                    onChange={(event) => taskForm.setData('description', event.target.value)}
                                    placeholder="Optional details"
                                    className="min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                                />
                                <label className="block space-y-1 text-xs text-muted-foreground">
                                    Due date and time
                                    <input
                                        aria-label="Task due date and time"
                                        type="datetime-local"
                                        required
                                        value={taskForm.data.due_at}
                                        onChange={(event) => taskForm.setData('due_at', event.target.value)}
                                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                                    />
                                </label>
                                <button
                                    type="submit"
                                    disabled={taskForm.processing}
                                    className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                                >
                                    Create task
                                </button>
                            </form>
                            <div className="mt-4 space-y-3">
                                {contact.follow_up_tasks.map((task) => (
                                    <div key={task.id} className="rounded-lg border border-border p-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="font-medium text-foreground">{task.title}</p>
                                                <p className="mt-1 text-xs text-muted-foreground">
                                                    {task.due_label} · {task.status}
                                                </p>
                                                {task.description && (
                                                    <p className="mt-2 text-sm whitespace-pre-wrap text-muted-foreground">{task.description}</p>
                                                )}
                                            </div>
                                            {task.status === 'pending' && (
                                                <button
                                                    type="button"
                                                    aria-label={`Complete ${task.title}`}
                                                    onClick={() =>
                                                        router.patch(
                                                            route('follow-up-tasks.update', task.id),
                                                            { status: 'completed' },
                                                            { preserveScroll: true },
                                                        )
                                                    }
                                                    className="rounded-md border border-border p-2 hover:bg-muted"
                                                >
                                                    <Check className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                        {task.status === 'pending' && (
                                            <div className="mt-3 flex gap-2">
                                                <label className="flex-1 space-y-1 text-xs text-muted-foreground">
                                                    Reschedule
                                                    <input
                                                        aria-label={`Reschedule ${task.title}`}
                                                        type="datetime-local"
                                                        value={taskDueValues[task.id] ?? task.due_at}
                                                        onChange={(event) =>
                                                            setTaskDueValues((current) => ({ ...current, [task.id]: event.target.value }))
                                                        }
                                                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                                                    />
                                                </label>
                                                <button
                                                    type="button"
                                                    disabled={!taskDueValues[task.id] || taskDueValues[task.id] === task.due_at}
                                                    onClick={() =>
                                                        router.patch(
                                                            route('follow-up-tasks.update', task.id),
                                                            { due_at: taskDueValues[task.id] },
                                                            { preserveScroll: true },
                                                        )
                                                    }
                                                    className="self-end rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-muted disabled:opacity-50"
                                                >
                                                    Save
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {contact.follow_up_tasks.length === 0 && (
                                    <p className="text-sm text-muted-foreground">No follow-up tasks are scheduled.</p>
                                )}
                            </div>
                            <Link
                                href={route('follow-up-tasks.index')}
                                className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
                            >
                                View all tasks
                            </Link>
                        </section>

                        <section className="rounded-xl border border-border bg-card p-5">
                            <h2 className="mb-3 font-semibold text-foreground">Record a contact attempt</h2>
                            <p className="mb-4 text-xs text-muted-foreground">This records an activity only; it does not send a message.</p>
                            <form onSubmit={recordContactAttempt} className="space-y-3">
                                <select
                                    aria-label="Contact attempt channel"
                                    value={contactChannel}
                                    onChange={(event) => setContactChannel(event.target.value as typeof contactChannel)}
                                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                                >
                                    <option value="email">Email</option>
                                    <option value="phone">Phone</option>
                                    <option value="whatsapp">WhatsApp</option>
                                    <option value="meeting">Meeting</option>
                                    <option value="proposal">Proposal</option>
                                </select>
                                <textarea
                                    aria-label="Contact attempt note"
                                    value={contactAttemptForm.data.note}
                                    onChange={(event) => contactAttemptForm.setData('note', event.target.value)}
                                    maxLength={1000}
                                    placeholder="Optional internal context"
                                    className="min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                                />
                                <button
                                    type="submit"
                                    disabled={contactAttemptForm.processing}
                                    className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                                >
                                    Record contact attempt
                                </button>
                            </form>
                        </section>

                        <section className="rounded-xl border border-border bg-card p-5">
                            <h2 className="mb-3 font-semibold text-foreground">Manual follow-up message</h2>
                            <p className="mb-3 text-xs text-muted-foreground">
                                Preview and copy only. Nothing is sent. Promotional templates are available only when marketing consent is recorded.
                            </p>
                            <select
                                aria-label="Choose a follow-up template"
                                value={selectedTemplate}
                                onChange={(event) => {
                                    setSelectedTemplate(event.target.value);
                                    setCopyState('');
                                }}
                                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                            >
                                <option value="">Choose template</option>
                                {contact.follow_up_templates.map((template) => (
                                    <option key={template.key} value={template.key}>
                                        {template.label_en} · {template.kind}
                                    </option>
                                ))}
                            </select>
                            {selectedTemplate && (
                                <textarea
                                    readOnly
                                    aria-label="Follow-up template preview"
                                    value={renderTemplate(contact.follow_up_templates.find((item) => item.key === selectedTemplate)?.body_en ?? '')}
                                    className="mt-3 min-h-32 w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm"
                                />
                            )}
                            <button
                                type="button"
                                disabled={!selectedTemplate}
                                onClick={copyTemplate}
                                className="mt-3 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                            >
                                Copy preview
                            </button>
                            {copyState && (
                                <p role="status" className="mt-2 text-sm text-muted-foreground">
                                    {copyState}
                                </p>
                            )}
                        </section>

                        <div className="rounded-xl border border-border bg-card p-5">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <h2 className="flex items-center gap-2 font-semibold text-foreground">
                                    <BriefcaseBusiness className="h-4 w-4" />
                                    Opportunities
                                </h2>
                                <Link
                                    href={route('opportunities.index', { create_for_contact: contact.id })}
                                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    New
                                </Link>
                            </div>
                            <div className="space-y-3">
                                {contact.opportunities.map((opportunity) => (
                                    <Link
                                        key={opportunity.id}
                                        href={route('opportunities.index', {
                                            pipeline_id: opportunity.pipeline.id,
                                            status: opportunity.status,
                                            search: opportunity.title,
                                        })}
                                        className="block rounded-lg border border-border bg-background p-3 hover:bg-muted"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-medium text-foreground">{opportunity.title}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    {opportunity.pipeline.name} · {opportunity.stage.name}
                                                </div>
                                            </div>
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                                    opportunity.status === 'won'
                                                        ? 'bg-emerald-500/10 text-emerald-500'
                                                        : opportunity.status === 'lost'
                                                          ? 'bg-red-500/10 text-red-500'
                                                          : 'bg-sky-500/10 text-sky-500'
                                                }`}
                                            >
                                                {opportunity.status}
                                            </span>
                                        </div>
                                        <div className="mt-2 text-sm font-medium text-foreground">
                                            {formatOpportunityValue(opportunity.value_cents, opportunity.pipeline.currency)}
                                        </div>
                                    </Link>
                                ))}
                                {contact.opportunities.length === 0 && (
                                    <p className="text-sm text-muted-foreground">No opportunities are linked to this contact.</p>
                                )}
                            </div>
                        </div>

                        <div className="rounded-xl border border-border bg-card p-5">
                            <h2 className="mb-4 flex items-center gap-2 font-semibold text-foreground">
                                <MessageSquare className="h-4 w-4" />
                                Internal notes (not messages sent)
                            </h2>
                            <form onSubmit={addNote} className="space-y-3">
                                <textarea
                                    value={noteForm.data.note}
                                    onChange={(event) => noteForm.setData('note', event.target.value)}
                                    placeholder="Add internal context..."
                                    className="min-h-28 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                                />
                                <button
                                    type="submit"
                                    disabled={noteForm.processing || !noteForm.data.note.trim()}
                                    className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                                >
                                    <Send className="h-4 w-4" />
                                    Add note
                                </button>
                            </form>

                            <div className="mt-5 space-y-3">
                                {contact.notes.map((note) => (
                                    <div key={note.id} className="rounded-lg bg-muted/50 p-3">
                                        <p className="text-sm text-foreground">{note.body}</p>
                                        <p className="mt-2 text-xs text-muted-foreground">{new Date(note.created_at).toLocaleString()}</p>
                                    </div>
                                ))}
                                {contact.notes.length === 0 && <p className="text-sm text-muted-foreground">No notes yet.</p>}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-border bg-card">
                        <div className="border-b border-border px-5 py-4">
                            <h2 className="flex items-center gap-2 font-semibold text-foreground">
                                <Clock className="h-4 w-4" />
                                Contact activity
                            </h2>
                        </div>
                        <div className="divide-y divide-border">
                            {contact.activities.map((activity) => (
                                <div key={activity.id} className="px-5 py-4">
                                    <p className="text-sm text-foreground">{activityDescription(activity.type, activity.payload)}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                        {activity.actor ? `${activity.actor} · ` : ''}
                                        {activity.created_at}
                                    </p>
                                </div>
                            ))}
                            {contact.activities.length === 0 && (
                                <div className="px-5 py-6 text-sm text-muted-foreground">No contact activities recorded.</div>
                            )}
                        </div>
                    </div>
                    <div className="rounded-xl border border-border bg-card">
                        <div className="border-b border-border px-5 py-4">
                            <h2 className="flex items-center gap-2 font-semibold text-foreground">
                                <Clock className="h-4 w-4" />
                                Submission Timeline
                            </h2>
                        </div>
                        <div className="divide-y divide-border">
                            {contact.submissions.map((submission) => (
                                <div key={submission.id} className="p-5">
                                    <div className="mb-3 flex items-start justify-between gap-4">
                                        <div>
                                            <div className="font-medium text-foreground">
                                                {submission.funnel?.name ||
                                                    (submission.source === 'business_audit' ? 'Business growth audit' : 'Unknown funnel')}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {submission.source} {submission.form_id ? `| ${submission.form_id}` : ''}
                                            </div>
                                        </div>
                                        <div className="text-sm text-muted-foreground">{submission.created_at}</div>
                                    </div>
                                    <div className="grid gap-2 text-sm md:grid-cols-2">
                                        {Object.entries(submission.fields).map(([key, value]) => (
                                            <div key={key} className="rounded-lg bg-muted/40 px-3 py-2">
                                                <div className="text-xs text-muted-foreground">{key}</div>
                                                <div className="break-words text-foreground">{String(value)}</div>
                                            </div>
                                        ))}
                                    </div>
                                    {submission.url && <div className="mt-3 text-xs break-all text-muted-foreground">{submission.url}</div>}
                                </div>
                            ))}
                            {contact.submissions.length === 0 && (
                                <div className="p-8 text-center text-sm text-muted-foreground">No submissions recorded.</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
