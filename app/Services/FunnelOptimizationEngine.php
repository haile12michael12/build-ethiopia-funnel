<?php

namespace App\Services;

use App\Models\Funnel;
use App\Models\FunnelEvent;
use Illuminate\Support\Collection;

class FunnelOptimizationEngine
{
    /** @var array<string, float> */
    private array $thresholds = [
        'low_ctr' => 2.0,             // % — CTA click-through rate below this triggers recommendation
        'low_conversion' => 1.0,      // % — conversion rate below this triggers recommendation
        'min_sample_size' => 30,       // minimum views before metrics are considered reliable
        'form_friction_fields' => 5,   // more than this many fields triggers friction warning
        'min_experiment_sample' => 100, // minimum views per variant before comparing
    ];

    /**
     * @param  array<string, float>  $overrides
     */
    public function withThresholds(array $overrides): static
    {
        $clone = clone $this;
        $clone->thresholds = array_merge($clone->thresholds, $overrides);

        return $clone;
    }

    /**
     * Run a deterministic analysis on funnel content and analytics.
     *
     * @return array{metrics: array<string, mixed>, recommendations: array<int, array<string, mixed>>}
     */
    public function analyze(Funnel $funnel, string $dateFrom, string $dateTo): array
    {
        $metrics = $this->computeMetrics($funnel, $dateFrom, $dateTo);
        $contentFindings = $this->analyzeContent($funnel->content ?? []);
        $analyticsFindings = $this->analyzeMetrics($metrics);
        [$variantFindings, $metrics] = $this->analyzeVariants($funnel, $dateFrom, $dateTo, $metrics);

        $recommendations = collect()
            ->merge($contentFindings)
            ->merge($analyticsFindings)
            ->merge($variantFindings)
            ->map(fn (array $finding) => [
                ...$finding,
                'recommendation_type' => $finding['category'],
                'evidence_type' => str_starts_with($finding['key'], 'variant_') || in_array($finding['category'], ['performance', 'conversion_tracking', 'experiment_opportunities'], true)
                    ? 'measured'
                    : 'content_review',
                'supporting_metrics' => $this->supportingMetrics($finding['key'], $metrics),
            ])
            ->sortByDesc('priority')
            ->values()
            ->all();

        return [
            'metrics' => $metrics,
            'recommendations' => $recommendations,
        ];
    }

