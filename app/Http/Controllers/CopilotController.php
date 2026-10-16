<?php

namespace App\Http\Controllers;

use App\Contracts\CopilotAdvisor;
use App\Models\CopilotAudit;
use App\Models\CopilotRecommendation;
use App\Models\Funnel;
use App\Models\FunnelVariant;
use App\Services\FunnelOptimizationEngine;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Throwable;

class CopilotController extends Controller
{
    use AuthorizesRequests;

    public function __construct(
        private readonly FunnelOptimizationEngine $engine,
        private readonly CopilotAdvisor $advisor,
    ) {}

    /**
     * Show the Copilot overview for a funnel.
     */
    public function show(Funnel $funnel)
    {
        $this->authorize('view', $funnel);

        $latestAudit = $funnel->copilotAudits()
            ->where('user_id', auth()->id())
            ->latest()
            ->first();

        $auditHistory = $funnel->copilotAudits()
            ->where('user_id', auth()->id())
            ->latest()
            ->take(20)
            ->get()
            ->map(fn (CopilotAudit $audit) => [
                'id' => $audit->id,
                'status' => $audit->status,
                'date_from' => $audit->date_from,
                'date_to' => $audit->date_to,
                'metrics_summary' => $audit->metrics ? [
                    'views' => $audit->metrics['views'] ?? 0,
                    'conversions' => $audit->metrics['conversions'] ?? 0,
                    'conversion_rate' => $audit->metrics['conversion_rate'] ?? 0,
                ] : null,
                'recommendation_count' => $audit->recommendations ? count($audit->recommendations) : 0,
                'has_ai_advice' => ! empty($audit->ai_advice),
                'created_at' => $audit->created_at?->toISOString(),
                'completed_at' => $audit->completed_at?->toISOString(),
            ]);

        $funnel->load(['variants' => fn ($query) => $query->withCount([
            'events as views_count' => fn ($events) => $events->where('event_type', 'view'),
            'events as conversions_count' => fn ($events) => $events->where('event_type', 'conversion'),
        ])->orderBy('id')]);

        $recommendationHistory = $funnel->copilotRecommendations()
            ->where('user_id', auth()->id())
            ->latest()
            ->take(100)
            ->get()
            ->map(fn (CopilotRecommendation $recommendation) => $recommendation->toCopilotArray());

        return Inertia::render('copilot', [
            'funnel' => [
                'id' => $funnel->id,
                'name' => $funnel->name,
                'slug' => $funnel->slug,
                'status' => $funnel->status,
                'is_published' => $funnel->is_published,
                'views' => $funnel->views,
                'conversions' => $funnel->conversions,
                'conversion_rate' => $funnel->conversion_rate,
                'revision' => $funnel->revision,
                'variants' => $funnel->variants->map(fn ($v) => [
                    'id' => $v->id,
                    'name' => $v->name,
                    'weight' => $v->weight,
                    'is_active' => $v->is_active,
                    'views' => $v->views_count,
                    'conversions' => $v->conversions_count,
                ]),
            ],
            'latestAudit' => $latestAudit ? $this->serializeAudit($latestAudit) : null,
            'auditHistory' => $auditHistory,
            'recommendationHistory' => $recommendationHistory,
        ]);
    }

