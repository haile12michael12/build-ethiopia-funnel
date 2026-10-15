<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CopilotAudit extends Model
{
    protected $fillable = [
        'user_id',
        'funnel_id',
        'status',
        'funnel_revision',
        'content_snapshot',
        'date_from',
        'date_to',
        'metrics',
        'recommendations',
        'ai_advice',
        'ai_provider',
        'ai_model',
        'error_message',
        'completed_at',
    ];

    protected $casts = [
        'content_snapshot' => 'array',
        'metrics' => 'array',
        'recommendations' => 'array',
        'ai_advice' => 'array',
        'funnel_revision' => 'integer',
        'completed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function funnel(): BelongsTo
    {
        return $this->belongsTo(Funnel::class);
    }

    public function markCompleted(array $metrics, array $recommendations, ?array $aiAdvice = null): void
    {
        $this->update([
            'status' => 'completed',
            'metrics' => $metrics,
            'recommendations' => $recommendations,
            'ai_advice' => $aiAdvice,
            'completed_at' => now(),
        ]);
    }

    public function markFailed(string $errorMessage): void
    {
        $this->update([
            'status' => 'failed',
            'error_message' => $errorMessage,
            'completed_at' => now(),
        ]);
    }
}

