import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { AlertTriangle, ArrowLeft, CheckCircle2, CopyX, FileSpreadsheet, Upload, Users } from 'lucide-react';
import { type FormEvent, type ReactNode, useEffect, useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Contacts', href: '/admin/contacts' },
    { title: 'Import', href: '/admin/contacts/import' },
];

interface CsvHeader {
    key: string;
    label: string;
}

interface PreviewRow {
    row: number;
    status: 'ok' | 'duplicate' | 'invalid';
    issues: string[];
    email: string | null;
    name: string | null;
    phone: string | null;
    values: Record<string, string | null>;
}

interface ImportPreview {
    token: string;
    file_name: string;
    headers: CsvHeader[];
    mapping: Record<string, string>;
    truncated: boolean;
    max_rows: number;
    summary: {
        total: number;
        importable: number;
        duplicates: number;
        invalid: number;
    };
    rows: PreviewRow[];
}

interface ImportSummary {
    created: number;
    updated: number;
    skipped: number;
    invalid: number;
    total: number;
    duplicate_strategy: string;
    errors: Array<{ row: number; issues: string[] }>;
}

interface FunnelOption {
    id: number;
    name: string;
    slug: string;
}

interface ContactsImportProps {
    funnels: FunnelOption[];
    statuses: string[];
    fields: string[];
    strategies: string[];
    limits: { max_rows: number; max_file_kilobytes: number };
    preview: ImportPreview | null;
    summary: ImportSummary | null;
}

const statusStyles: Record<PreviewRow['status'], string> = {
    ok: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500',
    duplicate: 'border-amber-500/20 bg-amber-500/10 text-amber-500',
    invalid: 'border-red-500/20 bg-red-500/10 text-red-500',
};

const statusLabels: Record<PreviewRow['status'], string> = {
    ok: 'Importable',
    duplicate: 'Duplicate',
    invalid: 'Invalid',
};

function titleCase(value: string): string {
    return value.replace(/[_-]+/g, ' ').replace(/^./, (character) => character.toUpperCase());
}