    /**
     * Compute analytics metrics from FunnelEvent records.
     *
     * @return array<string, mixed>
     */
    public function computeMetrics(Funnel $funnel, string $dateFrom, string $dateTo): array
    {
        $events = FunnelEvent::query()
            ->where('funnel_id', $funnel->id)
            ->whereBetween('occurred_at', [$dateFrom.' 00:00:00', $dateTo.' 23:59:59'])
            ->get(['event_type', 'session_id', 'form_id', 'variant_id', 'metadata', 'attribution', 'occurred_at']);

        $views = $events->where('event_type', 'view')->count();
        $uniqueSessions = $events->where('event_type', 'view')->whereNotNull('session_id')->pluck('session_id')->unique()->count();
        $ctaClicks = $events->where('event_type', 'cta_click')->count();
        $formStarts = $events->where('event_type', 'form_start')->count();
        $conversions = $events->where('event_type', 'conversion')->count();

        $conversionRate = $views > 0 ? round(($conversions / $views) * 100, 2) : 0.0;
        $ctaClickRate = $views > 0 ? round(($ctaClicks / $views) * 100, 2) : 0.0;
        $formCompletionRate = $formStarts > 0 ? round(($conversions / $formStarts) * 100, 2) : 0.0;
        $dataWarnings = [];
        if ($conversions > $views) {
            $dataWarnings[] = 'Conversion events exceed view events in this period.';
        }
        if ($ctaClicks > $views) {
            $dataWarnings[] = 'CTA click events exceed view events in this period.';
        }
        if ($formStarts > $views) {
            $dataWarnings[] = 'Form starts exceed view events in this period.';
        }
        if ($formStarts > 0 && $conversions > $formStarts) {
            $dataWarnings[] = 'Conversion events exceed form starts in this period.';
        }

        // Daily breakdown
        $daily = $events->groupBy(fn (FunnelEvent $e) => $e->occurred_at->toDateString())
            ->map(fn (Collection $dayEvents, string $date) => [
                'date' => $date,
                'views' => $dayEvents->where('event_type', 'view')->count(),
                'cta_clicks' => $dayEvents->where('event_type', 'cta_click')->count(),
                'conversions' => $dayEvents->where('event_type', 'conversion')->count(),
            ])
            ->sortKeys()
            ->values()
            ->all();
        $stepCounts = $events
            ->where('event_type', 'form_step')
            ->filter(fn (FunnelEvent $event) => ctype_digit((string) data_get($event->metadata, 'step')))
            ->groupBy(fn (FunnelEvent $event) => ($event->form_id ?? 'unknown').':'.(int) data_get($event->metadata, 'step'))
            ->map(function (Collection $stepEvents, string $key) {
                [$formId, $step] = explode(':', $key, 2);
                $sessions = $stepEvents->whereNotNull('session_id')->pluck('session_id')->unique()->count();

                return [
                    'form_id' => $formId,
                    'step' => (int) $step,
                    'sessions' => $sessions > 0 ? $sessions : $stepEvents->count(),
                ];
            })
            ->values();
        $formSteps = $stepCounts->groupBy('form_id')->flatMap(function (Collection $formStepCounts, string $formId) use (&$dataWarnings) {
            $steps = $formStepCounts->keyBy('step')->sortKeys();

            return $steps->map(function (array $step, int $stepNumber) use ($steps, $formId, &$dataWarnings) {
                $nextCount = $steps->get($stepNumber + 1)['sessions'] ?? null;
                if ($nextCount !== null && $nextCount > $step['sessions']) {
                    $dataWarnings[] = "Form {$formId} has more sessions at step ".($stepNumber + 1).' than at step '.$stepNumber.'.';
                }

                return [
                    'form_id' => $formId,
                    'step' => $stepNumber,
                    'sessions' => $step['sessions'],
                    'next_step_sessions' => $nextCount,
                    'drop_offs' => $nextCount === null ? null : max(0, $step['sessions'] - $nextCount),
                ];
            })->values();
        })->values()->all();

        return [
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
            'views' => $views,
            'unique_sessions' => $uniqueSessions,
            'cta_clicks' => $ctaClicks,
            'form_starts' => $formStarts,
            'conversions' => $conversions,
            'conversion_rate' => $conversionRate,
            'cta_click_rate' => $ctaClickRate,
            'form_completion_rate' => $formCompletionRate,
            'daily' => $daily,
            'form_steps' => $formSteps,
            'traffic_sources' => $this->breakdownBy($events, 'source'),
            'devices' => $this->breakdownBy($events, 'device'),
            'data_warnings' => array_values(array_unique($dataWarnings)),
            'sample_size_sufficient' => $views >= $this->thresholds['min_sample_size'],
            'data_quality' => $dataWarnings !== []
                ? 'inconsistent'
                : $this->assessDataQuality($views, $uniqueSessions, $ctaClicks, $formStarts, $conversions),
        ];
    }

    /**
     * @return array<int, array{label: string, views: int, conversions: int, conversion_rate: float}>
     */
    private function breakdownBy(Collection $events, string $dimension): array
    {
        return $events
            ->filter(fn (FunnelEvent $event) => in_array($event->event_type, ['view', 'conversion'], true))
            ->groupBy(function (FunnelEvent $event) use ($dimension) {
                $value = $dimension === 'source'
                    ? data_get($event->attribution, 'utm_source')
                    : (data_get($event->metadata, 'device') ?? data_get($event->attribution, 'device'));

                return is_string($value) && trim($value) !== '' ? mb_substr(trim($value), 0, 100) : 'unknown';
            })
            ->map(function (Collection $dimensionEvents, string $label) {
                $views = $dimensionEvents->where('event_type', 'view')->count();
                $conversions = $dimensionEvents->where('event_type', 'conversion')->count();

                return [
                    'label' => $label,
                    'views' => $views,
                    'conversions' => $conversions,
                    'conversion_rate' => $views > 0 ? round(($conversions / $views) * 100, 2) : 0.0,
                ];
            })
            ->sortByDesc('views')
            ->values()
            ->all();
    }

