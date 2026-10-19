<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientAcquisitionSettings extends Model
{
    protected $fillable = [
        'user_id',
        'services',
        'budgets',
        'timelines',
        'scoring_weights',
        'qualified_score',
        'response_time_hours',
        'response_email',
        'whatsapp_url',
        'meeting_url',
        'analytics_funnel_id',
        'follow_up_templates',
        'high_priority_score',
        'medium_priority_score',
    ];

    protected function casts(): array
    {
        return [
            'services' => 'array',
            'budgets' => 'array',
            'timelines' => 'array',
            'scoring_weights' => 'array',
            'qualified_score' => 'integer',
            'response_time_hours' => 'integer',
            'analytics_funnel_id' => 'integer',
            'follow_up_templates' => 'array',
            'high_priority_score' => 'integer',
            'medium_priority_score' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function analyticsFunnel(): BelongsTo
    {
        return $this->belongsTo(Funnel::class, 'analytics_funnel_id');
    }

    /**
     * @return array<string, mixed>
     */
    public static function defaults(): array
    {
        return config('client-acquisition');
    }
}
