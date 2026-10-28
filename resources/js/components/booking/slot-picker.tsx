import { formatDateLabel } from '@/lib/timezones';
import { CalendarX2, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface SlotSelection {
    date: string;
    /** Page-timezone start "HH:MM" — this is what the server validates. */
    time: string;
    /** Human label in the visitor's display timezone. */
    label: string;
}

interface Slot {
    value: string;
    label: string;
    starts_at: string;
}

interface SlotPickerProps {
    /** Booking page slug used to build the slots endpoint URL. */
    slug: string;
    availableDates: string[];
    /** Timezone the slot labels are rendered in. */
    displayTz: string;
    selected: SlotSelection | null;
    onSelect: (slot: SlotSelection | null) => void;
    /** Extra query params (e.g. booking uuid + token when rescheduling). */
    query?: Record<string, string>;
}

export default function SlotPicker({ slug, availableDates, displayTz, selected, onSelect, query }: SlotPickerProps) {
    const [date, setDate] = useState<string | null>(availableDates[0] ?? null);
    const [slots, setSlots] = useState<Slot[] | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!date) return;
        let cancelled = false;
        setFailed(false);
        setSlots(null);

        const params = new URLSearchParams({ date, tz: displayTz, ...(query ?? {}) });
        fetch(`${route('booking.slots', { page: slug })}?${params.toString()}`, {
            headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        })
            .then((response) => {
                if (!response.ok) throw new Error('slots failed');
                return response.json();
            })
            .then((data: { slots?: Slot[] }) => {
                if (!cancelled) setSlots(Array.isArray(data.slots) ? data.slots : []);
            })
            .catch(() => {
                if (!cancelled) {
                    setFailed(true);
                    setSlots([]);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [date, displayTz, slug, query]);

    if (availableDates.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
                <CalendarX2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="font-medium text-foreground">No open slots right now</p>
                <p className="mt-1 text-sm text-muted-foreground">All upcoming times are booked. Please check back soon.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-5">
            <div>
                <p className="mb-2 text-sm font-medium text-foreground">Pick a day</p>
                <div className="flex flex-wrap gap-2">
                    {availableDates.map((available) => {
                        const isActive = available === date;
                        return (
                            <button
                                key={available}
                                type="button"
                                onClick={() => {
                                    setDate(available);
                                    onSelect(null);
                                }}
                                className={`rounded-lg border px-3 py-2 text-center text-sm transition-colors ${
                                    isActive
                                        ? 'border-primary bg-primary text-primary-foreground'
                                        : 'border-border bg-card text-foreground hover:border-primary/50'
                                }`}
                            >
                                <span className="block text-xs uppercase opacity-80">{formatDateLabel(available, { weekday: 'short' })}</span>
                                <span className="block font-semibold tabular-nums">
                                    {formatDateLabel(available, { month: 'short', day: 'numeric' })}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div aria-live="polite">
                <p className="mb-2 text-sm font-medium text-foreground">Pick a time</p>
                {slots === null && !failed && (
                    <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading times…
                    </div>
                )}
                {failed && <p className="py-4 text-sm text-destructive">Could not load times. Please try again.</p>}
                {slots !== null && !failed && slots.length === 0 && (
                    <p className="py-4 text-sm text-muted-foreground">No times left on this day — pick another date.</p>
                )}
                {slots !== null && !failed && slots.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {slots.map((slot) => {
                            const isSelected = selected?.date === date && selected?.time === slot.value;
                            return (
                                <button
                                    key={slot.value}
                                    type="button"
                                    onClick={() => onSelect({ date: date as string, time: slot.value, label: slot.label })}
                                    className={`rounded-md border px-2 py-2 text-sm font-medium tabular-nums transition-colors ${
                                        isSelected
                                            ? 'border-primary bg-primary text-primary-foreground'
                                            : 'border-border bg-card text-foreground hover:border-primary/50'
                                    }`}
                                >
                                    {slot.label}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
