import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, useForm } from '@inertiajs/react';

interface Draft {
    id: number;
    title: string;
    body: string | null;
    content_type: string;
    platform: string;
    format: string;
    audience: string;
    market: string;
    service: string;
    objective: string;
    tone: string;
    language: string;
    call_to_action: string | null;
    portfolio_project_id: number | null;
    status: string;
    scheduled_at: string | null;
    published_url: string | null;
    failure_details: string | null;
    is_generated: boolean;
    prompt_template_key: string | null;
    provider: string | null;
    provider_model: string | null;
}

interface Version {
    id: number;
    title: string;
    body: string | null;
    reason: string;
    created_at: string;
}

interface Options {
    contentTypes: Record<string, string>;
    platforms: Record<string, string>;
    formats: Record<string, string>;
    objectives: Record<string, string>;
    services: Record<string, string>;
    portfolioProjects: Array<{ id: number; title: string }>;
}

interface Props {
    draft: Draft | null;
    versions: Version[];
    options: Options;
    brandSettings: { brand_name: string; brand_voice: string; brand_guidelines: string };
}

interface FormData {
    content_type: string;
    platform: string;
    format: string;
    audience: string;
    market: string;
    service: string;
    objective: string;
    tone: string;
    language: string;
    call_to_action: string;
    portfolio_project_id: string;
    title: string;
    body: string;
    scheduled_at: string;
    published_url: string;
    failure_details: string;
}

const selectClass = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm';
const fieldClass = 'grid gap-2';
const formatLocalDateTime = (value: string): string => {
    const date = new Date(value);
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
};

