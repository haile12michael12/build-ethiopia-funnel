<?php

use App\Http\Controllers\AuditFunnelController;
use App\Http\Controllers\AutomationController;
use App\Http\Controllers\AutomationRunController;
use App\Http\Controllers\ChapaWebhookController;
use App\Http\Controllers\ClientAcquisitionAnalyticsController;
use App\Http\Controllers\ClientAcquisitionController;
use App\Http\Controllers\ClientAcquisitionSettingsController;
use App\Http\Controllers\ClientProjectController;
use App\Http\Controllers\ContactController;
use App\Http\Controllers\ContactLookupController;
use App\Http\Controllers\ContentStudioController;
use App\Http\Controllers\CopilotController;
use App\Http\Controllers\DemoController;
use App\Http\Controllers\DeveloperAiRecommendationController;
use App\Http\Controllers\DeveloperAuditController;
use App\Http\Controllers\DeveloperFunnelAnalyticsController;
use App\Http\Controllers\DeveloperFunnelController;
use App\Http\Controllers\DeveloperToolsController;
use App\Http\Controllers\DomainController;
use App\Http\Controllers\EmailPreferenceController;
use App\Http\Controllers\FollowUpTaskController;
use App\Http\Controllers\FunnelAnalyticsController;
use App\Http\Controllers\FunnelController;
use App\Http\Controllers\FunnelEvaluationController;
use App\Http\Controllers\FunnelExperimentController;
use App\Http\Controllers\FunnelGenerationController;
use App\Http\Controllers\FunnelOpportunitySettingController;
use App\Http\Controllers\FunnelResponseController;
use App\Http\Controllers\FunnelSupportChatController;
use App\Http\Controllers\FunnelVariantController;
use App\Http\Controllers\GitHubProfileController;
use App\Http\Controllers\LeadCaptureController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\MarketplaceController;
use App\Http\Controllers\OpportunityController;
use App\Http\Controllers\PipelineController;
use App\Http\Controllers\PipelineStageController;
use App\Http\Controllers\PortfolioController;
use App\Http\Controllers\ProjectController;
use App\Http\Controllers\SiteContentController;
use App\Http\Controllers\WebsiteAssessmentController;
use App\Http\Controllers\WorkspaceController;
use App\Models\Domain;
use App\Models\Contact;
use App\Models\ContactActivity;
use App\Models\FunnelEvent;
use App\Services\ClientAcquisitionConfiguration;
use App\Services\FunnelPublicUrlResolver;
use App\Services\FunnelVariantResolver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

$appDomain = parse_url(config('app.url'), PHP_URL_HOST) ?? 'localhost';

Route::post('funnels/{funnel}/leads', [LeadCaptureController::class, 'store'])->name('funnels.leads.store');
Route::post('funnels/{funnel}/events', [FunnelAnalyticsController::class, 'store'])
    ->middleware('throttle:120,1')
    ->name('funnels.events.store');
Route::post('funnels/{funnel}/evaluate-step', FunnelEvaluationController::class)
    ->middleware('throttle:30,1')
    ->name('funnels.steps.evaluate');
Route::post('funnels/{funnel}/github-profile', GitHubProfileController::class)
    ->middleware('throttle:30,60')
    ->name('funnels.github-profile.store');
Route::post('funnels/{funnel}/support-chat', FunnelSupportChatController::class)
    ->middleware('throttle:10,1')
    ->name('funnels.support-chat');
Route::post('marketplace/chapa/webhook', ChapaWebhookController::class)->name('marketplace.chapa.webhook');

