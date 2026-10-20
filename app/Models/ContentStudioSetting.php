<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ContentStudioSetting extends Model
{
    protected $fillable = [
        'user_id',
        'brand_name',
        'brand_voice',
        'brand_guidelines',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