    /**
     * Run a new Copilot audit.
     */
    public function store(Request $request, Funnel $funnel): JsonResponse
    {
        $this->authorize('view', $funnel);

        $validated = $request->validate([
            'date_from' => ['required', 'date_format:Y-m-d'],
            'date_to' => ['required', 'date_format:Y-m-d', 'after_or_equal:date_from'],
            'include_ai' => ['sometimes', 'boolean'],
        ]);

        // Limit date range to 90 days
        $from = $validated['date_from'];
        $to = $validated['date_to'];
        $daysDiff = (int) abs(strtotime($to) - strtotime($from)) / 86400;
        if ($daysDiff > 90) {
            return response()->json(['message' => 'Date range cannot exceed 90 days.'], 422);
        }

        // Rate limit: max 10 audits per funnel per hour
        $recentCount = CopilotAudit::query()
            ->where('user_id', auth()->id())
            ->where('funnel_id', $funnel->id)
            ->where('created_at', '>=', now()->subHour())
            ->count();

        if ($recentCount >= 10) {
            return response()->json(['message' => 'Too many audit requests. Please wait before running another.'], 429);
        }

        $audit = CopilotAudit::create([
            'user_id' => auth()->id(),
            'funnel_id' => $funnel->id,
            'status' => 'running',
            'funnel_revision' => $funnel->revision,
            'content_snapshot' => $funnel->content,
            'date_from' => $from,
            'date_to' => $to,
        ]);

        try {
            $result = $this->engine->analyze($funnel, $from, $to);
            $metrics = $result['metrics'];
            $recommendations = $result['recommendations'];

            $aiAdvice = null;
            $aiError = null;
            if (($validated['include_ai'] ?? false)) {
                try {
                    $language = session('locale', config('app.locale', 'en'));
                    $aiAdvice = $this->advisor->advise([
                        'content' => $funnel->content ?? [],
                        'metrics' => $metrics,
                        'findings' => $recommendations,
                        'language' => $language,
                    ]);
                    $audit->update([
                        'ai_provider' => config('funnel-ai.driver'),
                        'ai_model' => config('funnel-ai.model'),
                    ]);
                } catch (Throwable $exception) {
                    $aiError = 'AI advice is unavailable for this analysis. Deterministic recommendations are still available.';
                    Log::warning('Copilot advisor failed; completing audit without AI advice.', [
                        'funnel_id' => $funnel->id,
                        'exception' => $exception,
                    ]);
                }
            }

            DB::transaction(function () use ($audit, $funnel, $metrics, $recommendations, $aiAdvice, $aiError): void {
                $savedRecommendations = [];

                foreach ($recommendations as $recommendation) {
                    $fingerprint = hash('sha256', $funnel->id.':'.$recommendation['key']);
                    $saved = CopilotRecommendation::query()->firstOrNew([
                        'pending_fingerprint' => $fingerprint,
                    ]);
                    $saved->fill([
                        'user_id' => $funnel->user_id,
                        'funnel_id' => $funnel->id,
                        'audit_id' => $audit->id,
                        'key' => $recommendation['key'],
                        'title' => $recommendation['title'],
                        'category' => $recommendation['category'],
                        'evidence_type' => $recommendation['evidence_type'],
                        'evidence' => $recommendation['evidence'],
                        'explanation' => $recommendation['explanation'],
                        'suggested_action' => $recommendation['suggested_action'],
                        'expected_outcome' => $recommendation['expected_outcome'],
                        'hypothesis' => $recommendation['hypothesis'],
                        'priority' => $recommendation['priority'],
                        'confidence_score' => $recommendation['confidence_score'],
                        'confidence_explanation' => $recommendation['confidence_explanation'],
                        'confidence' => $recommendation['confidence'],
                        'effort' => $recommendation['effort'],
                        'supporting_metrics' => $recommendation['supporting_metrics'],
                        'status' => 'pending',
                        'pending_fingerprint' => $fingerprint,
                    ]);
                    $saved->save();
                    $savedRecommendations[] = $saved->fresh()->toCopilotArray();
                }

                $audit->update(['ai_error' => $aiError]);
                $audit->markCompleted($metrics, $savedRecommendations, $aiAdvice);
            });
        } catch (\Throwable $e) {
            report($e);
            $audit->markFailed('Audit analysis failed. Please try again.');

            return response()->json([
                'message' => 'Audit analysis failed.',
                'audit' => $this->serializeAudit($audit->fresh()),
            ], 500);
        }

        return response()->json([
            'audit' => $this->serializeAudit($audit->fresh()),
        ]);
    }

    /**
     * Show a specific audit run.
     */
    public function showAudit(Funnel $funnel, CopilotAudit $audit): JsonResponse
    {
        $this->authorize('view', $funnel);
        abort_unless($audit->funnel_id === $funnel->id && $audit->user_id === auth()->id(), 404);

        return response()->json([
            'audit' => $this->serializeAudit($audit),
        ]);
    }

