export interface AuditOption {
    value: string;
    label: string;
}

export interface BusinessAuditOptions {
    website_statuses: AuditOption[];
    services: AuditOption[];
    budgets: AuditOption[];
    timelines: AuditOption[];
}

export interface BusinessAuditData {
    business_name: string;
    website: string | null;
    website_status: string;
    service_interests: string[];
    budget: string;
    timeline: string;
}

export interface BusinessAuditReport {
    score: number;
    label: string;
    summary: string;
    breakdown: Record<string, number>;
    recommendations: string[];
}
