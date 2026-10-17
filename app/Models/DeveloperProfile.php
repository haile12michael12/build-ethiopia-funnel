<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeveloperProfile extends Model
{
    protected $fillable = [
        'contact_id',
        'github_username',
        'github_profile_url',
        'github_connected_at',
        'primary_language',
        'detected_stack',
        'public_repo_count',
        'has_saas_repo',
        'preferred_stack',
        'experience_level',
    ];

    protected function casts(): array
    {
        return [
            'github_connected_at' => 'datetime',
            'detected_stack' => 'array',
            'public_repo_count' => 'integer',
            'has_saas_repo' => 'boolean',
        ];
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }
}
