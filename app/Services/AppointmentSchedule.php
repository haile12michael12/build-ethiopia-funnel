<?php

namespace App\Services;

use App\Models\Appointment;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Carbon\CarbonPeriod;
use Illuminate\Support\Collection;

/**
 * Deterministic availability engine for the public B2B appointment scheduler.
 *
 * All calculations run in the business owner's configured appointment
 * timezone. Business hours, slot length, buffer and daily capacity come from
 * the owner's Client Acquisition settings, falling back to config defaults.
 */
class AppointmentSchedule
{
    /**
     * @param  array<string, mixed>  $settings  Merged client-acquisition settings.
     * @return array<string, mixed>
     */
    public function resolveSettings(array $settings): array
    {
        $defaults = config('appointments');

        $merged = array_replace([
            'appointment_enabled' => $defaults['enabled'],
            'appointment_timezone' => $defaults['timezone'],
            'appointment_slot_minutes' => $defaults['slot_minutes'],
            'appointment_buffer_minutes' => $defaults['buffer_minutes'],
            'appointment_advance_days' => $defaults['advance_days'],
            'appointment_max_per_day' => $defaults['max_per_day'],
            'appointment_business_hours' => $defaults['business_hours'],
            'appointment_meeting_types' => $defaults['meeting_types'],
        ], array_filter(
            $settings,
            fn (string $key): bool => str_starts_with($key, 'appointment_'),
            ARRAY_FILTER_USE_KEY,
        ));

        $merged['appointment_business_hours'] = is_array($merged['appointment_business_hours'] ?? null)
            ? $merged['appointment_business_hours']
            : ['start' => '09:00', 'end' => '17:00'];
        $merged['appointment_meeting_types'] = is_array($merged['appointment_meeting_types'] ?? null)
            ? $merged['appointment_meeting_types']
            : [];

        return $merged;
    }

    public function isEnabled(array $settings): bool
    {
        return (bool) ($settings['appointment_enabled'] ?? true) && (bool) config('appointments.enabled', true);
    }

    public function timezone(array $settings): string
    {
        return (string) ($settings['appointment_timezone'] ?? config('appointments.timezone')) ?: 'Africa/Addis_Ababa';
    }

    public function businessHours(array $settings): array
    {
        $hours = $settings['appointment_business_hours'] ?? config('appointments.business_hours');
        $start = (string) ($hours['start'] ?? '09:00');
        $end = (string) ($hours['end'] ?? '17:00');

        if ($start === $end) {
            $end = '23:59';
        }

        return ['start' => $start, 'end' => $end];
    }

    public function slotMinutes(array $settings): int
    {
        return max(15, min(240, (int) ($settings['appointment_slot_minutes'] ?? config('appointments.slot_minutes'))));
    }

    public function bufferMinutes(array $settings): int
    {
        return max(0, (int) ($settings['appointment_buffer_minutes'] ?? config('appointments.buffer_minutes')));
    }

    public function advanceDays(array $settings): int
    {
        return max(0, (int) ($settings['appointment_advance_days'] ?? config('appointments.advance_days')));
    }

    public function maxPerDay(array $settings): int
    {
        return max(1, (int) ($settings['appointment_max_per_day'] ?? config('appointments.max_per_day')));
    }

    /**
     * @return array<int, array{key: string, label_en: string, label_am: string|null}>
     */
    public function meetingTypes(array $settings): array
    {
        $types = $settings['appointment_meeting_types'] ?? config('appointments.meeting_types');

        return array_values(array_filter(array_map(
            fn (array $type): array => [
                'key' => (string) ($type['key'] ?? ''),
                'label_en' => (string) ($type['label_en'] ?? ''),
                'label_am' => $type['label_am'] ?? null,
            ],
            $types,
        ), fn (array $type): bool => $type['key'] !== '' && $type['label_en'] !== ''));
    }

    public function meetingTypeLabel(array $settings, string $key): string
    {
        $locale = app()->getLocale();
        foreach ($this->meetingTypes($settings) as $type) {
            if ($type['key'] === $key) {
                return $locale === 'am' ? ($type['label_am'] ?: $type['label_en']) : $type['label_en'];
            }
        }

        return $key;
    }