    /**
     * @return array<string, int|float|string|null>
     */
    private function supportingMetrics(string $key, array $metrics): array
    {
        return match ($key) {
            'low_conversion_rate', 'no_conversions' => [
                'views' => $metrics['views'],
                'conversions' => $metrics['conversions'],
                'conversion_rate' => $metrics['conversion_rate'],
            ],
            'low_cta_ctr', 'no_cta_clicks' => [
                'views' => $metrics['views'],
                'cta_clicks' => $metrics['cta_clicks'],
                'cta_click_rate' => $metrics['cta_click_rate'],
            ],
            'high_form_abandonment' => [
                'form_starts' => $metrics['form_starts'],
                'conversions' => $metrics['conversions'],
                'form_completion_rate' => $metrics['form_completion_rate'],
            ],
            'low_sample_size' => ['views' => $metrics['views']],
            default => [],
        };
    }

    /**
     * Analyze the funnel content structure.
     *
     * @return array<int, array<string, mixed>>
     */
    private function analyzeContent(array $content): array
    {
        $findings = [];
        $sections = $content['sections'] ?? [];

        if (empty($sections)) {
            $findings[] = $this->finding(
                'empty_funnel',
                'Empty Funnel',
                'content_clarity',
                'The funnel has no content sections.',
                'An empty funnel cannot convert visitors. Add at least a hero section with a headline, value proposition, and call-to-action.',
                'Add content sections with a clear headline and CTA.',
                100,
                'high',
                'low',
            );

            return $findings;
        }

        $allBlocks = $this->extractBlocks($sections);
        $blockTypes = $allBlocks->pluck('type');

        // Check for headline presence
        $hasHeadline = $allBlocks->contains(function (array $block) {
            if ($block['type'] !== 'text') {
                return false;
            }
            $html = $block['content']['html'] ?? $block['content']['text'] ?? '';

            return (bool) preg_match('/<h[12][^>]*>/i', (string) $html);
        });

        if (! $hasHeadline) {
            $findings[] = $this->finding(
                'missing_headline',
                'Missing Headline',
                'content_clarity',
                'No H1 or H2 heading was found in the funnel content.',
                'A clear headline is critical for immediately communicating your value proposition. Visitors decide within seconds whether to stay or leave.',
                'Add a prominent headline in the first section that clearly states the main benefit.',
                90,
                'high',
                'low',
            );
        }

        // Check for CTA presence
        $hasCta = $blockTypes->contains('button');
        if (! $hasCta) {
            $findings[] = $this->finding(
                'missing_cta',
                'Missing Call-to-Action',
                'cta_optimization',
                'No button block was found in the funnel.',
                'Without a clear call-to-action, visitors have no obvious next step. CTAs guide users toward conversion.',
                'Add at least one prominent button with clear action text (e.g., "Get Started", "Request Demo").',
                95,
                'high',
                'low',
            );
        }

        // Check for form presence
        $hasForm = $blockTypes->contains('form');
        if (! $hasForm) {
            $findings[] = $this->finding(
                'missing_form',
                'No Lead Capture Form',
                'form_friction',
                'No form block was found in the funnel.',
                'Without a lead capture form, the funnel cannot collect visitor information for follow-up.',
                'Add a form with at minimum an email field to capture leads.',
                85,
                'high',
                'low',
            );
        }

        // Check form friction
        $formBlocks = $allBlocks->where('type', 'form');
        foreach ($formBlocks as $formBlock) {
            $fields = $formBlock['content']['fields'] ?? [];
            $fieldCount = count($fields);
            if ($fieldCount > $this->thresholds['form_friction_fields']) {
                $findings[] = $this->finding(
                    'form_friction_fields',
                    'High Form Friction',
                    'form_friction',
                    "A form has {$fieldCount} fields, which exceeds the recommended maximum of {$this->thresholds['form_friction_fields']}.",
                    'Each additional form field reduces completion rates. Only ask for information you truly need at this stage.',
                    'Reduce form fields to the essentials (name, email). Collect additional information after initial conversion.',
                    70,
                    'medium',
                    'low',
                );
            }

            // Check for missing required email field
            $hasEmailField = collect($fields)->contains(fn ($field) => ($field['type'] ?? '') === 'email');
            if (! $hasEmailField && ! empty($fields)) {
                $findings[] = $this->finding(
                    'form_missing_email',
                    'Form Missing Email Field',
                    'form_friction',
                    'A form was found but it does not include an email field.',
                    'Email is typically the minimum viable contact field for lead capture and follow-up communications.',
                    'Add a required email field to your form.',
                    75,
                    'medium',
                    'low',
                );
            }
        }

        // Check for trust signals
        $hasTrustSignals = $blockTypes->contains('testimonial');
        if (! $hasTrustSignals && $allBlocks->count() > 3) {
            $findings[] = $this->finding(
                'missing_trust_signals',
                'No Trust Signals',
                'trust_credibility',
                'No testimonial blocks were found in the funnel.',
                'Testimonials and social proof help overcome visitor skepticism and build confidence in your offering.',
                'Add testimonials, client logos, or case study references.',
                50,
                'medium',
                'low',
            );
        }

        // Check section count for very short funnels
        if (count($sections) === 1 && $allBlocks->count() < 3) {
            $findings[] = $this->finding(
                'thin_content',
                'Thin Content',
                'content_clarity',
                'The funnel has very little content (1 section, fewer than 3 blocks).',
                'Very short funnels may not provide enough information to persuade visitors to convert.',
                'Consider adding more sections: benefits, social proof, FAQ, and a closing CTA.',
                60,
                'medium',
                'low',
            );
        }

        return $findings;
    }

