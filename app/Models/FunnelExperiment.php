<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FunnelExperiment extends Model
{
    protected $fillable = [
        'funnel_id',
        'user_id',
        'name',
        'hypothesis',
        'target_step',
        'primary_metric',
        'guardrail_metrics',
        'allocations',
        'status',
        'starts_at',
        'ends_at',
        'ended_at',
        'activity_history',
    ];

    protected $casts = [
        'guardrail_metrics' => 'array',
        'allocations' => 'array',
        'activity_history' => 'array',
        'starts_at' => 'datetime',
        'ends_at' => 'datetime',
        'ended_at' => 'datetime',
    ];

    public function funnel(): BelongsTo
    {
        return $this->belongsTo(Funnel::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function events(): HasMany
    {
        return $this->hasMany(FunnelEvent::class, 'experiment_id');
    }

    public function isAcceptingTraffic(): bool
    {
        return $this->status === 'running'
            && ($this->starts_at === null || $this->starts_at->isPast())
            && ($this->ends_at === null || $this->ends_at->isFuture())
            && $this->ended_at === null;
    }

    public function assignedVariantIds(): array
    {
        return collect($this->allocations ?? [])
            ->pluck('variant_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    public function recordStatus(string $status, int $actorId): void
    {
        $history = $this->activity_history ?? [];
        $history[] = [
            'status' => $status,
            'actor_user_id' => $actorId,
            'at' => now()->toISOString(),
        ];
        $this->update([
            'status' => $status,
            'starts_at' => $status === 'running' ? ($this->starts_at ?? now()) : $this->starts_at,
            'ended_at' => in_array($status, ['paused', 'completed', 'cancelled'], true) ? now() : null,
            'activity_history' => $history,
        ]);
    }
}
