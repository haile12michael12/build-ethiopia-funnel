<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WebsiteAssessment extends Model
{
    public const STATUSES = [
        'needs_review',
        'completed',
    ];

    protected $fillable = [
        'contact_id',
        'user_id',
        'website_url',
        'status',
        'has_website',
        'mobile_usability_score',
        'content_quality_score',
        'technical_issues',
        'suggested_improvements',
        'evidence_url',
        'notes',
        'assessed_at',
    ];

    protected $casts = [
        'has_website' => 'boolean',
        'mobile_usability_score' => 'integer',
        'content_quality_score' => 'integer',
        'technical_issues' => 'array',
        'suggested_improvements' => 'array',
        'assessed_at' => 'datetime',
    ];

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function assessor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
