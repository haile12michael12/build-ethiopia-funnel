import PublicLayout from '@/layouts/public-layout';
import { Head, useForm } from '@inertiajs/react';
import { FileArchive, ShieldCheck } from 'lucide-react';
import { type FormEvent } from 'react';

export default function DeveloperAuditIndex() {
    const form = useForm<{ email: string; archive: File | null }>({ email: '', archive: null });

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        form.post(route('developer-audit.store'), { forceFormData: true });
    };

    return (
        <PublicLayout>
            <Head title="Developer Code Audit" />
            <main className="px-4 py-12 sm:px-6">
                <div className="mx-auto max-w-3xl">
                    <header className="mb-8 text-center">
                        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <ShieldCheck className="size-6" />
                        </div>
                        <p className="text-sm font-semibold tracking-wide text-primary uppercase">Bounded static analysis</p>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Review a code ZIP for common risks</h1>
                        <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
                            Get a limited, pattern-based report. This tool does not run code, install packages, or fetch repository resources.
                        </p>
                    </header>

                    <form onSubmit={submit} className="space-y-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
                        <label className="block space-y-2">
                            <span className="text-sm font-medium">Email for the private report link</span>
                            <input
                                type="email"
                                required
                                maxLength={254}
                                autoComplete="email"
                                value={form.data.email}
                                onChange={(event) => form.setData('email', event.target.value)}
                                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                            />
                            {form.errors.email && (
                                <span role="alert" className="text-sm text-destructive">
                                    {form.errors.email}
                                </span>
                            )}
                        </label>

                        <label className="block space-y-2">
                            <span className="text-sm font-medium">Project archive (.zip, up to 10 MB)</span>
                            <span className="flex items-center gap-2 rounded-lg border border-dashed border-input bg-background px-3 py-4 text-sm text-muted-foreground">
                                <FileArchive className="size-5 shrink-0" />
                                <input
                                    type="file"
                                    accept=".zip,application/zip"
                                    required
                                    onChange={(event) => form.setData('archive', event.target.files?.[0] ?? null)}
                                    className="min-w-0 flex-1 file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
                                />
                            </span>
                            {form.errors.archive && (
                                <span role="alert" className="text-sm text-destructive">
                                    {form.errors.archive}
                                </span>
                            )}
                        </label>

                        {form.hasErrors && (
                            <p role="alert" className="text-sm text-destructive">
                                Please correct the fields above and try again.
                            </p>
                        )}
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="w-full rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60 sm:w-auto"
                        >
                            {form.processing ? 'Analyzing archive…' : 'Analyze ZIP and email report link'}
                        </button>
                        <ul className="space-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
                            <li>Only allowlisted text files are inspected; archive paths, file counts, and uncompressed size are bounded.</li>
                            <li>Source contents are not stored in the report. Findings and file paths are retained for up to seven days.</li>
                            <li>This is not a full security audit and may miss vulnerabilities or report false positives.</li>
                        </ul>
                    </form>
                </div>
            </main>
        </PublicLayout>
    );
}
