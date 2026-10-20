<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClientProject extends Model
{
    public const STATUSES = [
        'planning',
        'in_progress',
        'review',
        'completed',
        'on_hold',
    ];

    public const CURRENCIES = [
        'ETB',
        'USD',
    ];

    protected $fillable = [
        'user_id',
        'contact_id',
        'title',
        'status',
        'currency',
        'budget_amount',
        'scope_summary',
        'agreed_deliverables',
        'start_date',
        'target_completion_date',
        'completed_at',
    ];

    protected $casts = [
        'budget_amount' => 'integer',
        'agreed_deliverables' => 'array',
        'start_date' => 'date',
        'target_completion_date' => 'date',
        'completed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function milestones(): HasMany
    {
        return $this->hasMany(ClientProjectMilestone::class)->orderBy('due_date');
    }
}

