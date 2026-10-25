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
                // ETB bands and equivalent USD bands carry the same prioritization weight.
                // Currencies are never converted; each band is scored only for its own market.
                'under_25000', 'usd_under_250' => 5,
                '25000_100000', 'usd_250_1000' => 15,
                '100000_500000', 'usd_1000_5000' => 25,
                'over_500000', 'usd_over_5000' => 30,
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
        $weights = array_replace([
            'service_fit' => 25,
            'project_clarity' => 15,
            'budget' => 25,
            'timeline' => 15,
            'scope_completeness' => 10,
            'contact_completeness' => 10,
        ], $settings['scoring_weights'] ?? []);
        $services = collect($settings['services']);
        $selectedServices = collect($project['service_interests'] ?? []);
        $expectedCurrency = ($project['market'] ?? null) === 'ethiopia' ? 'ETB' : 'USD';
        $budget = collect($settings['budgets'] ?? [])->first(
            fn (array $option): bool => ($option['key'] ?? null) === ($project['budget'] ?? null)
                && ($option['currency'] ?? null) === $expectedCurrency
                && ($project['budget_currency'] ?? $expectedCurrency) === $expectedCurrency,
        );
        $timeline = collect($settings['timelines'])->firstWhere('key', $project['timeline'] ?? null);
        $descriptionLength = mb_strlen(trim((string) ($project['project_description'] ?? '')));
        $requirementsLength = mb_strlen(trim((string) ($project['additional_requirements'] ?? '')));

        $selectedLabels = $services
            ->filter(fn (array $service) => $selectedServices->contains($service['key']))
            ->pluck('label_en')
            ->implode(', ');
        $matchedServiceCount = $services
            ->filter(fn (array $service) => $selectedServices->contains($service['key']))
            ->count();
        $contactPoints = (filled($project['name'] ?? null) ? 3 : 0)
            + (filter_var($project['email'] ?? null, FILTER_VALIDATE_EMAIL) ? 4 : 0)
            + (filled($project['phone'] ?? null) ? 3 : 0);

        $breakdown = [
            'service_fit' => $matchedServiceCount > 0 ? min(25, (int) $weights['service_fit']) : 0,
            'project_clarity' => min(15, $descriptionLength >= 100
                ? (int) $weights['project_clarity']
                : ($descriptionLength >= 30 ? (int) floor($weights['project_clarity'] / 2) : 0)),
            'budget' => min((int) $weights['budget'], max(0, (int) ($budget['score'] ?? 0))),
            'timeline' => min(15, (int) $weights['timeline'], max(0, (int) ($timeline['score'] ?? 0))),
            'scope_completeness' => min(10, $requirementsLength >= 100
                ? (int) $weights['scope_completeness']
                : ($requirementsLength > 0 ? (int) floor($weights['scope_completeness'] / 2) : 0)),
            'contact_completeness' => min(10, (int) $weights['contact_completeness'], $contactPoints),
        ];

        $reasons = [
            [
                'key' => 'service_fit',
                'points' => $breakdown['service_fit'],
                'reason' => $breakdown['service_fit'] > 0
                    ? "Selected service area(s): {$selectedLabels}."
                    : 'No recognized service area was selected; no service points were awarded.',
            ],
            [
                'key' => 'project_clarity',
                'points' => $breakdown['project_clarity'],
                'reason' => $descriptionLength >= 100
                    ? "The project description has {$descriptionLength} characters and meets the full-detail threshold."
                    : ($descriptionLength >= 30
                        ? "The project description has {$descriptionLength} characters and meets the partial-detail threshold."
                        : "The project description has {$descriptionLength} characters; at least 30 are needed for clarity points."),
            ],
            [
                'key' => 'budget',
                'points' => $breakdown['budget'],
                'reason' => isset($budget['label_en'])
                    ? "Visitor-selected {$expectedCurrency} range: {$budget['label_en']}. This is a prioritization signal, not a quoted price."
                    : "No valid {$expectedCurrency} budget range was available; budget is treated as unknown and currencies are never converted.",
            ],
            [
                'key' => 'timeline',
                'points' => $breakdown['timeline'],
                'reason' => isset($timeline['label_en'])
                    ? "Visitor-selected timeline: {$timeline['label_en']}."
                    : 'No valid project timeline was selected; no timeline points were awarded.',
            ],
            [
                'key' => 'scope_completeness',
                'points' => $breakdown['scope_completeness'],
                'reason' => $requirementsLength >= 100
                    ? "Additional requirements include {$requirementsLength} characters of scope detail."
                    : ($requirementsLength > 0
                        ? 'Some additional requirements were provided; more scope detail could improve completeness.'
                        : 'No additional scope requirements were provided.'),
            ],
            [
                'key' => 'contact_completeness',
                'points' => $breakdown['contact_completeness'],
                'reason' => 'Contact completeness awards up to 3 points for a name, 4 for a valid email, and 3 for a phone number.',
            ],
        ];

        return [
            'score' => min(100, array_sum($breakdown)),
            'breakdown' => $breakdown,
            'reasons' => $reasons,
        ];
    }
}
