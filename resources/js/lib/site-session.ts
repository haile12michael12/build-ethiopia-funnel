const STORAGE_KEY = 'site-session-id';

/**
 * Returns a random per-tab identifier used for privacy-safe analytics
 * deduplication. It never contains personal data.
 */
export function siteSessionId(): string {
    const existing = window.sessionStorage.getItem(STORAGE_KEY);
    if (existing) return existing;

    const created =
        globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    window.sessionStorage.setItem(STORAGE_KEY, created);

    return created;
}
