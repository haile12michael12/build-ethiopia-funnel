export interface ClientAcquisitionOption {
    key: string;
    label_en: string;
    label_am: string | null;
}

export interface ClientAcquisitionBudget extends ClientAcquisitionOption {
    currency: 'ETB' | 'USD';
    score: number;
}

export interface ClientAcquisitionTimeline extends ClientAcquisitionOption {
    score: number;
}

export interface ClientAcquisitionFollowUpTemplate {
    key: string;
    label_en: string;
    label_am: string | null;
    body_en: string;
    body_am: string | null;
    kind: 'transactional' | 'promotional';
}

export interface ClientAcquisitionSettings {
    services: ClientAcquisitionOption[];
    budgets: ClientAcquisitionBudget[];
    timelines: ClientAcquisitionTimeline[];
    scoring_weights: {
        service_fit: number;
        project_clarity: number;
        budget: number;
        timeline: number;
        scope_completeness: number;
        contact_completeness: number;
    };
    follow_up_templates: ClientAcquisitionFollowUpTemplate[];
    qualified_score: number;
    high_priority_score: number;
    medium_priority_score: number;
    response_time_hours: number | null;
    response_email: string | null;
    whatsapp_url: string | null;
    meeting_url: string | null;
    analytics_funnel_id: number | null;
}

export interface ClientAcquisitionProject {
    name: string;
    email: string;
    business_name?: string | null;
    market: 'ethiopia' | 'international';
    country: string;
    service_interests: string[];
    project_description: string;
    budget: string;
    timeline: string;
    website?: string | null;
    social_links?: string[];
    preferred_contact: 'email' | 'phone' | 'whatsapp';
    additional_requirements?: string | null;
    marketing_consent?: boolean;
    variant_id?: number | null;
}
