<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Contact extends Model
{
    public const STATUSES = [
        'new',
        'reviewing',
        'qualified',
        'contacted',
        'consultation_scheduled',
        'proposal_sent',
        'negotiation',
        'won',
        'lost',
        'nurture',
    ];

    protected $fillable = [
        'user_id',
        'customer_user_id',
        'funnel_id',
        'email',
        'name',
        'phone',
        'source',
        'status',
        'lost_reason',
        'tags',
        'metadata',
        'ip_address',
        'user_agent',
        'last_submitted_at',
        'last_contacted_at',
        'last_scored_at',
        'business_audit',
        'client_project',
        'lead_score',
        'lead_score_breakdown',
        'lead_score_reasons',
    ];

    protected $casts = [
        'tags' => 'array',
        'metadata' => 'array',
        'last_submitted_at' => 'datetime',
        'last_contacted_at' => 'datetime',
        'last_scored_at' => 'datetime',
        'business_audit' => 'array',
        'client_project' => 'array',
        'lead_score' => 'integer',
        'lead_score_breakdown' => 'array',
        'lead_score_reasons' => 'array',
    ];

    protected static function booted(): void
    {
        static::deleting(function (Contact $contact): void {
            $contact->automationRuns()->update([
                'contact_id' => null,
                'context' => '[]',
            ]);
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function funnel(): BelongsTo
    {
        return $this->belongsTo(Funnel::class);
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(ContactSubmission::class);
    }

    public function activities(): HasMany
    {
        return $this->hasMany(ContactActivity::class)->latest();
    }

    public function followUpTasks(): HasMany
    {
        return $this->hasMany(FollowUpTask::class);
    }

    public function opportunities(): HasMany
    {
        return $this->hasMany(Opportunity::class);
    }

    public function emailPreference(): HasOne
    {
        return $this->hasOne(ContactEmailPreference::class);
    }

    public function developerProfile(): HasOne
    {
        return $this->hasOne(DeveloperProfile::class);
    }

    public function developerAiRecommendations(): HasMany
    {
        return $this->hasMany(DeveloperAiRecommendation::class);
    }

    public function websiteAssessments(): HasMany
    {
        return $this->hasMany(WebsiteAssessment::class)->latest('created_at');
    }

    public function clientProjects(): HasMany
    {
        return $this->hasMany(ClientProject::class)->latest('created_at');
    }

    public function automationRuns(): HasMany
    {
        return $this->hasMany(AutomationRun::class);
    }
}
