const FALLBACK_ZONES = [
    'Africa/Addis_Ababa',
    'Africa/Nairobi',
    'Africa/Cairo',
    'Africa/Lagos',
    'Asia/Dubai',
    'Europe/London',
    'Europe/Berlin',
    'America/New_York',
    'America/Chicago',
    'America/Los_Angeles',
    'UTC',
];

/** Visitor's IANA timezone, falling back to the booking page's timezone. */
export function detectTimeZone(fallback: string): string {
    try {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        return typeof tz === 'string' && tz !== '' ? tz : fallback;
    } catch {
        return fallback;
    }
}

/**
 * Selectable timezone list: the visitor's detected zone first, then the page
 * timezone, then the full IANA list when the browser supports it.
 */
export function timeZoneOptions(preferred: string[]): string[] {
    let all: string[] = FALLBACK_ZONES;
    try {
        const intl = Intl as unknown as { supportedValuesOf?: (key: string) => string[] };
        if (typeof intl.supportedValuesOf === 'function') {
            all = intl.supportedValuesOf('timeZone');
        }
    } catch {
        all = FALLBACK_ZONES;
    }

    const merged = [...preferred.filter(Boolean), ...all];
    return Array.from(new Set(merged));
}

/** Short timezone abbreviation for a zone at a given instant, e.g. "EAT". */
export function timeZoneAbbreviation(tz: string, at?: Date): string {
    try {
        const parts = new Intl.DateTimeFormat('en', { timeZone: tz, timeZoneName: 'short' }).formatToParts(at ?? new Date());
        return parts.find((part) => part.type === 'timeZoneName')?.value ?? tz;
    } catch {
        return tz;
    }
}

/** Human label for a Y-m-d date string without timezone drift. */
export function formatDateLabel(date: string, options: Intl.DateTimeFormatOptions): string {
    const [year, month, day] = date.split('-').map(Number);
    if (!year || !month || !day) return date;
    return new Intl.DateTimeFormat('en', { ...options, timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day)));
}
