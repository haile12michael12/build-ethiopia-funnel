<?php

namespace App\Http\Controllers;

use App\Contracts\CopilotAdvisor;
use App\Models\CopilotAudit;
use App\Models\Funnel;
use App\Services\FunnelOptimizationEngine;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use RuntimeException;

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
                } catch (RuntimeException) {
                    // AI is optional — deterministic results remain available
                }
            }

            $audit->markCompleted($metrics, $recommendations, $aiAdvice);
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

    /**
     * @return array<string, mixed>
     */
    private function serializeAudit(CopilotAudit $audit): array
    {
        return [
            'id' => $audit->id,
            'funnel_id' => $audit->funnel_id,
            'status' => $audit->status,
            'funnel_revision' => $audit->funnel_revision,
            'date_from' => $audit->date_from,
            'date_to' => $audit->date_to,
            'metrics' => $audit->metrics,
            'recommendations' => $audit->recommendations,
            'ai_advice' => $audit->ai_advice,
            'ai_provider' => $audit->ai_provider,
            'ai_model' => $audit->ai_model,
            'error_message' => $audit->error_message,
            'has_ai_advice' => ! empty($audit->ai_advice),
            'created_at' => $audit->created_at?->toISOString(),
            'completed_at' => $audit->completed_at?->toISOString(),
        ];
    }
}

