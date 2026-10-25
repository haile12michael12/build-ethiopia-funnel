<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SiteEvent extends Model
{
    public const EVENT_TYPES = [
        'concierge_opened',
        'concierge_language_selected',
        'concierge_question_answered',
        'audit_started',
        'audit_completed',
        'product_recommendation_clicked',
    ];

    protected $fillable = [
        'event_type',
        'session_hash',
        'path',
        'locale',
        'metadata',
        'occurred_at',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'occurred_at' => 'datetime',
        ];
    }
}
