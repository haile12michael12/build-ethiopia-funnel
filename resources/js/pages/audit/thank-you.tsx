import { siteSessionId } from '@/lib/site-session';
import { type BusinessAuditReport } from '@/types/business-audit';
import { Head, Link } from '@inertiajs/react';
import { ArrowLeft, CheckCircle2, ShoppingBag } from 'lucide-react';

interface ThankYouProps {
    audit: {
        business_name: string;
        market: string;
        budget_currency: string;
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
    const products = audit.report.products ?? [];

    const recordRecommendationClick = (templateId: number) => {
        const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
        fetch('/site-events', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf },
            body: JSON.stringify({ event: 'product_recommendation_clicked', session_id: siteSessionId(), template_id: String(templateId), topic: 'products' }),
        }).catch(() => {
            // Analytics are best-effort.
        });
    };

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
                        <p className="mt-4 text-xs text-muted-foreground">
                            These suggestions are generated automatically from your answers. Verified facts from your submission are shown above; a
                            human review follows every audit{audit.market === 'international' ? ' (budgets in USD)' : ''}.
                        </p>
                    </section>

                    {products.length > 0 && (
                        <section className="rounded-2xl border border-border bg-card p-6">
                            <h2 className="flex items-center gap-2 text-lg font-semibold">
                                <ShoppingBag className="h-5 w-5 text-primary" />
                                Digital products that may help
                            </h2>
                            <p className="mt-1 text-xs text-muted-foreground">Prices and availability come directly from our published catalog.</p>
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                {products.map((product) => (
                                    <a
                                        key={product.template_id}
                                        href={product.url}
                                        onClick={() => recordRecommendationClick(product.template_id)}
                                        className="rounded-xl border border-border p-4 transition-colors hover:border-primary/50 hover:bg-primary/5"
                                    >
                                        <h3 className="text-sm font-semibold">{product.name}</h3>
                                        <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{product.description}</p>
                                        <p className="mt-2 text-sm font-bold text-primary">{product.price_display}</p>
                                    </a>
                                ))}
                            </div>
                        </section>
                    )}

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
