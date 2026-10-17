import PublicLayout from '@/layouts/public-layout';
import { Head, Link } from '@inertiajs/react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface AuditFinding {
    severity: string;
    title: string;
    path: string;
    line: number | null;
    detail: string;
}

interface AuditReportData {
    score: number;
    files_analyzed: number;
    files_skipped: number;
    findings: AuditFinding[];
    limitations: string[];
    expires_at: string;
}

export default function DeveloperAuditReportPage({ report }: { report: AuditReportData }) {
    return (
        <PublicLayout>
            <Head title="Code audit report" />
            <main className="px-4 py-12 sm:px-6">
                <div className="mx-auto max-w-4xl space-y-6">
                    <header className="rounded-2xl border border-border bg-card p-6 sm:p-8">
                        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Static analysis summary</p>
                        <h1 className="mt-2 text-3xl font-bold">Code audit report</h1>
                        <p className="mt-3 text-muted-foreground">
                            {report.files_analyzed} text files analyzed · {report.files_skipped} files skipped · Report available until{' '}
                            {new Date(report.expires_at).toLocaleString()}.
                        </p>
                        <div className="mt-5 flex items-center gap-3">
                            <span className="rounded-lg bg-primary/10 px-3 py-2 text-lg font-bold text-primary">{report.score}/100</span>
                            <span className="text-sm text-muted-foreground">Heuristic score only; not a certification or security guarantee.</span>
                        </div>
                    </header>

                    <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
                        <h2 className="text-xl font-semibold">Findings ({report.findings.length})</h2>
                        {report.findings.length > 0 ? (
                            <ul className="mt-4 space-y-4">
                                {report.findings.map((finding, index) => (
                                    <li key={`${finding.path}-${finding.line ?? 'file'}-${index}`} className="rounded-xl border border-border p-4">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <AlertTriangle className="size-4 text-primary" />
                                            <h3 className="font-semibold">{finding.title}</h3>
                                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{finding.severity}</span>
                                        </div>
                                        <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
                                            {finding.path}{finding.line ? `:${finding.line}` : ''}
                                        </p>
                                        <p className="mt-2 text-sm text-muted-foreground">{finding.detail}</p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                                <CheckCircle2 className="size-4" /> No configured patterns matched the inspected files.
                            </p>
                        )}
                    </section>

                    <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
                        <h2 className="text-xl font-semibold">Limitations</h2>
                        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
                            {report.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
                        </ul>
                        <p className="mt-4 text-xs text-muted-foreground">
                            The report stores findings and paths, not source file contents. It is deleted according to the stated expiry policy.
                        </p>
                    </section>

                    <Link href={route('developer-tools.index')} className="inline-block text-sm font-semibold text-primary hover:underline">
                        Open simulated playground and starter export
                    </Link>
                </div>
            </main>
        </PublicLayout>
    );
}
