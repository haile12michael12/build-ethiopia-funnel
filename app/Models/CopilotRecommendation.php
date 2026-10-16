<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CopilotRecommendation extends Model
{
    protected $fillable = [
        'user_id',
        'funnel_id',
        'audit_id',
        'key',
        'title',
        'category',
        'evidence_type',
        'evidence',
        'explanation',
        'suggested_action',
        'expected_outcome',
        'hypothesis',
        'priority',
        'confidence_score',
        'confidence_explanation',
        'confidence',
        'effort',
        'supporting_metrics',
        'status',
        'pending_fingerprint',
        'accepted_at',
        'dismissed_at',
    ];

    protected $casts = [
        'supporting_metrics' => 'array',
        'priority' => 'integer',
        'confidence_score' => 'integer',
        'accepted_at' => 'datetime',
        'dismissed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function funnel(): BelongsTo
    {
        return $this->belongsTo(Funnel::class);
    }

    public function audit(): BelongsTo
    {
        return $this->belongsTo(CopilotAudit::class, 'audit_id');
    }

    /**
     * @return array<string, mixed>
     */
    public function toCopilotArray(): array
    {
        return [
            'id' => $this->id,
            'key' => $this->key,
            'title' => $this->title,
            'category' => $this->category,
            'recommendation_type' => $this->category,
            'evidence_type' => $this->evidence_type,
            'evidence' => $this->evidence,
            'explanation' => $this->explanation,
            'suggested_action' => $this->suggested_action,
            'expected_outcome' => $this->expected_outcome,
            'hypothesis' => $this->hypothesis,
            'priority' => $this->priority,
            'confidence' => $this->confidence,
            'confidence_score' => $this->confidence_score,
            'confidence_explanation' => $this->confidence_explanation,
            'effort' => $this->effort,
            'supporting_metrics' => $this->supporting_metrics,
            'status' => $this->status,
            'created_at' => $this->created_at?->toISOString(),
            'accepted_at' => $this->accepted_at?->toISOString(),
            'dismissed_at' => $this->dismissed_at?->toISOString(),
        ];
    }
}
