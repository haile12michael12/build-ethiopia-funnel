<?php

namespace App\Services\Bookings;

use App\Models\Booking;
use App\Models\BookingPage;
use Carbon\CarbonImmutable;
use DateTimeZone;
use Illuminate\Support\Collection;
use Throwable;

/**
 * Computes bookable time slots from a booking page's weekly availability,
 * minimum notice, advance window, buffer times, and existing bookings.
 */
class BookingAvailability
{
    /**
     * Available slots for one calendar date in the page timezone.
     *
     * @return array<int, array{value: string, label: string, starts_at: string}>
     *               value: page-timezone start time "HH:MM" (submitted back on booking),
     *               label: human-readable start time in the display timezone,
     *               starts_at: UTC ISO-8601 instant.
     */
    public function slotsForDate(
        BookingPage $page,
        string $date,
        ?string $displayTimezone = null,
        ?int $excludeBookingId = null,
        ?Collection $existing = null,
    ): array {
        $pageTz = $this->timezone($page->timezone);
        $displayTz = $this->timezone($displayTimezone ?: $page->timezone);

        $day = CarbonImmutable::createFromFormat('!Y-m-d', $date, $pageTz);
        if (! $day instanceof CarbonImmutable || $day->format('Y-m-d') !== $date) {
            return [];
        }

        $advanceDays = max(1, (int) $page->advance_days);
        $today = CarbonImmutable::now($pageTz)->startOfDay();
        if ($day->lt($today) || $day->gt($today->addDays($advanceDays - 1))) {
            return [];
        }

        $windows = $page->normalizedAvailability()[(string) $day->isoWeekday()] ?? [];
        if ($windows === []) {
            return [];
        }

        $duration = max(5, (int) $page->duration_minutes);
        $buffer = max(0, (int) $page->buffer_minutes);
        $earliestStart = CarbonImmutable::now('UTC')->addMinutes(max(0, (int) $page->min_notice_minutes));

        $existing ??= $this->bookingsForDate($page, $day, $excludeBookingId);

        $slots = [];
        foreach ($windows as $window) {
            $windowStart = $day->setTimeFromTimeString($window['start']);
            $windowEnd = $day->setTimeFromTimeString($window['end']);

            for ($cursor = $windowStart; $cursor->addMinutes($duration)->lte($windowEnd); $cursor = $cursor->addMinutes($duration)) {
                $startsAtUtc = $cursor->setTimezone('UTC');
                if ($startsAtUtc->lt($earliestStart)) {
                    continue;
                }
                $endsAtUtc = $startsAtUtc->addMinutes($duration);
                if ($this->conflicts($existing, $startsAtUtc, $endsAtUtc, $buffer)) {
                    continue;
                }

                $slots[] = [
                    'value' => $cursor->format('H:i'),
                    'label' => $cursor->setTimezone($displayTz)->format('g:i A'),
                    'starts_at' => $startsAtUtc->toIso8601String(),
                ];
            }
        }

        usort($slots, fn (array $a, array $b): int => strcmp($a['starts_at'], $b['starts_at']));

        return $slots;
    }

    /**
     * Verify that an exact UTC instant is a currently bookable slot.
     */
    public function isSlotAvailable(BookingPage $page, CarbonImmutable $startsAtUtc, ?int $excludeBookingId = null): bool
    {
        if (! $page->is_active) {
            return false;
        }

        $pageTz = $this->timezone($page->timezone);
        $date = $startsAtUtc->setTimezone($pageTz)->toDateString();
        $value = $startsAtUtc->setTimezone($pageTz)->format('H:i');

        return collect($this->slotsForDate($page, $date, null, $excludeBookingId))
            ->contains(fn (array $slot): bool => $slot['value'] === $value);
    }

    /**
     * Dates within the advance window that still have at least one open slot.
     *
     * @return array<int, string> list of Y-m-d dates in the page timezone
     */
    public function availableDates(BookingPage $page): array
    {
        $pageTz = $this->timezone($page->timezone);
        $advanceDays = max(1, (int) $page->advance_days);
        $today = CarbonImmutable::now($pageTz)->startOfDay();

        // Preload bookings once, grouped by every page-tz date they overlap,
        // so generating the window does not query per date.
        /** @var array<string, Collection<int, Booking>> $existing */
        $existing = [];
        $page->bookings()
            ->where('status', 'confirmed')
            ->where('starts_at', '<', $today->addDays($advanceDays)->setTimezone('UTC'))
            ->where('ends_at', '>', CarbonImmutable::now('UTC'))
            ->get(['id', 'starts_at', 'ends_at'])
            ->each(function (Booking $booking) use (&$existing, $pageTz): void {
                $cursor = CarbonImmutable::instance($booking->starts_at)->setTimezone($pageTz)->startOfDay();
                $last = CarbonImmutable::instance($booking->ends_at)->setTimezone($pageTz)->startOfDay();
                while ($cursor->lte($last)) {
                    $key = $cursor->toDateString();
                    $existing[$key] ??= collect();
                    $existing[$key]->push($booking);
                    $cursor = $cursor->addDay();
                }
            });
        $existing = collect($existing);

        $dates = [];
        for ($i = 0; $i < $advanceDays; $i++) {
            $date = $today->addDays($i);
            $ymd = $date->toDateString();
            if ($this->slotsForDate($page, $ymd, null, null, $existing->get($ymd, collect())) !== []) {
                $dates[] = $ymd;
            }
        }

        return $dates;
    }

    /**
     * Confirmed bookings overlapping the given page-tz day.
     *
     * @return Collection<int, Booking>
     */
    private function bookingsForDate(BookingPage $page, CarbonImmutable $day, ?int $excludeBookingId): Collection
    {
        return $page->bookings()
            ->where('status', 'confirmed')
            ->where('starts_at', '<', $day->addDay()->setTimezone('UTC'))
            ->where('ends_at', '>', $day->setTimezone('UTC'))
            ->when($excludeBookingId, fn ($query) => $query->whereKeyNot($excludeBookingId))
            ->get(['id', 'starts_at', 'ends_at']);
    }

    /**
     * A slot conflicts when it intersects an existing booking widened by the
     * page buffer on both sides.
     *
     * @param  Collection<int, Booking>  $existing
     */
    private function conflicts(Collection $existing, CarbonImmutable $startsAt, CarbonImmutable $endsAt, int $buffer): bool
    {
        return $existing->contains(function (Booking $booking) use ($startsAt, $endsAt, $buffer): bool {
            $bookedStart = CarbonImmutable::instance($booking->starts_at)->subMinutes($buffer);
            $bookedEnd = CarbonImmutable::instance($booking->ends_at)->addMinutes($buffer);

            return $startsAt->lt($bookedEnd) && $endsAt->gt($bookedStart);
        });
    }

    private function timezone(?string $name): DateTimeZone
    {
        if (is_string($name) && $name !== '') {
            try {
                return new DateTimeZone($name);
            } catch (Throwable) {
                // fall through to the configured default
            }
        }

        try {
            return new DateTimeZone((string) config('booking.default_timezone', 'Africa/Addis_Ababa'));
        } catch (Throwable) {
            return new DateTimeZone('UTC');
        }
    }
}
