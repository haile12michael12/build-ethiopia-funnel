import { type BusinessAuditReport } from '@/types/business-audit';

interface LeadScoreBreakdownProps {
    breakdown: BusinessAuditReport['breakdown'];
}

const labels: Record<string, string> = {
    business_profile: 'Business profile',
    website_readiness: 'Website readiness',
    service_interest: 'Service focus',
    budget: 'Investment range',
    timeline: 'Project timeline',
};

export function LeadScoreBreakdown({ breakdown }: LeadScoreBreakdownProps) {
    return (
        <div className="space-y-2">
            {Object.entries(breakdown).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{labels[key] || key}</span>
                    <span className="font-medium text-foreground">{value} pts</span>
                </div>
            ))}
        </div>
    );
}
