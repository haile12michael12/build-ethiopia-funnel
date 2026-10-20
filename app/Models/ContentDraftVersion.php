<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContentDraftVersion extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'content_draft_id',
        'user_id',
        'title',
        'body',
        'reason',
        'created_at',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function contentDraft(): BelongsTo
    {
        return $this->belongsTo(ContentDraft::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
