<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\HasOne;
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

    public function isBusinessOwner(): bool
    {
        return static::emailMatchesConfiguredOwner($this->email);
    }

    public static function configuredOwnerEmail(): ?string
    {
        $ownerEmail = config('business.owner_email');
        if (! is_string($ownerEmail) || trim($ownerEmail) === '') {
            return null;
        }

        return mb_strtolower(trim($ownerEmail));
    }

    public static function emailMatchesConfiguredOwner(?string $email): bool
    {
        $ownerEmail = static::configuredOwnerEmail();

        return $ownerEmail !== null
            && is_string($email)
            && trim($email) !== ''
            && hash_equals($ownerEmail, mb_strtolower(trim($email)));
    }

    public static function configuredBusinessOwner(): ?self
    {
        $ownerEmail = static::configuredOwnerEmail();
        if ($ownerEmail === null) {
            return null;
        }

        return static::query()
            ->whereRaw('LOWER(email) = ?', [$ownerEmail])
            ->first();
    }

    /**
     * Resolve the account that owns public lead-capture submissions
     * (audit, start-project, developer audit, appointment requests).
     *
     * Prefers BUSINESS_AUDIT_OWNER_ID; when it is blank or points to a
     * missing account, falls back to the single business owner identified
     * by ADMIN_EMAIL — the README requires both to reference the same
     * account. Returns null only when neither resolves, so callers still
     * fail closed with a 503 in a completely unconfigured install.
     */
    public static function configuredLeadOwner(): ?self
    {
        $ownerId = config('business-audit.owner_id');
        if (is_numeric($ownerId)) {
            $owner = static::query()->find((int) $ownerId);
            if ($owner) {
                return $owner;
            }
        }

        return static::configuredBusinessOwner();
    }

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

    /**
     * Leads submitted by this registered customer account
     * (business audit, project request, or demo booking).
     */
    public function customerContacts(): HasMany
    {
        return $this->hasMany(Contact::class, 'customer_user_id');
    }

    public function followUpTasks(): HasMany
    {
        return $this->hasMany(FollowUpTask::class);
    }

    public function bookingPages(): HasMany
    {
        return $this->hasMany(BookingPage::class);
    }

    public function bookings(): HasManyThrough
    {
        return $this->hasManyThrough(Booking::class, BookingPage::class);
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

    public function contentDrafts(): HasMany
    {
        return $this->hasMany(ContentDraft::class);
    }

    public function contentStudioSetting(): HasOne
    {
        return $this->hasOne(ContentStudioSetting::class);
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

    public function clientProjects(): HasMany
    {
        return $this->hasMany(ClientProject::class)->latest('created_at');
    }
}
