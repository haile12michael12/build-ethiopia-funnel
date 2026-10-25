<?php

namespace App\Services;

class AuditReportService
{
    /**
     * Automated suggestions only: nothing here claims a website was inspected.
     * Product recommendations come from live published catalog records.
     *
     * @param  array<string, mixed>  $audit
     * @param  array<string, int>  $breakdown
     * @param  list<array<string, mixed>>  $products
     * @return array{score: int, label: string, summary: string, breakdown: array<string, int>, recommendations: list<string>, products: list<array<string, mixed>>}
     */
    public function create(array $audit, int $score, array $breakdown, array $products = []): array
    {
        $recommendations = [];

        if (($audit['website_status'] ?? null) === 'no_website') {
            $recommendations[] = 'Create a fast, mobile-friendly website with a clear contact or booking action.';
        } elseif (($audit['website_status'] ?? null) === 'needs_improvement') {
            $recommendations[] = 'Review your website messaging, mobile experience, and conversion path.';
        } else {
            $recommendations[] = 'Track website enquiries so you can identify which pages and channels convert best.';
        }

        if (empty($audit['service_interests'])) {
            $recommendations[] = 'Choose one priority growth service to focus your next improvement sprint.';
        } else {
            $serviceLabels = collect(config('business-audit.options.services'))
                ->filter(fn (array $service): bool => in_array($service['value'], $audit['service_interests'], true))
                ->pluck('label')
                ->values()
                ->all();
            $recommendations[] = 'Prioritize '.(empty($serviceLabels) ? implode(', ', $audit['service_interests']) : implode(', ', $serviceLabels)).' and define a measurable outcome.';
        }

        if (($audit['timeline'] ?? null) === 'researching') {
            $recommendations[] = 'Set a target launch date and break the work into a small first milestone.';
        } else {
            $recommendations[] = 'Prepare a short brief and align the decision-makers before starting the project.';
        }

        [$label, $summary] = match (true) {
            $score >= 70 => ['Ready to grow', 'Your answers show a clear investment window and a defined growth direction.'],
            $score >= 40 => ['Growth opportunity', 'You have a promising starting point; a focused plan can improve readiness.'],
            default => ['Early-stage planning', 'A few foundational decisions can help clarify the best next step.'],
        };

        return [
            'score' => $score,
            'label' => $label,
            'summary' => $summary,
            'breakdown' => $breakdown,
            'recommendations' => $recommendations,
            'products' => $products,
        ];
    }
}
