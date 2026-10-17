import PublicLayout from '@/layouts/public-layout';
import { Button } from '@/components/ui/button';
import { Head } from '@inertiajs/react';
import { useState, type FormEvent } from 'react';

type Stack = 'mern' | 'laravel-react';
type Feature = 'auth' | 'api' | 'forms' | 'tests' | 'docker';

interface Simulation {
    stack: Stack;
    selected_features: Feature[];
    steps: string[];
    status: 'simulation_only';
}

const featureOptions: Array<{ value: Feature; label: string }> = [
    { value: 'auth', label: 'Authentication guidance' },
    { value: 'api', label: 'API guidance' },
    { value: 'forms', label: 'Forms guidance' },
    { value: 'tests', label: 'Test plan' },
    { value: 'docker', label: 'Container example' },
];

function isSimulation(value: unknown): value is { simulation: Simulation } {
    if (typeof value !== 'object' || value === null || !('simulation' in value)) return false;
    const simulation = value.simulation;
    return typeof simulation === 'object'
        && simulation !== null
        && 'stack' in simulation
        && (simulation.stack === 'mern' || simulation.stack === 'laravel-react')
        && 'selected_features' in simulation
        && Array.isArray(simulation.selected_features)
        && 'steps' in simulation
        && Array.isArray(simulation.steps)
        && simulation.steps.every((step: unknown) => typeof step === 'string')
        && 'status' in simulation
        && simulation.status === 'simulation_only';
}

export default function DeveloperTools({ playgroundUrl, exportUrl }: { playgroundUrl: string; exportUrl: string }) {
    const [stack, setStack] = useState<Stack>('mern');
    const [features, setFeatures] = useState<Feature[]>([]);
    const [simulation, setSimulation] = useState<Simulation | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const csrfToken = typeof document === 'undefined' ? null : document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? null;

    const toggleFeature = (feature: Feature) => {
        setFeatures((current) => current.includes(feature) ? current.filter((item) => item !== feature) : [...current, feature]);
    };

    const runSimulation = async () => {
        setLoading(true);
        setError(null);
        try {
            if (!csrfToken) throw new Error('Could not read the request token. Reload this page and try again.');
            const response = await fetch(playgroundUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': csrfToken },
                body: JSON.stringify({ stack, features }),
            });
            if (!response.ok) throw new Error(`Simulation request failed (${response.status}). Please try again.`);
            const payload: unknown = await response.json();
            if (!isSimulation(payload)) throw new Error('The server returned an unexpected simulation response.');
            setSimulation(payload.simulation);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'Simulation could not be completed.');
        } finally {
            setLoading(false);
        }
    };

    const submitSimulation = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        void runSimulation();
    };

    return (
        <PublicLayout>
            <Head title="Developer Playground and Starter Export" />
            <main className="px-4 py-12 sm:px-6">
                <div className="mx-auto max-w-4xl space-y-8">
                    <header>
                        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Developer tools</p>
                        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Plan a starter without running code</h1>
                        <p className="mt-3 max-w-2xl text-muted-foreground">
                            Preview a deterministic setup simulation, or download a ZIP containing scaffold files, selected guidance, and placeholder-only configuration.
                        </p>
                    </header>

                    <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
                        <h2 className="text-xl font-semibold">Simulated playground</h2>
                        <form onSubmit={submitSimulation} className="mt-5 space-y-5">
                            <label className="block max-w-sm space-y-2">
                                <span className="text-sm font-medium">Starter stack</span>
                                <select value={stack} onChange={(event) => setStack(event.target.value as Stack)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                                    <option value="mern">MERN</option>
                                    <option value="laravel-react">Laravel + React</option>
                                </select>
                            </label>
                            <fieldset className="space-y-3">
                                <legend className="text-sm font-medium">Optional sections</legend>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {featureOptions.map((option) => (
                                        <label key={option.value} className="flex items-center gap-2 text-sm">
                                            <input type="checkbox" checked={features.includes(option.value)} onChange={() => toggleFeature(option.value)} />
                                            {option.label}
                                        </label>
                                    ))}
                                </div>
                            </fieldset>
                            <Button type="submit" disabled={loading}>{loading ? 'Simulating…' : 'Run simulation'}</Button>
                        </form>
                        {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
                        {simulation && (
                            <div className="mt-5 rounded-xl bg-muted/50 p-4">
                                <p className="font-semibold">Simulation only · {simulation.stack === 'mern' ? 'MERN' : 'Laravel + React'}</p>
                                <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                                    {simulation.steps.map((step) => <li key={step}>{step}</li>)}
                                </ol>
                            </div>
                        )}
                    </section>

                    <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
                        <h2 className="text-xl font-semibold">Download a configurable ZIP</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                            The archive is assembled from fixed templates; it does not contain real credentials or execute commands on this server.
                        </p>
                        <form action={exportUrl} method="post" className="mt-5 space-y-5">
                            <input type="hidden" name="_token" value={csrfToken ?? ''} />
                            <label className="block max-w-sm space-y-2">
                                <span className="text-sm font-medium">Starter stack</span>
                                <select name="stack" value={stack} onChange={(event) => setStack(event.target.value as Stack)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                                    <option value="mern">MERN</option>
                                    <option value="laravel-react">Laravel + React</option>
                                </select>
                            </label>
                            <fieldset className="space-y-3">
                                <legend className="text-sm font-medium">Include optional sections</legend>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {featureOptions.map((option) => (
                                        <label key={option.value} className="flex items-center gap-2 text-sm">
                                            <input type="checkbox" name="features[]" value={option.value} checked={features.includes(option.value)} onChange={() => toggleFeature(option.value)} />
                                            {option.label}
                                        </label>
                                    ))}
                                </div>
                            </fieldset>
                            <Button type="submit" disabled={!csrfToken}>Download starter ZIP</Button>
                        </form>
                    </section>
                </div>
            </main>
        </PublicLayout>
    );
}
