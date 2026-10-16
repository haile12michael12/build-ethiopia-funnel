import AppLayout from '@/layouts/app-layout';
import type { ClientAcquisitionSettings } from '@/types/client-acquisition';
import type { BreadcrumbItem } from '@/types';
import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowUpRight, Plus, Save, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';

interface SettingsPageProps {
    settings: ClientAcquisitionSettings;
    funnels: Array<{ id: number; name: string }>;
}

const weightLabels: Array<{ key: keyof ClientAcquisitionSettings['scoring_weights']; label: string }> = [
    { key: 'service_fit', label: 'Selected service fit' },
    { key: 'project_clarity', label: 'Project brief clarity' },
    { key: 'budget', label: 'Self-reported budget readiness' },
    { key: 'timeline', label: 'Self-reported timeline' },
    { key: 'consultation', label: 'Consultation/custom project request' },
];

export default function ClientAcquisitionSettingsPage({ settings, funnels }: SettingsPageProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Client Acquisition', href: route('client-acquisition.settings.edit') },
        { title: 'Settings', href: route('client-acquisition.settings.edit') },
    ];
    const form = useForm<ClientAcquisitionSettings>({ ...settings });
    const errors = Object.values(form.errors);

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.put(route('client-acquisition.settings.update'), { preserveScroll: true });
    };

    const updateArray = <K extends 'services' | 'budgets' | 'timelines'>(
        key: K,
        index: number,
        field: string,
        value: string | number,
    ) => {
        const updated = form.data[key].map((option, optionIndex) =>
            optionIndex === index ? { ...option, [field]: value } : option,
        );
        form.setData(key, updated as ClientAcquisitionSettings[K]);
    };

    const removeArrayItem = (key: 'services' | 'budgets' | 'timelines', index: number) => {
        form.setData(key, form.data[key].filter((_, optionIndex) => optionIndex !== index) as ClientAcquisitionSettings[typeof key]);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Client Acquisition Settings" />
            <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 sm:p-6">
                <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <p className="text-sm font-medium text-primary">Public project funnel</p>
                        <h1 className="mt-1 text-2xl font-bold">Client acquisition settings</h1>
                        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                            Manage qualification options, prioritization weights, response expectations, and the existing published funnel used for analytics.
                        </p>
                    </div>
                    <Link href={route('client-acquisition.show')} className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                        Preview public page <ArrowUpRight className="h-4 w-4" />
                    </Link>
                </header>

                <form onSubmit={submit} className="space-y-6">
                    <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
                        <div className="mb-5">
                            <h2 className="text-lg font-semibold">Service categories</h2>
                            <p className="mt-1 text-sm text-muted-foreground">Visitors can select up to five options. Published services and portfolio work are managed in their existing sections.</p>
                        </div>
                        <div className="space-y-3">
                            {form.data.services.map((service, index) => (
                                <div key={`service-${index}`} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                                    <input aria-label="Service key" value={service.key} onChange={(event) => updateArray('services', index, 'key', event.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="service_key" />
                                    <input aria-label="English service name" value={service.label_en} onChange={(event) => updateArray('services', index, 'label_en', event.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="English label" />
                                    <input aria-label="Amharic service name" value={service.label_am ?? ''} onChange={(event) => updateArray('services', index, 'label_am', event.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Amharic label" />
                                    <button type="button" aria-label="Remove service" onClick={() => removeArrayItem('services', index)} className="flex h-10 items-center justify-center rounded-md px-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                                </div>
                            ))}
                            <button type="button" onClick={() => form.setData('services', [...form.data.services, { key: '', label_en: '', label_am: null }])} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"><Plus className="h-4 w-4" /> Add service</button>
                        </div>
                    </section>

                    <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
                        <div className="mb-5">
                            <h2 className="text-lg font-semibold">Budget ranges</h2>
                            <p className="mt-1 text-sm text-muted-foreground">These are visitor-reported planning ranges, not published prices or quotes.</p>
                        </div>
                        <div className="space-y-3">
                            {form.data.budgets.map((budget, index) => (
                                <div key={`budget-${index}`} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[0.8fr_0.6fr_1fr_1fr_0.55fr_auto]">
                                    <input aria-label="Budget key" value={budget.key} onChange={(event) => updateArray('budgets', index, 'key', event.target.value)} className="min-w-0 rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="budget_key" />
                                    <select aria-label="Budget currency" value={budget.currency} onChange={(event) => updateArray('budgets', index, 'currency', event.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm"><option value="ETB">ETB</option><option value="USD">USD</option></select>
                                    <input aria-label="English budget label" value={budget.label_en} onChange={(event) => updateArray('budgets', index, 'label_en', event.target.value)} className="min-w-0 rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="English label" />
                                    <input aria-label="Amharic budget label" value={budget.label_am ?? ''} onChange={(event) => updateArray('budgets', index, 'label_am', event.target.value)} className="min-w-0 rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Amharic label" />
                                    <input aria-label="Budget score points" type="number" min={0} max={100} value={budget.score} onChange={(event) => updateArray('budgets', index, 'score', Number(event.target.value))} className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
                                    <button type="button" aria-label="Remove budget range" onClick={() => removeArrayItem('budgets', index)} className="flex h-10 items-center justify-center rounded-md px-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                                </div>
                            ))}
                            <button type="button" onClick={() => form.setData('budgets', [...form.data.budgets, { key: '', currency: 'ETB', label_en: '', label_am: null, score: 0 }])} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"><Plus className="h-4 w-4" /> Add budget range</button>
                        </div>
                    </section>

                    <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
                        <div className="mb-5">
                            <h2 className="text-lg font-semibold">Timeline options and lead priority</h2>
                            <p className="mt-1 text-sm text-muted-foreground">Scores are transparent prioritization aids based only on the project details a visitor voluntarily provides; market and personal identity are not scored.</p>
                        </div>
                        <div className="space-y-3">
                            {form.data.timelines.map((timeline, index) => (
                                <div key={`timeline-${index}`} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[1fr_1fr_1fr_0.6fr_auto]">
                                    <input aria-label="Timeline key" value={timeline.key} onChange={(event) => updateArray('timelines', index, 'key', event.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="timeline_key" />
                                    <input aria-label="English timeline label" value={timeline.label_en} onChange={(event) => updateArray('timelines', index, 'label_en', event.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="English label" />
                                    <input aria-label="Amharic timeline label" value={timeline.label_am ?? ''} onChange={(event) => updateArray('timelines', index, 'label_am', event.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm" placeholder="Amharic label" />
                                    <input aria-label="Timeline score points" type="number" min={0} max={100} value={timeline.score} onChange={(event) => updateArray('timelines', index, 'score', Number(event.target.value))} className="rounded-md border border-border bg-background px-3 py-2 text-sm" />
                                    <button type="button" aria-label="Remove timeline" onClick={() => removeArrayItem('timelines', index)} className="flex h-10 items-center justify-center rounded-md px-3 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                                </div>
                            ))}
                            <button type="button" onClick={() => form.setData('timelines', [...form.data.timelines, { key: '', label_en: '', label_am: null, score: 0 }])} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"><Plus className="h-4 w-4" /> Add timeline</button>
                        </div>
                        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {weightLabels.map(({ key, label }) => (
                                <label key={key} className="space-y-1.5 text-sm font-medium">
                                    {label} (points)
                                    <input type="number" min={0} max={100} value={form.data.scoring_weights[key]} onChange={(event) => form.setData('scoring_weights', { ...form.data.scoring_weights, [key]: Number(event.target.value) })} className="w-full rounded-md border border-border bg-background px-3 py-2" />
                                </label>
                            ))}
                            <label className="space-y-1.5 text-sm font-medium">
                                Qualified status threshold
                                <input type="number" min={0} max={100} value={form.data.qualified_score} onChange={(event) => form.setData('qualified_score', Number(event.target.value))} className="w-full rounded-md border border-border bg-background px-3 py-2" />
                            </label>
                        </div>
                    </section>

                    <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
                        <h2 className="text-lg font-semibold">Follow-up and analytics</h2>
                        <p className="mt-1 text-sm text-muted-foreground">Leave response time blank if you do not want to show an expectation. Meeting links invite visitors to request a time; they do not confirm a booking.</p>
                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                            <label className="space-y-1.5 text-sm font-medium">Expected response (hours, optional)<input type="number" min={1} max={720} value={form.data.response_time_hours ?? ''} onChange={(event) => form.setData('response_time_hours', event.target.value ? Number(event.target.value) : null)} className="w-full rounded-md border border-border bg-background px-3 py-2" /></label>
                            <label className="space-y-1.5 text-sm font-medium">Public response email<input type="email" value={form.data.response_email ?? ''} onChange={(event) => form.setData('response_email', event.target.value || null)} className="w-full rounded-md border border-border bg-background px-3 py-2" /></label>
                            <label className="space-y-1.5 text-sm font-medium">WhatsApp link<input type="url" value={form.data.whatsapp_url ?? ''} onChange={(event) => form.setData('whatsapp_url', event.target.value || null)} className="w-full rounded-md border border-border bg-background px-3 py-2" /></label>
                            <label className="space-y-1.5 text-sm font-medium">Meeting request link<input type="url" value={form.data.meeting_url ?? ''} onChange={(event) => form.setData('meeting_url', event.target.value || null)} className="w-full rounded-md border border-border bg-background px-3 py-2" /></label>
                            <label className="space-y-1.5 text-sm font-medium sm:col-span-2">
                                Published funnel used for analytics and Copilot
                                <select value={form.data.analytics_funnel_id ?? ''} onChange={(event) => form.setData('analytics_funnel_id', event.target.value ? Number(event.target.value) : null)} className="w-full rounded-md border border-border bg-background px-3 py-2">
                                    <option value="">No analytics funnel linked</option>
                                    {funnels.map((funnel) => <option key={funnel.id} value={funnel.id}>{funnel.name}</option>)}
                                </select>
                                {form.data.analytics_funnel_id && <Link href={route('copilot.show', form.data.analytics_funnel_id)} className="mt-2 inline-flex items-center gap-1 text-primary hover:underline">Open Copilot analysis <ArrowUpRight className="h-3.5 w-3.5" /></Link>}
                            </label>
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">The project request page sends views, form progress, and submitted conversions to the selected funnel. Existing experiment controls and analysis remain available on that funnel.</p>
                    </section>

                    {errors.length > 0 && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{errors[0]}</div>}
                    <div className="sticky bottom-3 flex justify-end rounded-lg border border-border bg-background/95 p-3 shadow-lg backdrop-blur">
                        <button type="submit" disabled={form.processing} className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
                            <Save className="h-4 w-4" /> {form.processing ? 'Saving…' : 'Save settings'}
                        </button>
                    </div>
                </form>
            </main>
        </AppLayout>
    );
}
