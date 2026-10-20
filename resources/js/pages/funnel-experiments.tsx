import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, Beaker, Pause, Play, Square, XCircle } from 'lucide-react';
import { FormEvent, useMemo, useState } from 'react';

interface FunnelExperimentProps {
    id: number;
    name: string;
    hypothesis: string;
    target_step: string | null;
    primary_metric: string;
    guardrail_metrics: string[];
    allocations: Array<{ variant_id: number; weight: number }>;
    status: 'draft' | 'running' | 'paused' | 'completed' | 'cancelled';
    starts_at: string | null;
    ends_at: string | null;
    ended_at: string | null;
    activity_history: Array<{ status: string; actor_user_id: number; at: string }>;
    evaluation: {
        duration_days: number;
        conclusion: string;
        warnings: string[];
        variants: Array<{
            variant_id: number | null;
            name: string;
            allocation_percent: number;
            eligible_sessions: number;
            exposures: number;
            numerator: number;
            denominator: number;
            rate: number | null;
            difference_percentage_points: number | null;
            sample_sufficient: boolean;
            guardrails: Array<{ metric: string; numerator: number; denominator: number; rate: number | null }>;
        }>;
    };
}

interface FunnelExperimentsProps {
    funnel: { id: number; name: string; is_published: boolean };
    variants: Array<{ id: number; name: string; weight: number; is_active: boolean }>;
    experiments: FunnelExperimentProps[];
}

const metrics = [
    ['conversion_rate', 'Conversion rate'],
    ['form_completion_rate', 'Form completion rate'],
    ['cta_click_rate', 'CTA click rate'],
] as const;
const guardrails = [...metrics, ['form_validation_errors', 'Form validation errors']] as const;