    /**
     * Analyze computed metrics for performance issues.
     *
     * @return array<int, array<string, mixed>>
     */
    private function analyzeMetrics(array $metrics): array
    {
        $findings = [];

        if (! $metrics['sample_size_sufficient']) {
            $findings[] = $this->finding(
                'low_sample_size',
                'Insufficient Traffic',
                'data_quality',
                "Only {$metrics['views']} views recorded. Minimum recommended: {$this->thresholds['min_sample_size']}.",
                'With very few page views, metrics are unreliable and may not represent typical performance. Recommendations based on content analysis are still valid.',
                'Promote the funnel to drive more traffic before drawing conclusions from analytics.',
                40,
                'low',
                'n/a',
            );

            return $findings;
        }

        // Low conversion rate
        if ($metrics['conversion_rate'] < $this->thresholds['low_conversion'] && $metrics['conversions'] > 0) {
            $findings[] = $this->finding(
                'low_conversion_rate',
                'Low Conversion Rate',
                'performance',
                "Conversion rate is {$metrics['conversion_rate']}% ({$metrics['conversions']} conversions from {$metrics['views']} views).",
                'A conversion rate below '.$this->thresholds['low_conversion'].'% suggests significant friction in the funnel. Review the value proposition, CTA clarity, and form design.',
                'Run an A/B test with a simplified layout or stronger headline.',
                85,
                'high',
                'medium',
            );
        }

        // Low CTA click rate
        if ($metrics['cta_click_rate'] < $this->thresholds['low_ctr'] && $metrics['cta_clicks'] > 0) {
            $findings[] = $this->finding(
                'low_cta_ctr',
                'Low CTA Click-Through Rate',
                'cta_optimization',
                "CTA click-through rate is {$metrics['cta_click_rate']}% ({$metrics['cta_clicks']} clicks from {$metrics['views']} views).",
                'Low click-through on CTAs may indicate the button text is not compelling, the button is not visible enough, or the value proposition above the fold is unclear.',
                'Test alternative CTA text, increase button visibility, or reposition the CTA higher on the page.',
                75,
                'medium',
                'medium',
            );
        }

        // Missing conversion tracking
        if ($metrics['conversions'] === 0 && $metrics['views'] >= $this->thresholds['min_sample_size']) {
            $findings[] = $this->finding(
                'no_conversions',
                'No Conversions Recorded',
                'conversion_tracking',
                "{$metrics['views']} views but 0 conversions. Either no form submissions have occurred or conversion tracking may not be configured.",
                'Zero conversions despite meaningful traffic could indicate a broken form, missing lead capture, or tracking issues.',
                'Verify the form submits correctly and that conversion events are being recorded.',
                90,
                'high',
                'low',
            );
        }

        // No CTA clicks tracked
        if ($metrics['cta_clicks'] === 0 && $metrics['views'] >= $this->thresholds['min_sample_size']) {
            $findings[] = $this->finding(
                'no_cta_clicks',
                'No CTA Clicks Tracked',
                'conversion_tracking',
                "{$metrics['views']} views but 0 CTA click events recorded.",
                'No CTA click events may indicate buttons are not configured to track clicks, or visitors are not engaging with CTAs.',
                'Ensure button blocks track click events. If buttons use external links, the analytics may not capture clicks.',
                65,
                'medium',
                'low',
            );
        }

        // Form abandonment
        if ($metrics['form_starts'] > 0 && $metrics['form_completion_rate'] < 30) {
            $findings[] = $this->finding(
                'high_form_abandonment',
                'High Form Abandonment',
                'form_friction',
                "Form completion rate is {$metrics['form_completion_rate']}% ({$metrics['conversions']} completions from {$metrics['form_starts']} form starts).",
                'High form abandonment suggests the form has too many fields, confusing labels, or asks for sensitive information too early.',
                'Simplify the form, reduce field count, and ensure clear field labels.',
                70,
                'medium',
                'medium',
            );
        }

        return $findings;
    }

