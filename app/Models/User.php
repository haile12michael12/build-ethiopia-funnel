<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'email_verified_at',
        'is_demo',
        'demo_expires_at',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_demo' => 'boolean',
            'demo_expires_at' => 'datetime',
        ];
    }

    /**
     * Get the funnels for the user.
     */
    public function funnels(): HasMany
    {
        return $this->hasMany(Funnel::class);
    }

    public function contacts(): HasMany
    {
        return $this->hasMany(Contact::class);
    }

    public function pipelines(): HasMany
    {
        return $this->hasMany(Pipeline::class);
    }

    public function opportunities(): HasMany
    {
        return $this->hasMany(Opportunity::class);
    }

    public function automationWorkflows(): HasMany
    {
        return $this->hasMany(AutomationWorkflow::class);
    }

    public function automationEvents(): HasMany
    {
        return $this->hasMany(AutomationEvent::class);
    }

    public function automationRuns(): HasMany
    {
        return $this->hasMany(AutomationRun::class);
    }

    public function contactEmailPreferences(): HasMany
    {
        return $this->hasMany(ContactEmailPreference::class);
    }

    public function leadScoringRules(): HasMany
    {
        return $this->hasMany(LeadScoringRule::class);
    }

    public function marketplaceTemplates(): HasMany
    {
        return $this->hasMany(MarketplaceTemplate::class, 'owner_id');
    }

    public function marketplacePurchases(): HasMany
    {
        return $this->hasMany(MarketplacePurchase::class, 'buyer_id');
    }

    public function workspaces(): BelongsToMany
    {
        return $this->belongsToMany(Workspace::class, 'workspace_members')
            ->withPivot(['id', 'role'])
            ->withTimestamps();
    }

    public function ownedWorkspaces(): HasMany
    {
        return $this->hasMany(Workspace::class, 'owner_id');
    }

    public function developerAiRecommendations(): HasMany
    {
        return $this->hasMany(DeveloperAiRecommendation::class);
    }

    public function projects(): HasMany
    {
        return $this->hasMany(Project::class);
    }

    public function siteContents(): HasMany
    {
        return $this->hasMany(SiteContent::class);
    }

    public function clientAcquisitionSettings(): HasOne
    {
        return $this->hasOne(ClientAcquisitionSettings::class);
    }

    public function copilotAudits(): HasMany
    {
        return $this->hasMany(CopilotAudit::class);
    }

    public function copilotRecommendations(): HasMany
    {
        return $this->hasMany(CopilotRecommendation::class);
    }
}
