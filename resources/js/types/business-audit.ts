export interface AuditOption {
    value: string;
    label: string;
    currency?: string;
}

export interface BusinessAuditOptions {
    markets: AuditOption[];
    website_statuses: AuditOption[];
    services: AuditOption[];
    budgets: AuditOption[];
    international_budgets: AuditOption[];
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

export interface RecommendedProduct {
    name: string;
    description: string;
    price_display: string;
    amount_minor: number;
    currency: string;
    url: string;
    template_id: number;
}

export interface BusinessAuditReport {
    score: number;
    label: string;
    summary: string;
    breakdown: Record<string, number>;
    recommendations: string[];
    products: RecommendedProduct[];
}