export default function ContentStudioForm({ draft, versions, options, brandSettings }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Content Studio', href: route('content-studio.index') },
        { title: draft ? 'Edit draft' : 'Create content', href: draft ? route('content-studio.edit', draft.id) : route('content-studio.create') },
    ];
    const form = useForm<FormData>({
        content_type: draft?.content_type ?? 'linkedin_post',
        platform: draft?.platform ?? 'linkedin',
        format: draft?.format ?? 'post',
        audience: draft?.audience ?? '',
        market: draft?.market ?? 'ethiopia',
        service: draft?.service ?? Object.keys(options.services)[0] ?? '',
        objective: draft?.objective ?? 'awareness',
        tone: draft?.tone ?? 'clear and helpful',
        language: draft?.language ?? 'en',
        call_to_action: draft?.call_to_action ?? '',
        portfolio_project_id: draft?.portfolio_project_id ? String(draft.portfolio_project_id) : '',
        title: draft?.title ?? '',
        body: draft?.body ?? '',
        scheduled_at: draft?.scheduled_at ? formatLocalDateTime(draft.scheduled_at) : '',
        published_url: draft?.published_url ?? '',
        failure_details: draft?.failure_details ?? '',
    });
    const canEdit = !draft || !['published', 'archived'].includes(draft.status);

    const save = (event: FormEvent) => {
        event.preventDefault();
        if (draft) {
            form.put(route('content-studio.update', draft.id));
        } else {
            form.post(route('content-studio.store'));
        }
    };

    const generate = () => form.post(route('content-studio.generate'));
    const submitAction = (name: 'content-studio.review' | 'content-studio.approve' | 'content-studio.schedule' | 'content-studio.publish' | 'content-studio.archive' | 'content-studio.failed', data: Record<string, string | boolean> = {}) => {
        if (draft) router.post(route(name, draft.id), data, { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={draft ? 'Edit content draft' : 'Create agency content'} />
            <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6">
                <header>
                    <h1 className="text-2xl font-bold">{draft ? draft.title : 'Create agency content'}</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {draft ? `Status: ${draft.status.replaceAll('_', ' ')}` : 'Choose a brief, then save an idea or generate a private draft.'}
                    </p>
                </header>

                {!canEdit && (
                    <p role="status" className="rounded-lg border border-border bg-muted p-4 text-sm">
                        Published and archived content is read-only. Publication status is recorded manually; this app does not post to social platforms.
                    </p>
                )}

                {Object.entries(form.errors).length > 0 && (
                    <div role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                        {Object.entries(form.errors).map(([field, message]) => <p key={field}>{message}</p>)}
                    </div>
                )}

                <form onSubmit={save} className="grid gap-5 rounded-xl border border-border bg-card p-5">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <label className={fieldClass}>Content type
                            <select className={selectClass} disabled={!canEdit} value={form.data.content_type} onChange={(event) => form.setData('content_type', event.target.value)}>
                                {Object.entries(options.contentTypes).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                            </select>
                        </label>
                        <label className={fieldClass}>Target platform
                            <select className={selectClass} disabled={!canEdit} value={form.data.platform} onChange={(event) => form.setData('platform', event.target.value)}>
                                {Object.entries(options.platforms).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                            </select>
                        </label>
                        <label className={fieldClass}>Format
                            <select className={selectClass} disabled={!canEdit} value={form.data.format} onChange={(event) => form.setData('format', event.target.value)}>
                                {Object.entries(options.formats).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                            </select>
                        </label>
                        <label className={fieldClass}>Audience
                            <Input disabled={!canEdit} value={form.data.audience} onChange={(event) => form.setData('audience', event.target.value)} required maxLength={255} />
                        </label>
                        <label className={fieldClass}>Market
                            <select className={selectClass} disabled={!canEdit} value={form.data.market} onChange={(event) => form.setData('market', event.target.value)}>
                                <option value="ethiopia">Ethiopia</option><option value="international">International</option>
                            </select>
                        </label>
                        <label className={fieldClass}>Service
                            <select className={selectClass} disabled={!canEdit} value={form.data.service} onChange={(event) => form.setData('service', event.target.value)} required>
                                {Object.entries(options.services).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                            </select>
                        </label>
                        <label className={fieldClass}>Objective
                            <select className={selectClass} disabled={!canEdit} value={form.data.objective} onChange={(event) => form.setData('objective', event.target.value)}>
                                {Object.entries(options.objectives).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                            </select>
                        </label>
                        <label className={fieldClass}>Tone
                            <Input disabled={!canEdit} value={form.data.tone} onChange={(event) => form.setData('tone', event.target.value)} required maxLength={120} />
                        </label>
                        <label className={fieldClass}>Language
                            <select className={selectClass} disabled={!canEdit} value={form.data.language} onChange={(event) => form.setData('language', event.target.value)}>
                                <option value="en">English</option><option value="am">Amharic</option>
                            </select>
                        </label>
                        <label className={fieldClass}>Call to action
                            <Input disabled={!canEdit} value={form.data.call_to_action} onChange={(event) => form.setData('call_to_action', event.target.value)} maxLength={255} />
                        </label>
                        <label className={fieldClass}>Published portfolio reference
                            <select className={selectClass} disabled={!canEdit} value={form.data.portfolio_project_id} onChange={(event) => form.setData('portfolio_project_id', event.target.value)}>
                                <option value="">No project reference</option>
                                {options.portfolioProjects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
                            </select>
                        </label>
                    </div>

                    <label className={fieldClass}>Title
                        <Input disabled={!canEdit} value={form.data.title} onChange={(event) => form.setData('title', event.target.value)} required maxLength={255} />
                    </label>
                    <label className={fieldClass}>Content
                        <textarea disabled={!canEdit} className="min-h-64 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.data.body} onChange={(event) => form.setData('body', event.target.value)} maxLength={12000} />
                    </label>

                    <div className="flex flex-wrap gap-2">
                        <Button type="submit" disabled={!canEdit || form.processing}>{draft ? 'Save changes' : 'Save idea'}</Button>
                        {!draft && <Button type="button" variant="outline" onClick={generate} disabled={form.processing}>Generate AI draft</Button>}
                    </div>
                    {draft?.is_generated && <p className="text-xs text-muted-foreground">Generated via {draft.provider ?? 'configured provider'} · {draft.provider_model ?? 'model not recorded'} · template {draft.prompt_template_key ?? 'unknown'}</p>}
                </form>

                {draft && (
                    <section className="grid gap-4 rounded-xl border border-border bg-card p-5">
                        <h2 className="text-lg font-semibold">Review and publishing</h2>
                        <p className="text-sm text-muted-foreground">Generated content is a draft. Verify every claim and obtain any required approval before publishing. No social publishing integration is configured.</p>
                        <div className="flex flex-wrap gap-2">
                            {['idea', 'draft', 'failed'].includes(draft.status) && <Button variant="outline" onClick={() => submitAction('content-studio.review')}>Submit for review</Button>}
                            {draft.status === 'in_review' && <Button onClick={() => submitAction('content-studio.approve')}>Approve content</Button>}
                            {!['published', 'archived'].includes(draft.status) && (
                                <Button variant="destructive" onClick={() => window.confirm('Archive this content?') && submitAction('content-studio.archive')}>Archive</Button>
                            )}
                        </div>
                        {['approved', 'scheduled'].includes(draft.status) && (
                            <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
                                <label className={fieldClass}>Manual publication reminder
                                    <Input type="datetime-local" value={form.data.scheduled_at} onChange={(event) => form.setData('scheduled_at', event.target.value)} />
                                </label>
                                <div className="flex items-end"><Button variant="outline" onClick={() => submitAction('content-studio.schedule', { scheduled_at: form.data.scheduled_at })} disabled={!form.data.scheduled_at}>Save schedule</Button></div>
                                <label className={`${fieldClass} sm:col-span-2`}>Published URL (optional)
                                    <Input type="url" placeholder="https://…" value={form.data.published_url} onChange={(event) => form.setData('published_url', event.target.value)} />
                                </label>
                                <div className="sm:col-span-2">
                                    <Button onClick={() => window.confirm('Confirm you published this content manually?') && submitAction('content-studio.publish', { confirmed: true, published_url: form.data.published_url })}>Confirm manual publication</Button>
                                </div>
                            </div>
                        )}
                        {draft.status === 'scheduled' && (
                            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                                <Input aria-label="Publication failure details" placeholder="Describe the failed manual attempt" value={form.data.failure_details} onChange={(event) => form.setData('failure_details', event.target.value)} />
                                <Button variant="outline" onClick={() => submitAction('content-studio.failed', { failure_details: form.data.failure_details })} disabled={!form.data.failure_details}>Record failure</Button>
                            </div>
                        )}
                        {draft.status === 'published' && <p className="text-sm">Manually recorded as published{draft.published_url ? <>: <a className="underline" href={draft.published_url} target="_blank" rel="noreferrer">{draft.published_url}</a></> : '.'}</p>}
                        {draft.failure_details && <p className="rounded-md bg-destructive/5 p-3 text-sm">Last failure: {draft.failure_details}</p>}
                    </section>
                )}

                {versions.length > 0 && (
                    <section className="rounded-xl border border-border bg-card p-5">
                        <h2 className="mb-3 text-lg font-semibold">Version history</h2>
                        <div className="space-y-3">
                            {versions.map((version) => (
                                <details key={version.id} className="rounded-md border border-border p-3">
                                    <summary className="cursor-pointer text-sm font-medium">{version.reason} · {new Date(version.created_at).toLocaleString()} · {version.title}</summary>
                                    <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{version.body || 'No body.'}</p>
                                </details>
                            ))}
                        </div>
                    </section>
                )}

                <Link href={route('content-studio.index')} className="text-sm text-primary underline">Back to content library</Link>
            </main>
        </AppLayout>
    );
}
