<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeveloperAuditReport extends Model
{
    protected $fillable = [
        'public_id',
        'user_id',
        'contact_id',
        'email',
        'token_hash',
        'score',
        'report',
        'unlocked_at',
        'expires_at',
    ];

    protected function casts(): array
    {
        return [
            'score' => 'integer',
            'report' => 'array',
            'unlocked_at' => 'datetime',
            'expires_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }
}