export default function FunnelExperimentsPage({ funnel, variants, experiments }: FunnelExperimentsProps) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Funnels', href: '/funnels' },
        { title: funnel.name, href: `/funnel-editor/${funnel.id}` },
        { title: 'Experiments', href: route('funnels.experiments.index', { funnel: funnel.id }) },
    ];
    const [name, setName] = useState('');
    const [hypothesis, setHypothesis] = useState('');
    const [targetStep, setTargetStep] = useState('');
    const [primaryMetric, setPrimaryMetric] = useState<string>('conversion_rate');
    const [selected, setSelected] = useState<number[]>([]);
    const [weights, setWeights] = useState<Record<number, number>>({});
    const [guardrailSelection, setGuardrailSelection] = useState<string[]>([]);
    const [startsAt, setStartsAt] = useState('');
    const [endsAt, setEndsAt] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const allocated = useMemo(() => selected.reduce((sum, id) => sum + (weights[id] ?? 0), 0), [selected, weights]);

    const createExperiment = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
        void fetch(route('funnels.experiments.store', { funnel: funnel.id }), {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': token },
            body: JSON.stringify({
                name,
                hypothesis,
                target_step: targetStep || null,
                primary_metric: primaryMetric,
                guardrail_metrics: guardrailSelection,
                allocations: selected.map((variant_id) => ({ variant_id, weight: weights[variant_id] ?? 0 })),
                starts_at: startsAt || null,
                ends_at: endsAt || null,
            }),
        })
            .then(async (response) => {
                const result = await response.json();
                if (!response.ok) {
                    const firstError = Object.values(result.errors ?? {}).flat()[0];
                    throw new Error(firstError ?? result.message ?? 'Could not save this experiment.');
                }
                router.reload({ only: ['experiments'] });
                setName('');
                setHypothesis('');
                setTargetStep('');
                setSelected([]);
                setGuardrailSelection([]);
            })
            .catch((requestError: unknown) => setError(requestError instanceof Error ? requestError.message : 'Could not save this experiment.'))
            .finally(() => setBusy(false));
    };

    const changeStatus = (experiment: FunnelExperimentProps, status: 'running' | 'paused' | 'completed' | 'cancelled') => {
        const label =
            status === 'cancelled' ? 'Cancel' : status === 'completed' ? 'Stop and complete' : status === 'running' ? 'Start or resume' : 'Pause';
        if (!window.confirm(`${label} “${experiment.name}”?`)) return;
        router.patch(route('funnels.experiments.status', { funnel: funnel.id, experiment: experiment.id }), { status }, { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Experiments — ${funnel.name}`} />
            <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
                <header className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <Link
                            href={`/funnels/${funnel.id}/copilot`}
                            className="mb-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                        >
                            <ArrowLeft className="h-4 w-4" /> Back to Copilot
                        </Link>
                        <h1 className="flex items-center gap-2 text-2xl font-bold">
                            <Beaker className="h-6 w-6 text-green-400" /> Controlled experiments
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {funnel.name} · Published content stays unchanged; experiments serve existing saved variants only.
                        </p>
                    </div>
                    <Link href={`/funnel-editor/${funnel.id}`} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted">
                        Edit funnel variants
                    </Link>
                </header>

                {!funnel.is_published && (
                    <p className="rounded-lg border border-yellow-800 bg-yellow-950/30 p-3 text-sm text-yellow-200">
                        Publish this funnel before starting an experiment. Draft experiments can still be prepared.
                    </p>
                )}
                {error && (
                    <p className="rounded-lg border border-red-800 bg-red-950/30 p-3 text-sm text-red-200" role="alert">
                        {error}
                    </p>
                )}

                <form onSubmit={createExperiment} className="space-y-4 rounded-xl border border-border bg-card p-5">
                    <div>
                        <h2 className="text-lg font-semibold">Prepare an experiment</h2>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Allocations are variant percentages; remaining traffic is the unchanged funnel control. At least 1% remains assigned to
                            control.
                        </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-sm">
                            Experiment name
                            <input
                                required
                                maxLength={120}
                                value={name}
                                onChange={(event) => setName(event.target.value)}
                                className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2"
                            />
                        </label>
                        <label className="text-sm">
                            Target page or step
                            <input
                                maxLength={80}
                                value={targetStep}
                                onChange={(event) => setTargetStep(event.target.value)}
                                className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2"
                            />
                        </label>
                        <label className="text-sm md:col-span-2">
                            Hypothesis
                            <textarea
                                required
                                maxLength={2000}
                                value={hypothesis}
                                onChange={(event) => setHypothesis(event.target.value)}
                                className="mt-1 block min-h-20 w-full rounded-md border border-border bg-background px-3 py-2"
                            />
                        </label>
                        <label className="text-sm">
                            Primary metric
                            <select
                                value={primaryMetric}
                                onChange={(event) => setPrimaryMetric(event.target.value)}
                                className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2"
                            >
                                {metrics.map(([value, label]) => (
                                    <option key={value} value={value}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="text-sm">
                                Start at (optional)
                                <input
                                    type="datetime-local"
                                    value={startsAt}
                                    onChange={(event) => setStartsAt(event.target.value)}
                                    className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2"
                                />
                            </label>
                            <label className="text-sm">
                                End at (optional)
                                <input
                                    type="datetime-local"
                                    value={endsAt}
                                    onChange={(event) => setEndsAt(event.target.value)}
                                    className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2"
                                />
                            </label>
                        </div>
                    </div>

                    <fieldset className="space-y-2">
                        <legend className="text-sm font-medium">Existing variants and traffic allocation</legend>
                        {variants.length === 0 ? (
                            <p className="text-sm text-muted-foreground">Create a variant in the funnel editor first.</p>
                        ) : (
                            variants.map((variant) => (
                                <div key={variant.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2">
                                    <label className="flex flex-1 items-center gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={selected.includes(variant.id)}
                                            onChange={(event) =>
                                                setSelected((items) =>
                                                    event.target.checked ? [...items, variant.id] : items.filter((id) => id !== variant.id),
                                                )
                                            }
                                        />
                                        {variant.name}
                                        {variant.is_active ? ' (currently active)' : ''}
                                    </label>
                                    <label className="text-xs text-muted-foreground">
                                        Allocation %
                                        <input
                                            type="number"
                                            min={1}
                                            max={99}
                                            value={weights[variant.id] ?? variant.weight}
                                            onChange={(event) => setWeights((items) => ({ ...items, [variant.id]: Number(event.target.value) }))}
                                            disabled={!selected.includes(variant.id)}
                                            className="ml-2 w-20 rounded border border-border bg-background px-2 py-1 text-sm text-foreground disabled:opacity-50"
                                        />
                                    </label>
                                </div>
                            ))
                        )}
                        <p className="text-xs text-muted-foreground">
                            Variant traffic: {allocated}% · Control traffic: {Math.max(0, 100 - allocated)}%
                        </p>
                    </fieldset>

                    <fieldset className="flex flex-wrap gap-4">
                        <legend className="mb-2 w-full text-sm font-medium">Optional guardrails (monitoring only)</legend>
                        {guardrails.map(([value, label]) => (
                            <label key={value} className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={guardrailSelection.includes(value)}
                                    onChange={(event) =>
                                        setGuardrailSelection((items) =>
                                            event.target.checked ? [...items, value] : items.filter((item) => item !== value),
                                        )
                                    }
                                />
                                {label}
                            </label>
                        ))}
                    </fieldset>
                    <button
                        type="submit"
                        disabled={
                            busy ||
                            !name.trim() ||
                            !hypothesis.trim() ||
                            selected.length === 0 ||
                            allocated >= 100 ||
                            selected.some((id) => (weights[id] ?? variants.find((variant) => variant.id === id)?.weight ?? 0) < 1)
                        }
                        className="rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-50"
                    >
                        {busy ? 'Saving…' : 'Save draft'}
                    </button>
                </form>

                <section className="space-y-4">
                    <h2 className="text-lg font-semibold">Experiment action center</h2>
                    {experiments.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                            No experiments yet. Save a draft after creating one or more variants in the editor.
                        </div>
                    ) : (
                        experiments.map((experiment) => (
                            <article key={experiment.id} className="space-y-4 rounded-xl border border-border bg-card p-5">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-lg font-semibold">{experiment.name}</h3>
                                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{experiment.status}</span>
                                        </div>
                                        <p className="mt-1 text-sm">{experiment.hypothesis}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            Primary metric: {experiment.primary_metric} · Duration: {experiment.evaluation.duration_days} days
                                            {experiment.target_step ? ` · Target: ${experiment.target_step}` : ''}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        {(experiment.status === 'draft' || experiment.status === 'paused') && (
                                            <button
                                                onClick={() => changeStatus(experiment, 'running')}
                                                disabled={!funnel.is_published}
                                                className="inline-flex items-center gap-1 rounded border border-border px-3 py-1.5 text-sm disabled:opacity-50"
                                            >
                                                <Play className="h-4 w-4" />
                                                Start
                                            </button>
                                        )}
                                        {experiment.status === 'running' && (
                                            <button
                                                onClick={() => changeStatus(experiment, 'paused')}
                                                className="inline-flex items-center gap-1 rounded border border-border px-3 py-1.5 text-sm"
                                            >
                                                <Pause className="h-4 w-4" />
                                                Pause
                                            </button>
                                        )}
                                        {['running', 'paused'].includes(experiment.status) && (
                                            <button
                                                onClick={() => changeStatus(experiment, 'completed')}
                                                className="inline-flex items-center gap-1 rounded border border-border px-3 py-1.5 text-sm"
                                            >
                                                <Square className="h-4 w-4" />
                                                Complete
                                            </button>
                                        )}
                                        {['draft', 'running', 'paused'].includes(experiment.status) && (
                                            <button
                                                onClick={() => changeStatus(experiment, 'cancelled')}
                                                className="inline-flex items-center gap-1 rounded border border-border px-3 py-1.5 text-sm text-red-300"
                                            >
                                                <XCircle className="h-4 w-4" />
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[46rem] text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-border text-muted-foreground">
                                                <th className="py-2">Group</th>
                                                <th>Allocation</th>
                                                <th>Exposures</th>
                                                <th>Eligible sessions</th>
                                                <th>Numerator / denominator</th>
                                                <th>Rate</th>
                                                <th>Δ vs control</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {experiment.evaluation.variants.map((result) => (
                                                <tr key={result.variant_id ?? 'control'} className="border-b border-border/60">
                                                    <td className="py-2 font-medium">{result.name}</td>
                                                    <td>{result.allocation_percent}%</td>
                                                    <td>{result.exposures}</td>
                                                    <td>{result.eligible_sessions}</td>
                                                    <td>
                                                        {result.numerator} / {result.denominator}
                                                    </td>
                                                    <td>{result.rate === null ? '—' : `${result.rate}%`}</td>
                                                    <td>
                                                        {result.difference_percentage_points === null
                                                            ? '—'
                                                            : `${result.difference_percentage_points} pp`}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {experiment.evaluation.variants.some((result) => result.guardrails.length > 0) && (
                                    <details>
                                        <summary className="cursor-pointer text-xs text-muted-foreground">
                                            Guardrail metrics (monitoring only)
                                        </summary>
                                        <div className="mt-2 grid gap-2 md:grid-cols-2">
                                            {experiment.evaluation.variants.map(
                                                (result) =>
                                                    result.guardrails.length > 0 && (
                                                        <p key={result.variant_id ?? 'control'} className="text-xs text-muted-foreground">
                                                            <strong>{result.name}:</strong>{' '}
                                                            {result.guardrails
                                                                .map(
                                                                    (guardrail) =>
                                                                        `${guardrail.metric} ${guardrail.rate === null ? 'unavailable' : `${guardrail.rate}%`} (${guardrail.numerator}/${guardrail.denominator})`,
                                                                )
                                                                .join(' · ')}
                                                        </p>
                                                    ),
                                            )}
                                        </div>
                                    </details>
                                )}
                                <div className="rounded-lg border border-yellow-800 bg-yellow-950/20 p-3 text-sm text-yellow-100">
                                    <p className="font-medium">
                                        <AlertTriangle className="mr-1 inline h-4 w-4" /> Inconclusive — no winner is declared.
                                    </p>
                                    {experiment.evaluation.warnings.length > 0 && (
                                        <ul className="mt-2 list-inside list-disc text-xs">
                                            {experiment.evaluation.warnings.map((warning) => (
                                                <li key={warning}>{warning}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <details>
                                    <summary className="cursor-pointer text-xs text-muted-foreground">Action history</summary>
                                    <ol className="mt-2 space-y-1 text-xs text-muted-foreground">
                                        {experiment.activity_history.map((item, index) => (
                                            <li key={`${item.at}-${index}`}>
                                                {item.status} · {new Date(item.at).toLocaleString()} · user {item.actor_user_id}
                                            </li>
                                        ))}
                                    </ol>
                                </details>
                            </article>
                        ))
                    )}
                </section>
            </main>
        </AppLayout>
    );
}