    public function isWithinBusinessHours(CarbonInterface $start, array $settings): bool
    {
        $timezone = $this->timezone($settings);
        $start = Carbon::instance($start)->setTimezone($timezone);
        $hours = $this->businessHours($settings);
        $minutes = $this->slotMinutes($settings);

        $windowStart = $start->copy()->setTimeByString($hours['start']);
        $windowEnd = $start->copy()->setTimeByString($hours['end']);
        $end = $start->copy()->addMinutes($minutes);

        return $start >= $windowStart && $end <= $windowEnd;
    }

    /**
     * Build the list of selectable "HH:MM" slots for a date.
     *
     * @return array<int, string>
     */
    public function availableSlots(CarbonInterface $date, int $userId, array $settings, ?int $excludeId = null): array
    {
        $timezone = $this->timezone($settings);
        $date = Carbon::instance($date)->setTimezone($timezone)->startOfDay();

        if ($date->lessThan(now()->setTimezone($timezone)->startOfDay())) {
            return [];
        }

        $hours = $this->businessHours($settings);
        $minutes = $this->slotMinutes($settings);
        $buffer = $this->bufferMinutes($settings);

        $windowStart = $date->copy()->setTimeByString($hours['start']);
        $windowEnd = $date->copy()->setTimeByString($hours['end']);

        $booked = $this->bookedAppointments($date, $userId, $settings, $excludeId);
        if ($booked->count() >= $this->maxPerDay($settings)) {
            return [];
        }

        $slots = [];
        foreach (CarbonPeriod::create($windowStart, $minutes, $windowEnd) as $slot) {
            $candidate = Carbon::instance($slot);
            if ($candidate->addMinutes($minutes) > $windowEnd) {
                continue;
            }
            if (! $this->overlapsAny($candidate, $minutes, $buffer, $booked)) {
                $slots[] = $candidate->format('H:i');
            }
        }

        return $slots;
    }

    public function canBook(CarbonInterface $start, int $userId, array $settings, ?int $excludeId = null): bool
    {
        $timezone = $this->timezone($settings);
        $start = Carbon::instance($start)->setTimezone($timezone);

        if ($start->lessThan(now()->setTimezone($timezone))) {
            return false;
        }

        if (! $this->isWithinBusinessHours($start, $settings)) {
            return false;
        }

        $booked = $this->bookedAppointments($start->copy()->startOfDay(), $userId, $settings, $excludeId);

        return ! $this->overlapsAny($start, $this->slotMinutes($settings), $this->bufferMinutes($settings), $booked);
    }

    public function resolveStart(string $date, string $time, array $settings): Carbon
    {
        return Carbon::parse(sprintf('%s %s', $date, $time), $this->timezone($settings));
    }

    /**
     * @return Collection<int, Appointment>
     */
    private function bookedAppointments(CarbonInterface $date, int $userId, array $settings, ?int $excludeId): Collection
    {
        // start_at is persisted in the application timezone; convert the local
        // day boundaries into that timezone before comparing.
        $localDay = Carbon::instance($date)->setTimezone($this->timezone($settings))->startOfDay();
        $from = $localDay->copy()->setTimezone(config('app.timezone', 'UTC'));
        $to = $localDay->copy()->addDay()->endOfDay()->setTimezone(config('app.timezone', 'UTC'));

        return Appointment::query()
            ->forUser($userId)
            ->active()
            ->whereBetween('start_at', [$from, $to])
            ->when($excludeId, fn ($query, $id) => $query->whereKeyNot($id))
            ->get();
    }

    /**
     * @param  Collection<int, Appointment>  $booked
     */
    private function overlapsAny(CarbonInterface $start, int $duration, int $buffer, Collection $booked): bool
    {
        $startUtc = $start->copy()->setTimezone('UTC');
        $endUtc = $startUtc->copy()->addMinutes($duration + $buffer);

        foreach ($booked as $appointment) {
            $bookedStart = $appointment->start_at->copy()->setTimezone('UTC');
            $bookedEnd = $appointment->endTime()->setTimezone('UTC')->addMinutes($buffer);

            if ($startUtc < $bookedEnd && $bookedStart < $endUtc) {
                return true;
            }
        }

        return false;
    }
}