export default function ContactsImport({ funnels, statuses, fields, strategies, limits, preview, summary }: ContactsImportProps) {
    const errors = usePage().props.errors as Record<string, string>;

    const [file, setFile] = useState<File | null>(null);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [duplicateStrategy, setDuplicateStrategy] = useState<string>(strategies[0] ?? 'skip');
    const [defaultFunnelId, setDefaultFunnelId] = useState<string>('');
    const [defaultStatus, setDefaultStatus] = useState<string>('');
    const [defaultSource, setDefaultSource] = useState<string>('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        setMapping(preview ? { ...preview.mapping } : {});
    }, [preview]);

    const submitPreview = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!file) {
            return;
        }

        setBusy(true);
        router.post(
            route('contacts.import.preview'),
            { file },
            {
                forceFormData: true,
                preserveScroll: true,
                onFinish: () => setBusy(false),
            },
        );
    };

    const submitImport = () => {
        if (!preview) {
            return;
        }

        setBusy(true);
        router.post(
            route('contacts.import.store'),
            {
                token: preview.token,
                mapping,
                duplicate_strategy: duplicateStrategy,
                default_funnel_id: defaultFunnelId || null,
                default_status: defaultStatus || null,
                default_source: defaultSource || null,
            },
            {
                preserveScroll: true,
                onFinish: () => setBusy(false),
            },
        );
    };

    const resetUpload = () => {
        setFile(null);
        router.get(route('contacts.import.create'), {}, { preserveState: false, replace: true });
    };

    const mappedKeys = Object.values(mapping).filter(Boolean);
    const plannedCount = preview
        ? duplicateStrategy === 'update'
            ? preview.summary.importable + preview.summary.duplicates
            : preview.summary.importable
        : 0;
    const canImport = Boolean(mapping.email) && plannedCount > 0 && !busy;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Import contacts" />
            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4 md:p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                    <div className="flex items-start gap-3">
                        <Link
                            href={route('contacts.index')}
                            className="mt-0.5 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            aria-label="Back to contacts"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">Import contacts</h1>
                            <p className="text-muted-foreground">
                                Upload a CSV, review the detected columns, and import without creating duplicates.
                            </p>
                        </div>
                    </div>
                </div>

                {summary ? (
                    <SummaryPanel summary={summary} />
                ) : (
                    <>
                        {!preview && (
                            <form onSubmit={submitPreview} className="rounded-xl border border-border bg-card p-5">
                                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                                    <FileSpreadsheet className="h-4 w-4" />
                                    Step 1: Choose your CSV
                                </div>
                                <div className="grid gap-4">
                                    <label className="grid gap-1 text-sm font-medium text-foreground">
                                        CSV file
                                        <input
                                            type="file"
                                            accept=".csv,text/csv"
                                            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                                            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                                        />
                                        <span className="text-xs font-normal text-muted-foreground">
                                            First row must contain headers. Up to {limits.max_rows} rows and{' '}
                                            {Math.floor(limits.max_file_kilobytes / 1024)} MB. Supported headers: email (required), name, phone,
                                            status, source, funnel, tags.
                                        </span>
                                    </label>
                                    {errors.file && <p className="text-sm text-red-500">{errors.file}</p>}
                                    <div>
                                        <button
                                            type="submit"
                                            disabled={!file || busy}
                                            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <Upload className="h-4 w-4" />
                                            {busy ? 'Reading file…' : 'Preview import'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}

                        {preview && (
                            <div className="grid gap-6">
                                <div className="grid gap-4 md:grid-cols-4">
                                    <MetricCard
                                        label="Rows read"
                                        value={preview.summary.total}
                                        icon={<FileSpreadsheet className="h-7 w-7 text-chart-1" />}
                                    />
                                    <MetricCard
                                        label="Ready to import"
                                        value={preview.summary.importable}
                                        icon={<CheckCircle2 className="h-7 w-7 text-chart-2" />}
                                    />
                                    <MetricCard
                                        label="Duplicates"
                                        value={preview.summary.duplicates}
                                        icon={<CopyX className="h-7 w-7 text-chart-3" />}
                                    />
                                    <MetricCard
                                        label="Invalid rows"
                                        value={preview.summary.invalid}
                                        icon={<AlertTriangle className="h-7 w-7 text-chart-4" />}
                                    />
                                </div>

                                {preview.truncated && (
                                    <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-500">
                                        Only the first {preview.max_rows} rows were read. Split larger files and import them in batches.
                                    </p>
                                )}

                                <div className="rounded-xl border border-border bg-card p-5">
                                    <div className="mb-4 text-sm font-semibold text-foreground">Step 2: Match your columns</div>
                                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                        {fields.map((field) => (
                                            <label key={field} className="grid gap-1 text-sm font-medium text-foreground">
                                                {titleCase(field)}
                                                {field === 'email' && <span className="text-xs font-normal text-red-500">required</span>}
                                                <select
                                                    value={mapping[field] ?? ''}
                                                    onChange={(event) => setMapping((current) => ({ ...current, [field]: event.target.value }))}
                                                    className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                                                >
                                                    <option value="">Do not import</option>
                                                    {preview.headers.map((header) => (
                                                        <option
                                                            key={header.key}
                                                            value={header.key}
                                                            disabled={mappedKeys.includes(header.key) && mapping[field] !== header.key}
                                                        >
                                                            {header.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </label>
                                        ))}
                                    </div>
                                    {(errors.mapping || errors.token || errors.default_funnel_id || errors.file) && (
                                        <p className="mt-3 text-sm text-red-500">
                                            {errors.mapping ?? errors.token ?? errors.default_funnel_id ?? errors.file}
                                        </p>
                                    )}
                                </div>

                                <div className="rounded-xl border border-border bg-card p-5">
                                    <div className="mb-4 text-sm font-semibold text-foreground">Step 3: Handle duplicates and apply defaults</div>
                                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                        <label className="grid gap-1 text-sm font-medium text-foreground">
                                            When the email already exists
                                            <select
                                                value={duplicateStrategy}
                                                onChange={(event) => setDuplicateStrategy(event.target.value)}
                                                className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                                            >
                                                {strategies.map((strategy) => (
                                                    <option key={strategy} value={strategy}>
                                                        {strategy === 'skip' ? 'Skip existing contacts' : 'Update existing contacts'}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                        <label className="grid gap-1 text-sm font-medium text-foreground">
                                            Default funnel (optional)
                                            <select
                                                value={defaultFunnelId}
                                                onChange={(event) => setDefaultFunnelId(event.target.value)}
                                                className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                                            >
                                                <option value="">No funnel</option>
                                                {funnels.map((funnel) => (
                                                    <option key={funnel.id} value={funnel.id}>
                                                        {funnel.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                        <label className="grid gap-1 text-sm font-medium text-foreground">
                                            Default status (optional)
                                            <select
                                                value={defaultStatus}
                                                onChange={(event) => setDefaultStatus(event.target.value)}
                                                className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                                            >
                                                <option value="">Use row value or “new”</option>
                                                {statuses.map((status) => (
                                                    <option key={status} value={status}>
                                                        {titleCase(status)}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                        <label className="grid gap-1 text-sm font-medium text-foreground">
                                            Default source (optional)
                                            <input
                                                value={defaultSource}
                                                onChange={(event) => setDefaultSource(event.target.value)}
                                                placeholder="csv_import"
                                                className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground"
                                            />
                                        </label>
                                    </div>

                                    <div className="mt-5 flex flex-wrap items-center gap-3">
                                        <button
                                            type="button"
                                            onClick={submitImport}
                                            disabled={!canImport}
                                            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            <Users className="h-4 w-4" />
                                            {busy ? 'Importing…' : `Import ${plannedCount} contacts`}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={resetUpload}
                                            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                                        >
                                            Choose a different file
                                        </button>
                                        <span className="text-sm text-muted-foreground">Preview of {preview.file_name}</span>
                                    </div>
                                </div>

                                <div className="overflow-hidden rounded-xl border border-border bg-card">
                                    <div className="border-b border-border px-5 py-3 text-sm font-semibold text-foreground">
                                        Row preview (first {preview.rows.length} of {preview.summary.total})
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                                                    <th className="px-5 py-3">Row</th>
                                                    <th className="px-5 py-3">Email</th>
                                                    <th className="px-5 py-3">Name</th>
                                                    <th className="px-5 py-3">Status</th>
                                                    <th className="px-5 py-3">Notes</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {preview.rows.map((row) => (
                                                    <tr key={row.row} className="border-b border-border last:border-b-0">
                                                        <td className="px-5 py-3 text-muted-foreground tabular-nums">{row.row}</td>
                                                        <td className="px-5 py-3 text-foreground">{row.email ?? '—'}</td>
                                                        <td className="px-5 py-3 text-muted-foreground">{row.name ?? '—'}</td>
                                                        <td className="px-5 py-3">
                                                            <span
                                                                className={`rounded-full border px-2 py-1 text-xs font-medium ${statusStyles[row.status]}`}
                                                            >
                                                                {statusLabels[row.status]}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-3 text-muted-foreground">{row.issues.join(' ') || '—'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </AppLayout>
    );
}

function MetricCard({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
    return (
        <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold text-foreground">{value}</p>
                </div>
                {icon}
            </div>
        </div>
    );
}

function SummaryPanel({ summary }: { summary: ImportSummary }) {
    return (
        <div className="grid gap-6">
            <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                Import complete
            </div>

            <div className="grid gap-4 md:grid-cols-4">
                <MetricCard label="Created" value={summary.created} icon={<Users className="h-7 w-7 text-chart-1" />} />
                <MetricCard label="Updated" value={summary.updated} icon={<CheckCircle2 className="h-7 w-7 text-chart-2" />} />
                <MetricCard
                    label={summary.duplicate_strategy === 'update' ? 'Duplicates in file' : 'Skipped duplicates'}
                    value={summary.skipped}
                    icon={<CopyX className="h-7 w-7 text-chart-3" />}
                />
                <MetricCard label="Invalid rows" value={summary.invalid} icon={<AlertTriangle className="h-7 w-7 text-chart-4" />} />
            </div>

            {summary.errors.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                    <div className="border-b border-border px-5 py-3 text-sm font-semibold text-foreground">
                        Skipped rows ({summary.errors.length})
                    </div>
                    <ul className="divide-y divide-border text-sm">
                        {summary.errors.map((error) => (
                            <li key={error.row} className="flex items-center justify-between gap-4 px-5 py-3">
                                <span className="text-muted-foreground">Row {error.row}</span>
                                <span className="text-red-500">{error.issues.join(' ')}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="flex flex-wrap gap-3">
                <Link
                    href={route('contacts.index')}
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                    View contacts
                </Link>
                <Link
                    href={route('contacts.import.create')}
                    className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                    Import another file
                </Link>
            </div>
        </div>
    );
}