    public function acceptRecommendation(Funnel $funnel, CopilotRecommendation $recommendation): JsonResponse
    {
        return $this->changeRecommendationStatus($funnel, $recommendation, 'accepted');
    }

    public function dismissRecommendation(Funnel $funnel, CopilotRecommendation $recommendation): JsonResponse
    {
        return $this->changeRecommendationStatus($funnel, $recommendation, 'dismissed');
    }

    public function createDraftExperiment(Funnel $funnel, CopilotRecommendation $recommendation): JsonResponse
    {
        $this->authorize('update', $funnel);
        abort_unless($recommendation->funnel_id === $funnel->id && $recommendation->user_id === auth()->id(), 404);
        abort_unless($recommendation->status === 'accepted', 409, 'Accept this recommendation before creating an experiment.');

        $variant = DB::transaction(function () use ($funnel, $recommendation): FunnelVariant {
            $existing = $funnel->variants()->get()->first(fn (FunnelVariant $variant) => (int) data_get($variant->settings, 'copilot_experiment.recommendation_id') === $recommendation->id);
            if ($existing) {
                return $existing;
            }

            $settings = $funnel->settings ?? [];
            $settings['copilot_experiment'] = [
                'recommendation_id' => $recommendation->id,
                'hypothesis' => $recommendation->hypothesis,
                'primary_metric' => 'conversion_rate',
                'status' => 'draft',
                'approval_required_to_activate' => true,
            ];

            return $funnel->variants()->create([
                'name' => Str::limit('Copilot: '.$recommendation->title, 100, ''),
                'weight' => 50,
                'content' => $funnel->content ?? ['sections' => []],
                'settings' => $settings,
                'is_active' => false,
            ]);
        });

        return response()->json([
            'variant' => [
                'id' => $variant->id,
                'name' => $variant->name,
                'is_active' => $variant->is_active,
                'status' => data_get($variant->settings, 'copilot_experiment.status', 'draft'),
                'editor_url' => route('funnel-editor.edit', $funnel),
            ],
        ], 201);
    }

    private function changeRecommendationStatus(
        Funnel $funnel,
        CopilotRecommendation $recommendation,
        string $status,
    ): JsonResponse {
        $this->authorize('update', $funnel);
        abort_unless($recommendation->funnel_id === $funnel->id && $recommendation->user_id === auth()->id(), 404);

        if ($recommendation->status !== 'pending') {
            return response()->json(['message' => 'This recommendation has already been reviewed.'], 409);
        }

        $recommendation->update([
            'status' => $status,
            'pending_fingerprint' => null,
            'accepted_at' => $status === 'accepted' ? now() : null,
            'dismissed_at' => $status === 'dismissed' ? now() : null,
        ]);

        return response()->json(['recommendation' => $recommendation->fresh()->toCopilotArray()]);
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeAudit(CopilotAudit $audit): array
    {
        $recommendations = $audit->recommendations ?? [];
        $savedRecommendations = CopilotRecommendation::query()
            ->whereIn('id', collect($recommendations)->pluck('id')->filter())
            ->get()
            ->keyBy('id');
        $recommendations = collect($recommendations)->map(function (array $recommendation) use ($savedRecommendations) {
            $saved = $savedRecommendations->get($recommendation['id'] ?? null);

            return $saved ? $saved->toCopilotArray() : $recommendation;
        })->all();

        return [
            'id' => $audit->id,
            'funnel_id' => $audit->funnel_id,
            'status' => $audit->status,
            'funnel_revision' => $audit->funnel_revision,
            'date_from' => $audit->date_from,
            'date_to' => $audit->date_to,
            'metrics' => $audit->metrics,
            'recommendations' => $recommendations,
            'ai_advice' => $audit->ai_advice,
            'ai_provider' => $audit->ai_provider,
            'ai_model' => $audit->ai_model,
            'ai_error' => $audit->ai_error,
            'error_message' => $audit->error_message,
            'has_ai_advice' => ! empty($audit->ai_advice),
            'created_at' => $audit->created_at?->toISOString(),
            'completed_at' => $audit->completed_at?->toISOString(),
        ];
    }
}
