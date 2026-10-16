<?php

namespace App\Services;

class LeadScoringService
{
    /**
     * @param  array<string, mixed>  $audit
     * @return array{score: int, breakdown: array<string, int>}
     */
    public function score(array $audit): array
    {
        $breakdown = [
            'business_profile' => filled($audit['business_name'] ?? null) ? 10 : 0,
            'website_readiness' => match ($audit['website_status'] ?? null) {
                'needs_improvement' => 20,
                'no_website' => 15,
                'live' => 10,
                default => 0,
            },
            'service_interest' => count($audit['service_interests'] ?? []) > 0 ? 10 : 0,
            'budget' => match ($audit['budget'] ?? null) {
                'under_25000' => 5,
                '25000_100000' => 15,
                '100000_500000' => 25,
                'over_500000' => 30,
                default => 0,
            },
            'timeline' => match ($audit['timeline'] ?? null) {
                'within_1_month' => 25,
                '1_to_3_months' => 20,
                '3_to_6_months' => 10,
                'researching' => 5,
                default => 0,
            },
        ];

        return [
            'score' => min(100, array_sum($breakdown)),
            'breakdown' => $breakdown,
        ];
    }

    /**
     * Score only voluntarily provided project details. Market and personal identity are not scoring signals.
     *
     * @param  array<string, mixed>  $project
     * @param  array<string, mixed>  $settings
     * @return array{score: int, breakdown: array<string, int>, reasons: array<int, array{key: string, points: int, reason: string}>}
     */
    public function scoreClientProject(array $project, array $settings): array
    {
        $weights = $settings['scoring_weights'];
        $services = collect($settings['services']);
        $selectedServices = collect($project['service_interests'] ?? []);
        $budget = collect($settings['budgets'])->firstWhere('key', $project['budget'] ?? null);
        $timeline = collect($settings['timelines'])->firstWhere('key', $project['timeline'] ?? null);
        $descriptionLength = mb_strlen(trim((string) ($project['project_description'] ?? '')));

        $breakdown = [
            'service_fit' => $selectedServices->isNotEmpty() ? (int) $weights['service_fit'] : 0,
            'project_clarity' => $descriptionLength >= 100
                ? (int) $weights['project_clarity']
                : ($descriptionLength >= 30 ? (int) floor($weights['project_clarity'] / 2) : 0),
            'budget' => min((int) $weights['budget'], max(0, (int) ($budget['score'] ?? 0))),
            'timeline' => min((int) $weights['timeline'], max(0, (int) ($timeline['score'] ?? 0))),
            'consultation' => $selectedServices->contains('consultation') ? (int) $weights['consultation'] : 0,
        ];

        $selectedLabels = $services
            ->filter(fn (array $service) => $selectedServices->contains($service['key']))
            ->pluck('label_en')
            ->implode(', ');
        $reasons = [
            [
                'key' => 'service_fit',
                'points' => $breakdown['service_fit'],
                'reason' => $breakdown['service_fit'] > 0
                    ? "Selected service area(s): {$selectedLabels}."
                    : 'No service area was selected.',
            ],
            [
                'key' => 'project_clarity',
                'points' => $breakdown['project_clarity'],
                'reason' => $descriptionLength >= 100
                    ? 'The project description includes at least 100 characters of detail.'
                    : ($descriptionLength >= 30
                        ? 'The project description meets the minimum detail threshold.'
                        : 'The project description needs more detail.'),
            ],
            [
                'key' => 'budget',
                'points' => $breakdown['budget'],
                'reason' => isset($budget['label_en'])
                    ? "Visitor-selected budget range: {$budget['label_en']}. This is a prioritization signal, not a quoted price."
                    : 'No valid budget range was selected.',
            ],
            [
                'key' => 'timeline',
                'points' => $breakdown['timeline'],
                'reason' => isset($timeline['label_en'])
                    ? "Visitor-selected timeline: {$timeline['label_en']}."
                    : 'No valid project timeline was selected.',
            ],
            [
                'key' => 'consultation',
                'points' => $breakdown['consultation'],
                'reason' => $breakdown['consultation'] > 0
                    ? 'The visitor selected the consultation or custom-project option.'
                    : 'The visitor did not select the consultation or custom-project option.',
            ],
        ];

        return [
            'score' => min(100, array_sum($breakdown)),
            'breakdown' => $breakdown,
            'reasons' => $reasons,
        ];
    }
}
