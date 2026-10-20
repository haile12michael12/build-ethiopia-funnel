<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientProjectMilestone extends Model
{
    public const STATUSES = [
        'pending',
        'in_progress',
        'completed',
    ];

    protected $fillable = [
        'client_project_id',
        'title',
        'description',
        'status',
        'due_date',
        'completed_at',
    ];

    protected $casts = [
        'due_date' => 'date',
        'completed_at' => 'datetime',
    ];

    public function project(): BelongsTo
    {
        return $this->belongsTo(ClientProject::class, 'client_project_id');
    }
}