Route::domain($appDomain)->group(function () {
    Route::get('/', [SiteContentController::class, 'home'])->name('home');
    Route::get('/demo', DemoController::class)->middleware('throttle:20,1')->name('demo');
    Route::get('/business-growth-audit', [AuditFunnelController::class, 'show'])->name('business-audit.show');
    Route::post('/business-growth-audit', [AuditFunnelController::class, 'store'])
        ->middleware('throttle:10,1')
        ->name('business-audit.store');
    Route::get('/developer-audit', [DeveloperAuditController::class, 'index'])->name('developer-audit.index');
    Route::post('/developer-audit', [DeveloperAuditController::class, 'store'])
        ->middleware('throttle:3,60')
        ->name('developer-audit.store');
    Route::get('/developer-audit/check-email', [DeveloperAuditController::class, 'checkEmail'])->name('developer-audit.check-email');
    Route::get('/developer-audit/unlock/{audit:public_id}/{token}', [DeveloperAuditController::class, 'confirmUnlock'])
        ->middleware('signed')
        ->name('developer-audit.unlock.confirm');
    Route::post('/developer-audit/unlock/{audit:public_id}/{token}', [DeveloperAuditController::class, 'unlock'])
        ->middleware('signed')
        ->name('developer-audit.unlock');
    Route::get('/developer-audit/report/{audit:public_id}', [DeveloperAuditController::class, 'report'])->name('developer-audit.report');
    Route::get('/developer-tools', [DeveloperToolsController::class, 'index'])->name('developer-tools.index');
    Route::post('/developer-tools/playground', [DeveloperToolsController::class, 'simulate'])
        ->middleware('throttle:30,60')
        ->name('developer-tools.playground');
    Route::post('/developer-tools/export', [DeveloperToolsController::class, 'export'])
        ->middleware('throttle:10,60')
        ->name('developer-tools.export');
    Route::get('/business-growth-audit/thank-you/{contact}', [AuditFunnelController::class, 'thankYou'])
        ->middleware('signed')
        ->name('business-audit.thank-you');
    Route::get('/start-project', [ClientAcquisitionController::class, 'show'])->name('client-acquisition.show');
    Route::post('/start-project', [ClientAcquisitionController::class, 'store'])
        ->middleware('throttle:6,1')
        ->name('client-acquisition.store');
    Route::get('/start-project/thank-you/{contact}', [ClientAcquisitionController::class, 'thankYou'])
        ->middleware('signed')
        ->name('client-acquisition.thank-you');

    // Public funnel view — accessible without authentication.
    // Published funnels are open to all; unpublished funnels require ownership (enforced in controller).
    Route::get('/f/{funnel:slug}', [FunnelController::class, 'show'])->name('funnels.show');
    Route::get('/marketplace', [MarketplaceController::class, 'index'])->name('marketplace.index');
    Route::get('/marketplace/{template:slug}', [MarketplaceController::class, 'show'])->name('marketplace.show');
    Route::get('email/unsubscribe/{preference}', [EmailPreferenceController::class, 'show'])
        ->middleware('signed')
        ->name('email.unsubscribe.show');
    Route::post('email/unsubscribe/{preference}', [EmailPreferenceController::class, 'update'])
        ->middleware('signed')
        ->name('email.unsubscribe.update');

    // Public Portfolio & Agency routes
    Route::get('/portfolio', [PortfolioController::class, 'index'])->name('portfolio.index');
    Route::get('/portfolio/{project:slug}', [PortfolioController::class, 'show'])->name('portfolio.show');
    Route::get('/case-studies', fn () => redirect()->route('portfolio.index'))->name('case-studies');
    Route::get('/services', [SiteContentController::class, 'services'])->name('services');
    Route::get('/contact', [SiteContentController::class, 'namedPage'])->defaults('slug', 'contact')->name('contact');
    Route::get('/about', [SiteContentController::class, 'namedPage'])->defaults('slug', 'about')->name('about');
    Route::get('/blog', [SiteContentController::class, 'blog'])->name('blog.index');
    Route::get('/blog/{content:slug}', [SiteContentController::class, 'blogShow'])->name('blog.show');
    Route::get('/p/{content:slug}', [SiteContentController::class, 'page'])->name('site-pages.show');
    Route::post('/locale/{locale}', [LocaleController::class, 'update'])->name('locale.update');

    Route::middleware(['auth', 'verified'])->group(function () {
        Route::post('marketplace/contributor-submissions', [MarketplaceController::class, 'submit'])
            ->middleware('throttle:5,60')
            ->name('marketplace.submissions.store');
        Route::get('marketplace/contributor-listings/{template}/edit', [MarketplaceController::class, 'editListing'])
            ->name('marketplace.contributor-listings.edit');
        Route::put('marketplace/contributor-listings/{template}', [MarketplaceController::class, 'updateListing'])
            ->middleware('throttle:10,60')
            ->name('marketplace.contributor-listings.update');
        Route::get('marketplace/{template:slug}/download', [MarketplaceController::class, 'download'])
            ->name('marketplace.download');
        Route::post('marketplace/{template:slug}/checkout', [MarketplaceController::class, 'checkout'])
            ->middleware('throttle:5,10')
            ->name('marketplace.checkout');
        Route::get('marketplace/checkout/return', [MarketplaceController::class, 'checkoutReturn'])
            ->name('marketplace.checkout.return');
        Route::get('marketplace/manage/review', [MarketplaceController::class, 'reviewerIndex'])
            ->name('marketplace.review.index');
        Route::put('marketplace/manage/review/{template}', [MarketplaceController::class, 'review'])
            ->name('marketplace.review.update');
        Route::get('workspaces', [WorkspaceController::class, 'index'])->name('workspaces.index');
        Route::post('workspaces', [WorkspaceController::class, 'store'])->name('workspaces.store');
        Route::get('workspaces/{workspace}/settings', [WorkspaceController::class, 'edit'])->name('workspaces.settings.edit');
        Route::put('workspaces/{workspace}/settings', [WorkspaceController::class, 'update'])->name('workspaces.settings.update');
        Route::post('workspaces/{workspace}/invitations', [WorkspaceController::class, 'invite'])->name('workspaces.invitations.store');
        Route::get('workspace-invitations/{token}/accept', [WorkspaceController::class, 'showInvitation'])
            ->where('token', '[A-Za-z0-9]+')
            ->name('workspaces.invitations.show');
        Route::post('workspace-invitations/{token}/accept', [WorkspaceController::class, 'accept'])
            ->where('token', '[A-Za-z0-9]+')
            ->name('workspaces.invitations.accept');
        Route::get('developer-analytics', [DeveloperFunnelAnalyticsController::class, 'index'])->name('developer-analytics.index');
        Route::post('contacts/{contact}/developer-ai-recommendations', [DeveloperAiRecommendationController::class, 'store'])
            ->middleware('throttle:5,60')
            ->name('contacts.developer-ai-recommendations.store');
        Route::patch('contacts/{contact}/developer-ai-recommendations/{recommendation}', [DeveloperAiRecommendationController::class, 'review'])
            ->name('contacts.developer-ai-recommendations.review');

        Route::get('settings/client-acquisition', [ClientAcquisitionSettingsController::class, 'edit'])->name('client-acquisition.settings.edit');
        Route::put('settings/client-acquisition', [ClientAcquisitionSettingsController::class, 'update'])->name('client-acquisition.settings.update');
        Route::get('client-acquisition/analytics', ClientAcquisitionAnalyticsController::class)->name('client-acquisition.analytics');
        Route::get('dashboard', function (Request $request, ClientAcquisitionConfiguration $configuration) {
            $user = auth()->user();
            $funnels = $user->funnels();
            $filters = $request->validate([
                'date_from' => ['nullable', 'date_format:Y-m-d'],
                'date_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:date_from'],
                'market' => ['nullable', 'in:ethiopia,international'],
                'service' => ['nullable', 'string', 'max:40'],
                'status' => ['nullable', 'in:'.implode(',', Contact::STATUSES)],
            ]);
            $from = $filters['date_from'] ?? now()->subDays(29)->toDateString();
            $to = $filters['date_to'] ?? now()->toDateString();
            $matchesContactFilters = function (Contact $contact, bool $includeStatus = true) use ($filters): bool {
                $project = $contact->client_project ?? [];

                if (($filters['market'] ?? null) && (data_get($project, 'market') !== $filters['market'])) {
                    return false;
                }

                if (($filters['service'] ?? null) && ! in_array($filters['service'], data_get($project, 'service_interests', []), true)) {
                    return false;
                }

                if ($includeStatus && ($filters['status'] ?? null) && $contact->status !== $filters['status']) {
                    return false;
                }

                return true;
            };
            $filteredContacts = $user->contacts()
                ->whereBetween('created_at', [
                    \Illuminate\Support\Carbon::parse($from)->startOfDay(),
                    \Illuminate\Support\Carbon::parse($to)->endOfDay(),
                ])
                ->get()
                ->filter(fn (Contact $contact) => $matchesContactFilters($contact));
            $filteredQualifiedContacts = $user->contacts()
                ->whereBetween('created_at', [
                    \Illuminate\Support\Carbon::parse($from)->startOfDay(),
                    \Illuminate\Support\Carbon::parse($to)->endOfDay(),
                ])
                ->get()
                ->filter(fn (Contact $contact) => $matchesContactFilters($contact, false) && $contact->status === 'qualified');
            $pendingFollowUps = $user->followUpTasks()
                ->with('contact:id,name,email,status,client_project')
                ->where('status', 'pending')
                ->whereBetween('due_at', [today()->startOfDay(), today()->endOfDay()])
                ->get()
                ->filter(fn ($task) => $task->contact && $matchesContactFilters($task->contact));
            $overdueFollowUps = $user->followUpTasks()
                ->with('contact:id,name,email,status,client_project')
                ->where('status', 'pending')
                ->where('due_at', '<', now())
                ->get()
                ->filter(fn ($task) => $task->contact && $matchesContactFilters($task->contact));

            $events = FunnelEvent::query()
                ->whereIn('funnel_id', (clone $funnels)->select('id'))
                ->where('occurred_at', '>=', now()->subDays(13)->startOfDay())
                ->get(['event_type', 'attribution', 'occurred_at']);
            $daily = collect(range(13, 0))->map(function (int $daysAgo) use ($events) {
                $date = now()->subDays($daysAgo)->toDateString();
                $dayEvents = $events->filter(fn (FunnelEvent $event) => $event->occurred_at->toDateString() === $date);

                return [
                    'date' => $date,
                    'views' => $dayEvents->where('event_type', 'view')->count(),
                    'conversions' => $dayEvents->where('event_type', 'conversion')->count(),
                ];
            });
            $sources = $events
                ->filter(fn (FunnelEvent $event) => $event->event_type === 'conversion')
                ->countBy(fn (FunnelEvent $event) => data_get($event->attribution, 'utm_source', 'Direct'))
                ->sortDesc()
                ->take(5)
                ->map(fn (int $conversions, string $source) => compact('source', 'conversions'))
                ->values();

            return Inertia::render('dashboard', [
                'stats' => [
                    'total_funnels' => (clone $funnels)->count(),
                    'total_views' => (clone $funnels)->sum('views'),
                    'total_conversions' => (clone $funnels)->sum('conversions'),
                    'total_contacts' => $user->contacts()->count(),
                ],
                'filters' => [
                    'date_from' => $from,
                    'date_to' => $to,
                    'market' => $filters['market'] ?? '',
                    'service' => $filters['service'] ?? '',
                    'status' => $filters['status'] ?? '',
                ],
                'filterOptions' => [
                    'markets' => ['ethiopia' => 'Ethiopia', 'international' => 'International'],
                    'services' => collect($configuration->forOwner($user->id)['services'] ?? [])
                        ->mapWithKeys(fn (array $service) => [$service['key'] => $service['label_en']])
                        ->all(),
                    'statuses' => Contact::STATUSES,
                ],
                'operations' => [
                    'new_prospects' => $filteredContacts->count(),
                    'qualified_leads' => $filteredQualifiedContacts->count(),
                    'open_opportunities' => $user->opportunities()->where('status', 'open')->count(),
                    'active_client_projects' => $user->clientProjects()->whereIn('status', ['planning', 'in_progress', 'review'])->count(),
                    'published_portfolio_projects' => $user->projects()->where('status', 'published')->where('is_published', true)->count(),
                    'follow_ups_today' => $pendingFollowUps->count(),
                    'overdue_follow_ups' => $overdueFollowUps->count(),
                    'content_awaiting_review' => $user->contentDrafts()->where('status', 'in_review')->count(),
                    'scheduled_content' => $user->contentDrafts()->where('status', 'scheduled')->whereNotNull('scheduled_at')->count(),
                    'automation_failures' => $user->automationRuns()->where('status', 'failed')->count(),
                ],
                'followUps' => $pendingFollowUps
                    ->sortBy('due_at')
                    ->take(5)
                    ->values()
                    ->map(fn ($task) => [
                        'id' => $task->id,
                        'title' => $task->title,
                        'due_at' => $task->due_at->toIso8601String(),
                        'contact' => $task->contact?->name ?: $task->contact?->email,
                        'contact_id' => $task->contact_id,
                    ]),
                'recentActivities' => ContactActivity::query()
                    ->whereHas('contact', fn ($query) => $query->where('user_id', $user->id))
                    ->with('contact:id,name,email')
                    ->latest()
                    ->limit(6)
                    ->get()
                    ->map(fn (ContactActivity $activity) => [
                        'id' => $activity->id,
                        'type' => str_replace('_', ' ', $activity->type),
                        'contact' => $activity->contact?->name ?: $activity->contact?->email,
                        'created_at' => $activity->created_at->diffForHumans(),
                    ]),
                'dateRange' => ['from' => $from, 'to' => $to],
                'clientProjects' => $user->clientProjects()
                    ->with('contact:id,name,email')
                    ->latest()
                    ->limit(5)
                    ->get()
                    ->map(fn ($project) => [
                        'id' => $project->id,
                        'title' => $project->title,
                        'status' => $project->status,
                        'currency' => $project->currency,
                        'budget_amount' => $project->budget_amount,
                        'contact' => $project->contact?->name ?: $project->contact?->email,
                        'target_completion_date' => $project->target_completion_date?->format('M j, Y'),
                    ]),
                'recentContacts' => $user->contacts()
                    ->with('funnel:id,name')
                    ->latest('last_submitted_at')
                    ->limit(5)
                    ->get()
                    ->map(fn ($contact) => [
                        'id' => $contact->id,
                        'email' => $contact->email,
                        'name' => $contact->name,
                        'funnel' => $contact->funnel?->name,
                        'last_submitted_at' => $contact->last_submitted_at?->diffForHumans(),
                    ]),
                'analytics' => [
                    'daily' => $daily,
                    'sources' => $sources,
                ],
            ]);
        })->name('dashboard');

        Route::get('content-studio', [ContentStudioController::class, 'index'])->name('content-studio.index');
        Route::get('content-studio/create', [ContentStudioController::class, 'create'])->name('content-studio.create');
        Route::post('content-studio', [ContentStudioController::class, 'store'])->name('content-studio.store');
        Route::post('content-studio/generate', [ContentStudioController::class, 'generate'])
            ->middleware('throttle:5,60')
            ->name('content-studio.generate');
        Route::get('content-studio/settings', [ContentStudioController::class, 'settings'])->name('content-studio.settings');
        Route::put('content-studio/settings', [ContentStudioController::class, 'updateSettings'])->name('content-studio.settings.update');
        Route::get('content-studio/{draft}/edit', [ContentStudioController::class, 'edit'])->name('content-studio.edit');
        Route::put('content-studio/{draft}', [ContentStudioController::class, 'update'])->name('content-studio.update');
        Route::post('content-studio/{draft}/review', [ContentStudioController::class, 'submitForReview'])->name('content-studio.review');
        Route::post('content-studio/{draft}/approve', [ContentStudioController::class, 'approve'])->name('content-studio.approve');
        Route::post('content-studio/{draft}/schedule', [ContentStudioController::class, 'schedule'])->name('content-studio.schedule');
        Route::post('content-studio/{draft}/publish', [ContentStudioController::class, 'markPublished'])->name('content-studio.publish');
        Route::post('content-studio/{draft}/failed', [ContentStudioController::class, 'markFailed'])->name('content-studio.failed');
        Route::post('content-studio/{draft}/archive', [ContentStudioController::class, 'archive'])->name('content-studio.archive');

        // Exclude 'show' — it is handled by the public route above.
        Route::get('contacts', [ContactController::class, 'index'])->name('contacts.index');
        Route::get('contacts/lookup', ContactLookupController::class)->name('contacts.lookup');
        Route::get('contacts/export', [ContactController::class, 'export'])->name('contacts.export');
        Route::get('contacts/{contact}', [ContactController::class, 'show'])->name('contacts.show');
        Route::patch('contacts/{contact}', [ContactController::class, 'update'])->name('contacts.update');
        Route::put('contacts/{contact}/details', [ContactController::class, 'updateDetails'])->name('contacts.details.update');
        Route::post('contacts/{contact}/notes', [ContactController::class, 'storeNote'])->name('contacts.notes.store');
        Route::post('contacts/{contact}/contact-attempts', [ContactController::class, 'storeContactAttempt'])->name('contacts.contact-attempts.store');
        Route::post('contacts/{contact}/website-assessments', [WebsiteAssessmentController::class, 'store'])->name('contacts.website-assessments.store');
        Route::post('contacts/{contact}/website-assessments/inspect', [WebsiteAssessmentController::class, 'inspect'])->name('contacts.website-assessments.inspect');
        Route::delete('contacts/{contact}/website-assessments/{assessment}', [WebsiteAssessmentController::class, 'destroy'])->name('contacts.website-assessments.destroy');
        Route::get('follow-up-tasks', [FollowUpTaskController::class, 'index'])->name('follow-up-tasks.index');
        Route::post('contacts/{contact}/follow-up-tasks', [FollowUpTaskController::class, 'store'])->name('follow-up-tasks.store');
        Route::patch('follow-up-tasks/{task}', [FollowUpTaskController::class, 'update'])->name('follow-up-tasks.update');
        Route::get('opportunities', [OpportunityController::class, 'index'])->name('opportunities.index');
        Route::post('opportunities', [OpportunityController::class, 'store'])->name('opportunities.store');
        Route::patch('opportunities/{opportunity}', [OpportunityController::class, 'update'])->name('opportunities.update');
        Route::delete('opportunities/{opportunity}', [OpportunityController::class, 'destroy'])->name('opportunities.destroy');
        Route::post('pipelines', [PipelineController::class, 'store'])->name('pipelines.store');
        Route::patch('pipelines/{pipeline}', [PipelineController::class, 'update'])->name('pipelines.update');
        Route::delete('pipelines/{pipeline}', [PipelineController::class, 'destroy'])->name('pipelines.destroy');
        Route::post('pipelines/{pipeline}/stages', [PipelineStageController::class, 'store'])->name('pipeline-stages.store');
        Route::put('pipelines/{pipeline}/stages/reorder', [PipelineStageController::class, 'reorder'])->name('pipeline-stages.reorder');
        Route::patch('pipeline-stages/{stage}', [PipelineStageController::class, 'update'])->name('pipeline-stages.update');
        Route::delete('pipeline-stages/{stage}', [PipelineStageController::class, 'destroy'])->name('pipeline-stages.destroy');
        Route::get('automations', [AutomationController::class, 'index'])->name('automations.index');
        Route::post('automations', [AutomationController::class, 'store'])->name('automations.store');
        Route::post('funnels/developer-starter', [DeveloperFunnelController::class, 'store'])
            ->middleware('throttle:5,1')
            ->name('funnels.developer-starter.store');
        Route::get('automations/runs', [AutomationRunController::class, 'index'])->name('automation-runs.index');
        Route::get('automations/runs/{run}', [AutomationRunController::class, 'show'])->name('automation-runs.show');
        Route::post('automations/runs/{run}/retry', [AutomationRunController::class, 'retry'])->name('automation-runs.retry');
        Route::post('automations/runs/{run}/cancel', [AutomationRunController::class, 'cancel'])->name('automation-runs.cancel');
        Route::get('automations/{workflow}/edit', [AutomationController::class, 'edit'])->name('automations.edit');
        Route::put('automations/{workflow}/autosave', [AutomationController::class, 'autosave'])->name('automations.autosave');
        Route::post('automations/{workflow}/validate', [AutomationController::class, 'validateDefinition'])->name('automations.validate');
        Route::post('automations/{workflow}/simulate', [AutomationController::class, 'simulate'])->name('automations.simulate');
        Route::post('automations/{workflow}/publish', [AutomationController::class, 'publish'])->name('automations.publish');
        Route::post('automations/{workflow}/pause', [AutomationController::class, 'pause'])->name('automations.pause');
        Route::post('automations/{workflow}/resume', [AutomationController::class, 'resume'])->name('automations.resume');
        Route::post('automations/{workflow}/duplicate', [AutomationController::class, 'duplicate'])->name('automations.duplicate');
        Route::delete('automations/{workflow}', [AutomationController::class, 'destroy'])->name('automations.destroy');
        Route::resource('funnels', FunnelController::class)->except(['show']);
        Route::put('funnels/{funnel}/autosave', [FunnelController::class, 'autosave'])->name('funnels.autosave');
        Route::patch('funnels/{funnel}/crm-settings', [FunnelOpportunitySettingController::class, 'update'])->name('funnels.crm-settings.update');
        Route::get('funnels/{funnel}/responses', [FunnelResponseController::class, 'index'])->name('funnels.responses');
        Route::get('funnel-editor', [FunnelController::class, 'create'])->name('funnel-editor');
        Route::post('funnels/generate', FunnelGenerationController::class)->middleware('throttle:10,1')->name('funnels.generate');
        Route::get('funnel-editor/{funnel}', [FunnelController::class, 'edit'])->name('funnel-editor.edit');
        Route::get('funnel/{funnel}/preview', [FunnelController::class, 'preview'])->name('funnel.preview');
        Route::post('funnels/{funnel}/publish', [FunnelController::class, 'publish'])->name('funnels.publish');
        Route::post('funnels/{funnel}/unpublish', [FunnelController::class, 'unpublish'])->name('funnels.unpublish');
        Route::post('funnels/{funnel}/duplicate', [FunnelController::class, 'duplicate'])->name('funnels.duplicate');
        Route::post('funnels/{funnel}/variants', [FunnelVariantController::class, 'store'])->name('funnels.variants.store');
        Route::patch('funnels/{funnel}/variants/{variant}', [FunnelVariantController::class, 'update'])->name('funnels.variants.update');
        Route::delete('funnels/{funnel}/variants/{variant}', [FunnelVariantController::class, 'destroy'])->name('funnels.variants.destroy');
        Route::get('funnels/{funnel}/export-template', [FunnelController::class, 'exportTemplate'])->name('funnels.export-template');
        Route::post('funnels/import-template', [FunnelController::class, 'importTemplate'])->name('funnels.import-template');

        // Domain Mapping routes
        Route::post('funnels/{funnel}/domains', [DomainController::class, 'store'])->name('domains.store');
        Route::post('funnels/{funnel}/domains/{domain}/verify', [DomainController::class, 'verify'])->name('domains.verify');
        Route::delete('domains/{domain}', [DomainController::class, 'destroy'])->name('domains.destroy');

        // Copilot Optimization routes
        Route::get('funnels/{funnel}/copilot', [CopilotController::class, 'show'])->name('copilot.show');
        Route::post('funnels/{funnel}/copilot/audit', [CopilotController::class, 'store'])->name('copilot.audit');
        Route::get('funnels/{funnel}/copilot/audit/{audit}', [CopilotController::class, 'showAudit'])->name('copilot.audit.show');
        Route::post('funnels/{funnel}/copilot/question', [CopilotController::class, 'askQuestion'])
            ->middleware('throttle:5,10')
            ->name('copilot.question');
        Route::get('funnels/{funnel}/experiments', [FunnelExperimentController::class, 'index'])->name('funnels.experiments.index');
        Route::post('funnels/{funnel}/experiments', [FunnelExperimentController::class, 'store'])->name('funnels.experiments.store');
        Route::patch('funnels/{funnel}/experiments/{experiment}/status', [FunnelExperimentController::class, 'updateStatus'])->name('funnels.experiments.status');
        Route::post('funnels/{funnel}/copilot/recommendations/{recommendation}/accept', [CopilotController::class, 'acceptRecommendation'])->name('copilot.recommendations.accept');
        Route::post('funnels/{funnel}/copilot/recommendations/{recommendation}/dismiss', [CopilotController::class, 'dismissRecommendation'])->name('copilot.recommendations.dismiss');
        Route::post('funnels/{funnel}/copilot/recommendations/{recommendation}/review', [CopilotController::class, 'reviewRecommendation'])->name('copilot.recommendations.review');
        Route::post('funnels/{funnel}/copilot/recommendations/{recommendation}/experiment', [CopilotController::class, 'createDraftExperiment'])->name('copilot.recommendations.experiment');

        // Project Management routes
        Route::resource('projects', ProjectController::class)->except(['show']);
        Route::post('projects/{project}/publish', [ProjectController::class, 'publish'])->name('projects.publish');
        Route::post('projects/{project}/unpublish', [ProjectController::class, 'unpublish'])->name('projects.unpublish');
        Route::post('projects/{project}/archive', [ProjectController::class, 'archive'])->name('projects.archive');
        Route::get('projects/{project}/preview', [ProjectController::class, 'preview'])->name('projects.preview');

        // Client Delivery Project Management routes
        Route::get('client-projects', [ClientProjectController::class, 'index'])->name('client-projects.index');
        Route::post('client-projects', [ClientProjectController::class, 'store'])->name('client-projects.store');
        Route::get('client-projects/{project}', [ClientProjectController::class, 'show'])->name('client-projects.show');
        Route::put('client-projects/{project}', [ClientProjectController::class, 'update'])->name('client-projects.update');
        Route::post('client-projects/{project}/milestones', [ClientProjectController::class, 'storeMilestone'])->name('client-projects.milestones.store');
        Route::patch('client-projects/{project}/milestones/{milestone}', [ClientProjectController::class, 'updateMilestone'])->name('client-projects.milestones.update');
        Route::delete('client-projects/{project}/milestones/{milestone}', [ClientProjectController::class, 'destroyMilestone'])->name('client-projects.milestones.destroy');
        Route::get('site-content/{type}', [SiteContentController::class, 'index'])->name('site-content.index');
        Route::get('site-content/{type}/create', [SiteContentController::class, 'create'])->name('site-content.create');
        Route::post('site-content/{type}', [SiteContentController::class, 'store'])->name('site-content.store');
        Route::get('site-content/{type}/{entry}/edit', [SiteContentController::class, 'edit'])->name('site-content.edit');
        Route::put('site-content/{type}/{entry}', [SiteContentController::class, 'update'])->name('site-content.update');
        Route::delete('site-content/{type}/{entry}', [SiteContentController::class, 'destroy'])->name('site-content.destroy');
    });

    require __DIR__.'/settings.php';
    require __DIR__.'/auth.php';
});

