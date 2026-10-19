export type FunnelEventType =
    | 'view'
    | 'cta_click'
    | 'form_start'
    | 'form_step'
    | 'form_validation_error'
    | 'page_viewed'
    | 'form_started'
    | 'form_submitted'
    | 'quiz_completed'
    | 'lead_created'
    | 'email_sent'
    | 'email_opened'
    | 'email_clicked'
    | 'offer_viewed'
    | 'checkout_started'
    | 'purchase_completed'
    | 'branch_evaluated';

export function funnelSessionId(): string {
    const key = 'openfunnels:analytics-session';
    const existing = window.sessionStorage.getItem(key);
    if (existing) return existing;
    const sessionId = crypto.randomUUID();
    window.sessionStorage.setItem(key, sessionId);
    return sessionId;
}

export function currentAttribution(): Record<string, string> {
    const search = new URLSearchParams(window.location.search);
    const attribution: Record<string, string> = {};
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']) {
        const value = search.get(key);
        if (value) attribution[key] = value;
    }
    attribution.landing_page = window.location.pathname;
    if (document.referrer) {
        try {
            const referrer = new URL(document.referrer);
            attribution.referrer = `${referrer.origin}${referrer.pathname}`;
        } catch {
            // Ignore malformed referrers rather than sending arbitrary browser text.
        }
    }
    attribution.device = window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop';
    return attribution;
}

export function trackFunnelEvent(
    funnelId: number,
    eventType: FunnelEventType,
    options: { formId?: string; metadata?: Record<string, string> } = {},
    variantId?: number | null,
): void {
    const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
    const metadata: Record<string, string> = {};
    for (const key of ['page', 'device', 'step', 'cta', 'block_id'] as const) {
        const value = options.metadata?.[key];
        if (value !== undefined) metadata[key] = value;
    }
    metadata.page = window.location.pathname;
    metadata.device = window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop';

    void fetch(`/funnels/${funnelId}/events`, {
        method: 'POST',
        credentials: 'same-origin',
        keepalive: true,
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token ?? '' },
        body: JSON.stringify({
            event_type: eventType,
            event_id: crypto.randomUUID(),
            session_id: funnelSessionId(),
            form_id: options.formId,
            variant_id: variantId,
            attribution: currentAttribution(),
            metadata,
        }),
    }).catch(() => undefined);
}