    /**
     * Analyze variant performance.
     *
     * @return array{0: array<int, array<string, mixed>>, 1: array<string, mixed>}
     */
    private function analyzeVariants(Funnel $funnel, string $dateFrom, string $dateTo, array $metrics): array
    {
        $findings = [];
        $variants = $funnel->variants()->where('is_active', true)->get();

        if ($variants->isEmpty()) {
            if ($metrics['sample_size_sufficient'] && $metrics['conversion_rate'] < 5) {
                $findings[] = $this->finding(
                    'no_experiments',
                    'No Active Experiments',
                    'experiment_opportunities',
                    'No A/B test variants are active for this funnel.',
                    'Running experiments with alternative headlines, CTAs, or layouts can help identify what drives higher conversions.',
                    'Create a variant with a different headline or CTA text and split traffic 50/50.',
                    45,
                    'medium',
                    'medium',
                );
            }
        }

        foreach ($variants as $variant) {
            $variantEvents = FunnelEvent::query()
                ->where('funnel_id', $funnel->id)
                ->where('variant_id', $variant->id)
                ->whereBetween('occurred_at', [$dateFrom.' 00:00:00', $dateTo.' 23:59:59'])
                ->get(['event_type']);

            $variantViews = $variantEvents->where('event_type', 'view')->count();
            $variantConversions = $variantEvents->where('event_type', 'conversion')->count();
            $variantRate = $variantViews > 0 ? round(($variantConversions / $variantViews) * 100, 2) : 0.0;

            if ($variantViews < $this->thresholds['min_experiment_sample']) {
                $findings[] = $this->finding(
                    "variant_{$variant->id}_low_sample",
                    "Variant \"{$variant->name}\" Needs More Data",
                    'experiment_opportunities',
                    "Variant \"{$variant->name}\" has only {$variantViews} views. Minimum recommended: {$this->thresholds['min_experiment_sample']}.",
                    'Insufficient sample sizes make it impossible to determine a statistically meaningful winner. Continue running the experiment.',
                    'Keep the experiment running until each variant has at least '.$this->thresholds['min_experiment_sample'].' views.',
                    35,
                    'low',
                    'n/a',
                );
            }

            // Add variant metrics to the audit metrics
            $metrics['variants'][] = [
                'id' => $variant->id,
                'name' => $variant->name,
                'weight' => $variant->weight,
                'views' => $variantViews,
                'conversions' => $variantConversions,
                'conversion_rate' => $variantRate,
                'sample_sufficient' => $variantViews >= $this->thresholds['min_experiment_sample'],
            ];
        }

        // Events without a variant are the observed baseline, not a randomized control unless traffic was assigned that way.
        $controlEvents = FunnelEvent::query()
            ->where('funnel_id', $funnel->id)
            ->whereNull('variant_id')
            ->whereBetween('occurred_at', [$dateFrom.' 00:00:00', $dateTo.' 23:59:59'])
            ->get(['event_type']);

        $controlViews = $controlEvents->where('event_type', 'view')->count();
        $controlConversions = $controlEvents->where('event_type', 'conversion')->count();
        $controlRate = $controlViews > 0 ? round(($controlConversions / $controlViews) * 100, 2) : 0.0;

        $metrics['control'] = [
            'views' => $controlViews,
            'conversions' => $controlConversions,
            'conversion_rate' => $controlRate,
            'sample_sufficient' => $controlViews >= $this->thresholds['min_experiment_sample'],
        ];
        $metrics['experiment_comparisons'] = collect($metrics['variants'] ?? [])
            ->map(fn (array $variant) => [
                'variant_id' => $variant['id'],
                'variant_name' => $variant['name'],
                'control_views' => $controlViews,
                'variant_views' => $variant['views'],
                'control_conversion_rate' => $controlRate,
                'variant_conversion_rate' => $variant['conversion_rate'],
                'difference_percentage_points' => round($variant['conversion_rate'] - $controlRate, 2),
                'sample_sufficient' => $variant['sample_sufficient'] && $controlViews >= $this->thresholds['min_experiment_sample'],
                'winner_declared' => false,
            ])
            ->all();

        return [$findings, $metrics];
    }

