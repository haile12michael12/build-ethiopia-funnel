import { type BusinessAuditReport } from '@/types/business-audit';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

interface ThankYouProps {
    audit: {
        business_name: string;
        score: number;
        report: BusinessAuditReport;
    };
}

const labels: Record<string, string> = {
    business_profile: 'Business profile',
    website_readiness: 'Website readiness',
    service_interest: 'Service focus',
    budget: 'Investment range',
    timeline: 'Project timeline',
};

export default function ThankYou({ audit }: ThankYouProps) {
    return (
        <>
            <Head title="Your Business Growth Audit" />
            <main className="min-h-screen bg-background px-4 py-12 text-foreground sm:px-6">
                <div className="mx-auto max-w-2xl space-y-6">
                    <section className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-10">
                        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
                        <h1 className="mt-4 text-3xl font-bold">Your audit is ready</h1>
                        <p className="mt-2 text-muted-foreground">
                            Thanks, {audit.business_name}. Here’s an initial snapshot of your growth readiness.
                        </p>
                        <div className="mx-auto mt-7 flex h-28 w-28 flex-col items-center justify-center rounded-full border-4 border-primary/30">
                            <span className="text-3xl font-bold">{audit.score}</span>
                            <span className="text-xs text-muted-foreground">out of 100</span>
                        </div>
                        <h2 className="mt-5 text-xl font-semibold">{audit.report.label}</h2>
                        <p className="mt-2 text-sm text-muted-foreground">{audit.report.summary}</p>
                    </section>

                    <section className="rounded-2xl border border-border bg-card p-6">
                        <h2 className="text-lg font-semibold">Score breakdown</h2>
                        <div className="mt-4 space-y-3">
                            {Object.entries(audit.report.breakdown).map(([key, value]) => (
                                <div key={key} className="flex items-center justify-between gap-4 text-sm">
                                    <span className="text-muted-foreground">{labels[key] || key}</span>
                                    <span className="font-semibold">{value} pts</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="rounded-2xl border border-border bg-card p-6">
                        <h2 className="text-lg font-semibold">Suggested next steps</h2>
                        <ul className="mt-4 space-y-3">
                            {audit.report.recommendations.map((recommendation) => (
                                <li key={recommendation} className="flex gap-3 text-sm text-muted-foreground">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                    {recommendation}
                                </li>
                            ))}
                        </ul>
                    </section>

                    <div className="text-center">
                        <Link href={route('business-audit.show')} className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                            <ArrowLeft className="h-4 w-4" />
                            Start another audit
                        </Link>
                    </div>
                </div>
            </main>
        </>
    );
}
