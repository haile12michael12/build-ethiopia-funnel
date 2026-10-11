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
}
