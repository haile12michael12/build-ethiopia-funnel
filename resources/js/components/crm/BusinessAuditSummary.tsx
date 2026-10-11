import { LeadScoreBadge } from '@/components/crm/LeadScoreBadge';

interface BusinessAuditSummaryProps {
    audit: {
        business_name: string;
        website: string | null;
        website_status: string;
        service_interests: string[];
        budget: string;
        timeline: string;
    } | null;
    score: number;
}

const values: Record<string, string> = {
    live: 'Website is live',
    needs_improvement: 'Website needs improvement',
    no_website: 'No website',
    under_25000: 'Under ETB 25,000',
    '25000_100000': 'ETB 25,000–100,000',
    '100000_500000': 'ETB 100,000–500,000',
    over_500000: 'Over ETB 500,000',
    within_1_month: 'Within one month',
    '1_to_3_months': 'In 1–3 months',
    '3_to_6_months': 'In 3–6 months',
    researching: 'Researching',
};

export function BusinessAuditSummary({ audit, score }: BusinessAuditSummaryProps) {
    if (!audit) return null;

    return (
        <section className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="font-semibold text-foreground">Business growth audit</h2>
                <LeadScoreBadge score={score} />
            </div>
            <dl className="space-y-3 text-sm">
                <div>
                    <dt className="text-muted-foreground">Business</dt>
                    <dd className="font-medium text-foreground">{audit.business_name}</dd>
                </div>
                {audit.website && (
                    <div>
                        <dt className="text-muted-foreground">Website</dt>
                        <dd>
                            <a href={audit.website} target="_blank" rel="noreferrer" className="break-all text-primary hover:underline">
                                {audit.website}
                            </a>
                        </dd>
                    </div>
                )}
                <div>
                    <dt className="text-muted-foreground">Website status</dt>
                    <dd className="text-foreground">{values[audit.website_status] || audit.website_status}</dd>
                </div>
                <div>
                    <dt className="text-muted-foreground">Interested in</dt>
                    <dd className="text-foreground">{audit.service_interests.join(', ')}</dd>
                </div>
                <div>
                    <dt className="text-muted-foreground">Budget</dt>
                    <dd className="text-foreground">{values[audit.budget] || audit.budget}</dd>
                </div>
                <div>
                    <dt className="text-muted-foreground">Timeline</dt>
                    <dd className="text-foreground">{values[audit.timeline] || audit.timeline}</dd>
                </div>
            </dl>
        </section>
    );
}
