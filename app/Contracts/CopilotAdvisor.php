<?php

namespace App\Contracts;

interface CopilotAdvisor
{
    /**
     * Generate AI-powered optimization advice for a funnel audit.
     *
     * @param  array{content: array<string, mixed>, metrics: array<string, mixed>, findings: array<int, array<string, mixed>>, language: string}  $context
     * @return array{explanations: array<int, array{key: string, explanation: string}>, copy_suggestions: array<int, array{key: string, type: string, original: string|null, suggestion: string, rationale: string}>, experiment_hypotheses: array<int, array{hypothesis: string, primary_metric: string, variant_description: string}>, next_steps: array<int, string>}
     */
    public function advise(array $context): array;
}

