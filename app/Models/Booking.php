<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Booking extends Model
{
    public const STATUSES = [
        'confirmed',
        'cancelled',
        'completed',
        'no_show',
    ];

    protected $fillable = [
        'uuid',
        'manage_token',
        'booking_page_id',
        'contact_id',
        'invitee_name',
        'invitee_email',
        'invitee_phone',
        'invitee_notes',
        'invitee_timezone',
        'starts_at',
        'ends_at',
        'status',
        'cancelled_at',
        'cancellation_reason',
        'completed_at',
        'reminder_sent_at',
    ];

    protected $casts = [
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'cancelled_at' => 'datetime',
        'completed_at' => 'datetime',
        'reminder_sent_at' => 'datetime',
    ];

    public function page(): BelongsTo
    {
        return $this->belongsTo(BookingPage::class, 'booking_page_id');
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function followUpTasks(): HasMany
    {
        return $this->hasMany(FollowUpTask::class);
    }

    public function isChangeable(): bool
    {
        return $this->status === 'confirmed' && $this->starts_at->isFuture();
    }

    public function manageUrl(): string
    {
        return route('booking.manage', ['booking' => $this->uuid, 'token' => $this->manage_token]);
    }
}
