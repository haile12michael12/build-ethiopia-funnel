<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ContentDraft extends Model
{
    public const STATUSES = [
        'idea',
        'draft',
        'in_review',
        'approved',
        'scheduled',
        'published',
        'failed',
        'archived',
    ];

    protected $fillable = [
        'user_id',
        'portfolio_project_id',
        'content_type',
        'platform',
        'format',
        'title',
        'body',
        'audience',
        'market',
        'service',
        'objective',
        'tone',
        'language',
        'call_to_action',
        'status',
        'scheduled_at',
        'approved_at',
        'published_at',
        'published_url',
        'failure_details',
        'is_generated',
        'prompt_template_key',
        'provider',
        'provider_model',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'approved_at' => 'datetime',
        'published_at' => 'datetime',
        'is_generated' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function portfolioProject(): BelongsTo
    {
        return $this->belongsTo(Project::class, 'portfolio_project_id');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(ContentDraftVersion::class)->latest();
    }
}
