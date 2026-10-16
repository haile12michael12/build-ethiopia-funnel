export interface CopilotMetrics {
    date_from: string;
    date_to: string;
    views: number;
    unique_sessions: number;
    cta_clicks: number;
    form_starts: number;
    conversions: number;
    conversion_rate: number;
    cta_click_rate: number;
    form_completion_rate: number;
    daily: DailyMetric[];
    sample_size_sufficient: boolean;
    data_quality: 'good' | 'partial' | 'insufficient' | 'no_data' | 'inconsistent';
    data_warnings?: string[];
    form_steps?: FormStepMetric[];
    project_request_submissions?: number;
    project_requests_by_market?: ProjectRequestSegment[];
    project_requests_by_service?: ProjectRequestSegment[];
    traffic_sources?: BreakdownMetric[];
    devices?: BreakdownMetric[];
    control?: VariantMetrics;
    variants?: VariantMetrics[];
    experiment_comparisons?: ExperimentComparison[];
}

export interface ProjectRequestSegment {
    market?: 'ethiopia' | 'international';
    service?: string;
    submissions: number;
    qualified_submissions: number;
}

export interface FormStepMetric {
    form_id: string;
    step: number;
    sessions: number;
    next_step_sessions: number | null;
    drop_offs: number | null;
}

export interface BreakdownMetric {
    label: string;
    views: number;
    conversions: number;
    conversion_rate: number;
}

export interface ExperimentComparison {
    variant_id: number;
    variant_name: string;
    control_views: number;
    variant_views: number;
    control_conversion_rate: number;
    variant_conversion_rate: number;
    difference_percentage_points: number;
    sample_sufficient: boolean;
    winner_declared: false;
}

export interface DailyMetric {
    date: string;
    views: number;
    cta_clicks: number;
    conversions: number;
}

export interface VariantMetrics {
    id?: number;
    name?: string;
    weight?: number;
    views: number;
    conversions: number;
    conversion_rate: number;
    sample_sufficient?: boolean;
}

export type RecommendationCategory =
    | 'content_clarity'
    | 'cta_optimization'
    | 'form_friction'
    | 'trust_credibility'
    | 'conversion_tracking'
    | 'experiment_opportunities'
    | 'data_quality'
    | 'performance';

export interface Recommendation {
    id?: number;
    key: string;
    title: string;
    category: RecommendationCategory;
    recommendation_type?: string;
    evidence_type?: 'measured' | 'content_review';
    evidence: string;
    explanation: string;
    suggested_action: string;
    expected_outcome?: string;
    hypothesis?: string;
    priority: number;
    confidence: 'high' | 'medium' | 'low';
    confidence_score?: number;
    confidence_explanation?: string;
    effort: 'low' | 'medium' | 'high' | 'n/a';
    supporting_metrics?: Record<string, number | string | null>;
    status?: 'pending' | 'accepted' | 'dismissed';
    created_at?: string | null;
    accepted_at?: string | null;
    dismissed_at?: string | null;
}

export interface AiExplanation {
    key: string;
    explanation: string;
}

export interface AiCopySuggestion {
    key: string;
    type: string;
    original: string | null;
    suggestion: string;
    rationale: string;
}

export interface AiExperimentHypothesis {
    hypothesis: string;
    primary_metric: string;
    variant_description: string;
}

export interface AiAdvice {
    explanations: AiExplanation[];
    copy_suggestions: AiCopySuggestion[];
    experiment_hypotheses: AiExperimentHypothesis[];
    next_steps: string[];
}

export interface CopilotAudit {
    id: number;
    funnel_id: number;
    status: 'pending' | 'running' | 'completed' | 'failed';
    funnel_revision: number | null;
    date_from: string | null;
    date_to: string | null;
    metrics: CopilotMetrics | null;
    recommendations: Recommendation[] | null;
    ai_advice: AiAdvice | null;
    ai_provider: string | null;
    ai_model: string | null;
    ai_error: string | null;
    error_message: string | null;
    has_ai_advice: boolean;
    created_at: string | null;
    completed_at: string | null;
}

export interface AuditHistoryItem {
    id: number;
    status: 'pending' | 'running' | 'completed' | 'failed';
    date_from: string | null;
    date_to: string | null;
    metrics_summary: {
        views: number;
        conversions: number;
        conversion_rate: number;
    } | null;
    recommendation_count: number;
    has_ai_advice: boolean;
    created_at: string | null;
    completed_at: string | null;
}

export interface CopilotFunnel {
    id: number;
    name: string;
    slug: string;
    status: string;
    is_published: boolean;
    views: number;
    conversions: number;
    conversion_rate: number;
    revision: number | null;
    variants: CopilotVariant[];
}

export interface CopilotVariant {
    id: number;
    name: string;
    weight: number;
    is_active: boolean;
    views: number;
    conversions: number;
}

export interface CopilotPageProps {
    funnel: CopilotFunnel;
    latestAudit: CopilotAudit | null;
    auditHistory: AuditHistoryItem[];
    recommendationHistory: Recommendation[];
}
