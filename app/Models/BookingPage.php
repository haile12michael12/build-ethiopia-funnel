<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BookingPage extends Model
{
    protected $fillable = [
        'user_id',
        'title',
        'slug',
        'description',
        'location',
        'duration_minutes',
        'buffer_minutes',
        'min_notice_minutes',
        'advance_days',
        'timezone',
        'availability',
        'is_active',
    ];

    protected $casts = [
        'availability' => 'array',
        'is_active' => 'boolean',
        'duration_minutes' => 'integer',
        'buffer_minutes' => 'integer',
        'min_notice_minutes' => 'integer',
        'advance_days' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    /**
     * Weekly availability keyed by ISO weekday ('1' = Monday … '7' = Sunday),
     * every window normalized to ['start' => 'HH:MM', 'end' => 'HH:MM'].
     *
     * @return array<string, array<int, array{start: string, end: string}>>
     */
    public function normalizedAvailability(): array
    {
        $raw = is_array($this->availability) ? $this->availability : [];

        $normalized = [];
        foreach (range(1, 7) as $day) {
            $windows = $raw[(string) $day] ?? $raw[$day] ?? [];
            if (! is_array($windows)) {
                $windows = [];
            }

            $normalized[(string) $day] = collect($windows)
                ->filter(fn ($window): bool => is_array($window)
                    && is_string($window['start'] ?? null)
                    && is_string($window['end'] ?? null)
                    && preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $window['start']) === 1
                    && preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $window['end']) === 1
                    && strcmp($window['end'], $window['start']) > 0)
                ->map(fn (array $window): array => ['start' => $window['start'], 'end' => $window['end']])
                ->values()
                ->all();
        }

        return $normalized;
    }

    public function publicUrl(): string
    {
        return route('booking.show', ['page' => $this->slug]);
    }
}
