<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeveloperAiRecommendation extends Model
{
    protected $fillable = [
        'contact_id',
        'user_id',
        'status',
        'context_snapshot',
        'recommendations',
        'error_message',
        'completed_at',
        'reviewed_at',
    ];

    protected function casts(): array
    {
        return [
            'context_snapshot' => 'array',
            'recommendations' => 'array',
            'completed_at' => 'datetime',
            'reviewed_at' => 'datetime',
        ];
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