// Custom Domain Fallback Route
Route::fallback(function (Request $request) {
    $host = $request->getHost();

    $domain = Domain::with('funnel')
        ->where('domain', $host)
        ->where('is_verified', true)
        ->first();

    if (! $domain || ! $domain->funnel || ! $domain->funnel->is_published) {
        abort(404, 'Funnel not found or domain not mapped.');
    }

    $domain->funnel->incrementViews();

    $assignment = app(FunnelVariantResolver::class)->resolve($domain->funnel, $request);
    $variant = $assignment['variant'];
    Cookie::queue(
        cookie($assignment['cookie'], $assignment['value'], 60 * 24 * 30, '/', null, false, false, false, 'lax'),
    );

    return Inertia::render('funnel-preview', [
        'funnel' => [
            'id' => $domain->funnel->id,
            'name' => $domain->funnel->name,
            'slug' => $domain->funnel->slug,
            'description' => $domain->funnel->description,
            'content' => $variant?->content ?? $domain->funnel->content,
            'settings' => $variant?->settings ?? $domain->funnel->settings,
            'variant_id' => $variant?->id,
            'status' => $domain->funnel->status,
            'is_published' => $domain->funnel->is_published,
            'public_url' => app(FunnelPublicUrlResolver::class)->resolve($domain->funnel),
        ],
        'previewMode' => false,
        'supportChatEnabled' => true,
    ]);
});
