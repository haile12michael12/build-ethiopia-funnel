<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadScoringRule extends Model
{
    protected $fillable = [
        'user_id',
        'event',
        'field',
        'value',
        'points',
        'active',
    ];

    protected $casts = [
        'points' => 'integer',
        'active' => 'boolean',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
