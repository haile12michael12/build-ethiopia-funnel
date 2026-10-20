<?php

namespace App\Http\Controllers;

use App\Contracts\ContentDraftGenerator;
use App\Models\ContentDraft;
use App\Models\ContentDraftVersion;
use App\Models\Project;
use App\Models\SiteContent;
use App\Services\ClientAcquisitionConfiguration;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;

class ContentStudioController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::in(ContentDraft::STATUSES)],
            'platform' => ['nullable', Rule::in(array_keys(config('content-studio.platforms')))],
        ]);

        $drafts = $request->user()->contentDrafts()
            ->with('portfolioProject:id,title_en')
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $query->where(function ($query) use ($search): void {
                    $query->where('title', 'like', '%'.trim($search).'%')
                        ->orWhere('body', 'like', '%'.trim($search).'%');
                });
            })
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($filters['platform'] ?? null, fn ($query, string $platform) => $query->where('platform', $platform))
            ->latest('updated_at')
            ->paginate(12)
            ->withQueryString();

        return Inertia::render('content-studio/index', [
            'drafts' => $drafts,
            'filters' => [
                'search' => $filters['search'] ?? '',
                'status' => $filters['status'] ?? '',
                'platform' => $filters['platform'] ?? '',
            ],
            'statuses' => ContentDraft::STATUSES,
            'platforms' => config('content-studio.platforms'),
            'counts' => $request->user()->contentDrafts()
                ->selectRaw('status, COUNT(*) as total')
                ->groupBy('status')
                ->pluck('total', 'status'),
        ]);
    }

    public function create(Request $request, ClientAcquisitionConfiguration $configuration): Response
    {
        return Inertia::render('content-studio/form', [
            'draft' => null,
            'versions' => [],
            'options' => $this->formOptions($request, $configuration),
            'brandSettings' => $this->brandSettings($request),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $validated = $this->validateBrief($request);
        $validated['title'] = $request->validate(['title' => ['required', 'string', 'max:255']])['title'];
        $validated['body'] = $request->validate(['body' => ['nullable', 'string', 'max:12000']])['body'] ?? null;
        $validated['status'] = 'idea';
        $this->validatePortfolioProject($request, $validated['portfolio_project_id'] ?? null);

        $draft = $request->user()->contentDrafts()->create($validated);

        return redirect()->route('content-studio.edit', $draft)->with('success', 'Content idea saved.');
    }

    public function generate(
        Request $request,
        ContentDraftGenerator $generator,
        ClientAcquisitionConfiguration $configuration,
    ): RedirectResponse {
        $brief = $this->validateBrief($request);
        $project = $this->validatePortfolioProject($request, $brief['portfolio_project_id'] ?? null);

        try {
            $generated = $generator->generate(
                $brief,
                $this->brandSettings($request),
                $this->verifiedFacts($request, $configuration, $project),
            );
        } catch (RuntimeException $exception) {
            throw ValidationException::withMessages(['generation' => $exception->getMessage()]);
        }

        $draft = DB::transaction(function () use ($request, $brief, $generated): ContentDraft {
            $draft = $request->user()->contentDrafts()->create([
                ...$brief,
                'title' => $generated['title'],
                'body' => $generated['body'],
                'status' => 'draft',
                'is_generated' => true,
                'prompt_template_key' => config('content-studio.prompt_template_key'),
                'provider' => config('funnel-ai.driver'),
                'provider_model' => config('funnel-ai.model'),
            ]);
            $draft->versions()->create([
                'user_id' => $request->user()->id,
                'title' => $draft->title,
                'body' => $draft->body,
                'reason' => 'generated',
                'created_at' => now(),
            ]);

            return $draft;
        });

        return redirect()->route('content-studio.edit', $draft)->with('success', 'AI draft created. Review factual claims before approval.');
    }

    public function edit(Request $request, ContentDraft $draft, ClientAcquisitionConfiguration $configuration): Response
    {
        $draft = $this->ownedDraft($request, $draft);

        return Inertia::render('content-studio/form', [
            'draft' => $draft->load('portfolioProject:id,title_en'),
            'versions' => $draft->versions()->get(['id', 'title', 'body', 'reason', 'created_at']),
            'options' => $this->formOptions($request, $configuration),
            'brandSettings' => $this->brandSettings($request),
        ]);
    }

    public function update(Request $request, ContentDraft $draft): RedirectResponse
    {
        $draft = $this->ownedDraft($request, $draft);
        abort_if(in_array($draft->status, ['published', 'archived'], true), 409, 'Published or archived content is read-only.');

        $validated = $this->validateBrief($request);
        $validated['title'] = $request->validate(['title' => ['required', 'string', 'max:255']])['title'];
        $validated['body'] = $request->validate(['body' => ['nullable', 'string', 'max:12000']])['body'] ?? null;
        $this->validatePortfolioProject($request, $validated['portfolio_project_id'] ?? null);

        DB::transaction(function () use ($request, $draft, $validated): void {
            if ($draft->title !== $validated['title'] || $draft->body !== $validated['body']) {
                $draft->versions()->create([
                    'user_id' => $request->user()->id,
                    'title' => $draft->title,
                    'body' => $draft->body,
                    'reason' => 'edited',
                    'created_at' => now(),
                ]);
            }

            $draft->update([
                ...$validated,
                'status' => in_array($draft->status, ['in_review', 'approved', 'scheduled', 'failed'], true)
                    ? 'draft'
                    : $draft->status,
                'scheduled_at' => null,
                'approved_at' => null,
                'failure_details' => null,
            ]);
        });

        return back()->with('success', 'Draft saved. Any previous approval or schedule was cleared.');
    }

    public function submitForReview(Request $request, ContentDraft $draft): RedirectResponse
    {
        $draft = $this->ownedDraft($request, $draft);
        abort_unless(in_array($draft->status, ['idea', 'draft', 'failed'], true) && filled($draft->body), 409);
        $draft->update(['status' => 'in_review', 'failure_details' => null]);

        return back()->with('success', 'Content submitted for review.');
    }

    public function approve(Request $request, ContentDraft $draft): RedirectResponse
    {
        $draft = $this->ownedDraft($request, $draft);
        abort_unless($draft->status === 'in_review', 409);
        $draft->update(['status' => 'approved', 'approved_at' => now()]);

        return back()->with('success', 'Content approved. It has not been published.');
    }

    public function schedule(Request $request, ContentDraft $draft): RedirectResponse
    {
        $draft = $this->ownedDraft($request, $draft);
        abort_unless(in_array($draft->status, ['approved', 'scheduled'], true), 409);
        $validated = $request->validate(['scheduled_at' => ['required', 'date', 'after:now']]);
        $draft->update(['status' => 'scheduled', 'scheduled_at' => $validated['scheduled_at']]);

        return back()->with('success', 'Manual publication reminder scheduled.');
    }

    public function markPublished(Request $request, ContentDraft $draft): RedirectResponse
    {
        $draft = $this->ownedDraft($request, $draft);
        abort_unless(in_array($draft->status, ['approved', 'scheduled'], true), 409);
        $validated = $request->validate([
            'confirmed' => ['required', 'accepted'],
            'published_url' => ['nullable', 'url:https', 'max:2048'],
        ]);
        $draft->update([
            'status' => 'published',
            'published_at' => now(),
            'published_url' => $validated['published_url'] ?? null,
            'scheduled_at' => null,
        ]);

        return back()->with('success', 'Manual publication recorded.');
    }

    public function markFailed(Request $request, ContentDraft $draft): RedirectResponse
    {
        $draft = $this->ownedDraft($request, $draft);
        abort_unless($draft->status === 'scheduled', 409);
        $validated = $request->validate(['failure_details' => ['required', 'string', 'max:2000']]);
        $draft->update(['status' => 'failed', 'failure_details' => $validated['failure_details']]);

        return back()->with('success', 'Publication attempt recorded as failed.');
    }

    public function archive(Request $request, ContentDraft $draft): RedirectResponse
    {
        $draft = $this->ownedDraft($request, $draft);
        abort_unless($draft->status !== 'published', 409);
        $draft->update(['status' => 'archived', 'scheduled_at' => null]);

        return redirect()->route('content-studio.index')->with('success', 'Content archived.');
    }

    public function settings(Request $request): Response
    {
        return Inertia::render('content-studio/settings', [
            'settings' => $this->brandSettings($request),
        ]);
    }

    public function updateSettings(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'brand_name' => ['nullable', 'string', 'max:160'],
            'brand_voice' => ['nullable', 'string', 'max:500'],
            'brand_guidelines' => ['nullable', 'string', 'max:3000'],
        ]);
        $request->user()->contentStudioSetting()->updateOrCreate(
            ['user_id' => $request->user()->id],
            $validated,
        );

        return redirect()->route('content-studio.settings')->with('success', 'Brand settings saved.');
    }

    private function validateBrief(Request $request): array
    {
        $validated = $request->validate([
            'content_type' => ['required', Rule::in(array_keys(config('content-studio.content_types')))],
            'platform' => ['required', Rule::in(array_keys(config('content-studio.platforms')))],
            'format' => ['required', Rule::in(array_keys(config('content-studio.formats')))],
            'audience' => ['required', 'string', 'max:255'],
            'market' => ['required', Rule::in(['ethiopia', 'international'])],
            'service' => ['required', 'string', 'max:120'],
            'objective' => ['required', Rule::in(array_keys(config('content-studio.objectives')))],
            'tone' => ['required', 'string', 'max:120'],
            'language' => ['required', Rule::in(['en', 'am'])],
            'call_to_action' => ['nullable', 'string', 'max:255'],
            'portfolio_project_id' => ['nullable', 'integer', 'exists:projects,id'],
        ]);

        $this->validatePortfolioProject($request, $validated['portfolio_project_id'] ?? null);

        return $validated;
    }

    private function ownedDraft(Request $request, ContentDraft $draft): ContentDraft
    {
        abort_unless((int) $draft->user_id === (int) $request->user()->id, 404);

        return $draft;
    }

    private function validatePortfolioProject(Request $request, ?int $projectId): ?Project
    {
        if ($projectId === null) {
            return null;
        }

        $project = $request->user()->projects()
            ->where('is_published', true)
            ->where('status', 'published')
            ->whereKey($projectId)
            ->first();

        if (! $project) {
            throw ValidationException::withMessages([
                'portfolio_project_id' => 'Choose one of your published portfolio projects.',
            ]);
        }

        return $project;
    }

    private function formOptions(Request $request, ClientAcquisitionConfiguration $configuration): array
    {
        $projects = $request->user()->projects()
            ->where('is_published', true)
            ->where('status', 'published')
            ->orderBy('title_en')
            ->get(['id', 'title_en', 'summary_en', 'description_en', 'category', 'technologies']);

        return [
            'contentTypes' => config('content-studio.content_types'),
            'platforms' => config('content-studio.platforms'),
            'formats' => config('content-studio.formats'),
            'objectives' => config('content-studio.objectives'),
            'services' => collect($configuration->forOwner($request->user()->id)['services'] ?? [])
                ->mapWithKeys(fn (array $service) => [$service['key'] => $service['label_en']])
                ->all(),
            'portfolioProjects' => $projects->map(fn (Project $project) => [
                'id' => $project->id,
                'title' => $project->title_en,
            ]),
        ];
    }

    private function brandSettings(Request $request): array
    {
        $settings = $request->user()->contentStudioSetting;

        return [
            'brand_name' => $settings?->brand_name ?? config('app.name'),
            'brand_voice' => $settings?->brand_voice ?? '',
            'brand_guidelines' => $settings?->brand_guidelines ?? '',
        ];
    }

    private function verifiedFacts(Request $request, ClientAcquisitionConfiguration $configuration, ?Project $selectedProject): array
    {
        $services = $request->user()->siteContents()
            ->where('type', 'service')
            ->published()
            ->get(['title_en', 'summary_en', 'body_en'])
            ->map(fn (SiteContent $service) => [
                'name' => $service->title_en,
                'summary' => $service->summary_en,
                'description' => $service->body_en,
            ]);

        $configuredServices = collect($configuration->forOwner($request->user()->id)['services'] ?? [])
            ->map(fn (array $service) => ['name' => $service['label_en'] ?? null])
            ->values();

        $portfolio = $selectedProject
            ? [[
                'title' => $selectedProject->title_en,
                'summary' => $selectedProject->summary_en,
                'description' => $selectedProject->description_en,
                'category' => $selectedProject->category,
                'technologies' => $selectedProject->technologies,
            ]]
            : [];

        return [
            'configured_services' => $configuredServices,
            'published_services' => $services,
            'selected_published_portfolio_project' => $portfolio,
        ];
    }
}
