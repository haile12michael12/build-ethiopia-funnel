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

export interface ClientAcquisitionSettings {
    services: ClientAcquisitionOption[];
    budgets: ClientAcquisitionBudget[];
    timelines: ClientAcquisitionTimeline[];
    scoring_weights: {
        service_fit: number;
        project_clarity: number;
        budget: number;
        timeline: number;
        consultation: number;
    };
    qualified_score: number;
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
}
