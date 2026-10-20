<?php

namespace App\Services;

use App\Models\FunnelEvent;
use App\Models\FunnelExperiment;
use App\Models\FunnelVariant;
use Illuminate\Support\Collection;

class FunnelExperimentEvaluator
{
    /**
     * @return array{experiment_id: int, status: string, duration_days: int, primary_metric: string, guardrails: array<int, array<string, mixed>>, variants: array<int, array<string, mixed>>, conclusion: string, warnings: array<int, string>}
     */
    public function evaluate(FunnelExperiment $experiment): array
    {
        $end = $experiment->ended_at ?? (($experiment->ends_at && $experiment->ends_at->isPast()) ? $experiment->ends_at : now());
        $events = $experiment->events()
            ->whereBetween('occurred_at', [
                ($experiment->starts_at ?? $experiment->created_at)->toDateTimeString(),
                $end->toDateTimeString(),
            ])
            ->get(['event_type', 'variant_id', 'session_id', 'occurred_at']);
        $variants = FunnelVariant::query()
            ->where('funnel_id', $experiment->funnel_id)
            ->whereIn('id', $experiment->assignedVariantIds())
            ->get()
            ->keyBy('id');
        $groups = collect([['variant_id' => null, 'name' => 'Control', 'weight' => max(0, 100 - collect($experiment->allocations)->sum('weight'))]])
            ->concat(collect($experiment->allocations ?? [])->map(fn (array $allocation) => [
                'variant_id' => (int) $allocation['variant_id'],
                'name' => $variants->get((int) $allocation['variant_id'])?->name ?? 'Removed variant',
                'weight' => (int) $allocation['weight'],
            ]));
        $warnings = [];
        $results = $groups->map(function (array $group) use ($events, $experiment, &$warnings) {
            $variantId = $group['variant_id'];
            $name = $group['name'];
            $groupEvents = $events->filter(fn (FunnelEvent $event) => $event->variant_id === ($variantId === null ? null : (int) $variantId));
            $viewEvents = $groupEvents->where('event_type', 'view');
            $eligibleSessions = $viewEvents->pluck('session_id')->filter()->unique()->values();
            $exposureCount = $viewEvents->count();
            if ($viewEvents->contains(fn (FunnelEvent $event) => $event->session_id === null)) {
                $warnings[] = "{$name} has exposures without session identifiers; those exposures are excluded from session-based rates.";
            }

            $numeratorEvent = match ($experiment->primary_metric) {
                'form_completion_rate' => 'conversion',
                'cta_click_rate' => 'cta_click',
                default => 'conversion',
            };
            $denominatorEvent = $experiment->primary_metric === 'form_completion_rate' ? 'form_start' : 'view';
            $denominatorSessions = $denominatorEvent === 'view'
                ? $eligibleSessions
                : $groupEvents->where('event_type', $denominatorEvent)->pluck('session_id')->filter()->unique()->values();
            $numeratorSessions = $groupEvents
                ->where('event_type', $numeratorEvent)
                ->pluck('session_id')
                ->filter()
                ->unique()
                ->intersect($denominatorSessions)
                ->values();
            $rate = $denominatorSessions->isNotEmpty()
                ? round(($numeratorSessions->count() / $denominatorSessions->count()) * 100, 2)
                : null;

            return [
                'variant_id' => $variantId,
                'name' => $name,
                'allocation_percent' => $group['weight'],
                'eligible_sessions' => $eligibleSessions->count(),
                'exposures' => $exposureCount,
                'numerator' => $numeratorSessions->count(),
                'denominator' => $denominatorSessions->count(),
                'rate' => $rate,
            ];
        })->values();

        $control = $results->firstWhere('variant_id', null);
        $results = $results->map(function (array $result) use ($control) {
            $result['difference_percentage_points'] = $result['variant_id'] === null || $result['rate'] === null || $control['rate'] === null
                ? null
                : round($result['rate'] - $control['rate'], 2);
            $result['sample_sufficient'] = $result['eligible_sessions'] >= 100;

            return $result;
        });
        if ($results->contains(fn (array $result) => ! $result['sample_sufficient']) || $experiment->starts_at?->diffInDays($end) < 7) {
            $warnings[] = 'Evidence is inconclusive until every group has at least 100 identified sessions and the experiment has run for at least seven days.';
        }
        if ($results->contains(fn (array $result) => $result['rate'] === null)) {
            $warnings[] = 'A session-based rate is unavailable for one or more groups because the metric denominator has no identified sessions.';
        }

        return [
            'experiment_id' => $experiment->id,
            'status' => $experiment->status,
            'duration_days' => max(0, (int) ($experiment->starts_at?->diffInDays($end) ?? 0)),
            'primary_metric' => $experiment->primary_metric,
            'guardrails' => collect($experiment->guardrail_metrics ?? [])
                ->map(fn (string $metric) => ['metric' => $metric, 'status' => 'monitoring only'])
                ->values()
                ->all(),
            'variants' => $results->all(),
            'conclusion' => 'inconclusive',
            'warnings' => array_values(array_unique($warnings)),
        ];
    }
}
