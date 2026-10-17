<?php

namespace App\Jobs;

use App\Contracts\CopilotAdvisor;
use App\Models\DeveloperAiRecommendation;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Throwable;

class GenerateDeveloperAiRecommendations implements ShouldQueue
{
    use Queueable;

    public int $tries = 1;

    public function __construct(public int $recommendationId) {}

    public function handle(CopilotAdvisor $advisor): void
    {
        $recommendation = DeveloperAiRecommendation::query()->find($this->recommendationId);
        if (! $recommendation || $recommendation->status !== 'queued') {
            return;
        }

        $recommendation->update(['status' => 'processing']);
        $context = $recommendation->context_snapshot;
        $findings = collect($context['score_reasons'] ?? [])
            ->map(fn (array $reason, int $index) => [
                'key' => 'lead-signal-'.$index,
                'title' => 'Observed lead signal',
                'category' => 'audience_fit',
                'evidence_type' => 'lead_profile',
                'evidence' => $reason['reason'] ?? 'Lead scoring signal',
                'explanation' => $reason['reason'] ?? 'Observed from the submitted developer profile.',
                'suggested_action' => 'Use this signal to tailor the next educational or product step.',
                'expected_outcome' => 'A more relevant developer journey.',
                'hypothesis' => 'A more specific next step may improve relevance.',
                'priority' => 'medium',
                'confidence_score' => 50,
                'confidence_explanation' => 'Based on the submitted profile and tracked interactions only.',
                'confidence' => 'medium',
                'effort' => 'low',
                'supporting_metrics' => [],
            ])->values()->all();

        try {
            $result = $advisor->advise([
                'content' => ['sections' => []],
                'metrics' => [
                    'lead_score' => (int) ($context['lead_score'] ?? 0),
                    'quiz_answers' => $context['quiz_answers'] ?? [],
                    'developer_profile' => $context['developer_profile'] ?? null,
                    'business_audit' => $context['business_audit'] ?? [],
                ],
                'findings' => $findings,
                'language' => 'en',
            ]);

            $recommendation->update([
                'status' => 'pending_review',
                'recommendations' => $result,
                'completed_at' => now(),
            ]);
        } catch (Throwable $exception) {
            Log::warning('Developer AI recommendation generation failed.', [
                'recommendation_id' => $recommendation->id,
                'exception' => $exception,
            ]);
            $recommendation->update([
                'status' => 'failed',
                'error_message' => 'AI recommendations could not be generated. Please try again later.',
                'completed_at' => now(),
            ]);
        }
    }
}
