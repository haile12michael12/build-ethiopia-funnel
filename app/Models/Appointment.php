<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class Appointment extends Model
{
    public const STATUSES = [
        'pending',
        'confirmed',
        'cancelled',
        'completed',
        'no_show',
    ];

    public const MEETING_TYPES = [
        'demo',
        'consultation',
        'call',
    ];

    public const ACTIVE_STATUSES = [
        'pending',
        'confirmed',
    ];

    protected $fillable = [
        'user_id',
        'contact_id',
        'company_name',
        'contact_name',
        'email',
        'phone',
        'service_key',
        'service_label',
        'meeting_type',
        'start_at',
        'timezone',
        'duration_minutes',
        'status',
        'notes',
        'rescheduled_from_id',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'start_at' => 'datetime',
            'duration_minutes' => 'integer',
            'metadata' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function rescheduledFrom(): BelongsTo
    {
        return $this->belongsTo(Appointment::class, 'rescheduled_from_id');
    }

    public function reschedules(): HasMany
    {
        return $this->hasMany(Appointment::class, 'rescheduled_from_id');
    }

    public function scopeUpcoming(Builder $query): Builder
    {
        return $query->where('start_at', '>=', now());
    }

    public function scopePast(Builder $query): Builder
    {
        return $query->where('start_at', '<', now());
    }

    public function scopeForUser(Builder $query, int $userId): Builder
    {
        return $query->where('user_id', $userId);
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->whereIn('status', ['pending', 'confirmed']);
    }

    public function isPast(): bool
    {
        return $this->start_at->isPast();
    }

    /**
     * Whether this appointment overlaps another active appointment for the owner.
     */
    public function overlaps(Appointment $other): bool
    {
        if ($this->user_id !== $other->user_id) {
            return false;
        }

        if (! in_array($other->status, self::ACTIVE_STATUSES, true)) {
            return false;
        }

        return $this->start_at < $other->start_at->copy()->addMinutes($other->duration_minutes)
            && $other->start_at < $this->start_at->copy()->addMinutes($this->duration_minutes);
    }

    public function endTime(): Carbon
    {
        return $this->start_at->copy()->addMinutes($this->duration_minutes);
    }
}