    /**
     * @return array<string, mixed>
     */
    private function finding(
        string $key,
        string $title,
        string $category,
        string $evidence,
        string $explanation,
        string $suggestedAction,
        int $priority,
        string $confidence,
        string $effort,
    ): array {
        return [
            'key' => $key,
            'title' => $title,
            'category' => $category,
            'evidence' => $evidence,
            'explanation' => $explanation,
            'suggested_action' => $suggestedAction,
            'priority' => $priority,
            'confidence' => $confidence,
            'confidence_score' => match ($confidence) {
                'high' => 85,
                'medium' => 65,
                default => 35,
            },
            'confidence_explanation' => 'This score estimates how strongly the available evidence supports the finding; it is not the probability of improving conversions.',
            'effort' => $effort,
            'expected_outcome' => 'Test whether the suggested change addresses this finding; no conversion lift is assumed.',
            'hypothesis' => "If the suggested action is tested, then the issue described in the evidence may improve.",
        ];
    }

    /**
     * Extract all blocks from all sections, flattening the hierarchy.
     */
    private function extractBlocks(array $sections): Collection
    {
        return collect($sections)
            ->flatMap(fn (array $section) => $section['columns'] ?? [])
            ->flatMap(fn (array $column) => $column['blocks'] ?? []);
    }

    private function assessDataQuality(int $views, int $uniqueSessions, int $ctaClicks, int $formStarts, int $conversions): string
    {
        if ($views === 0) {
            return 'no_data';
        }
        if ($views < $this->thresholds['min_sample_size']) {
            return 'insufficient';
        }
        if ($ctaClicks === 0 && $formStarts === 0) {
            return 'partial';
        }

        return 'good';
    }
}
