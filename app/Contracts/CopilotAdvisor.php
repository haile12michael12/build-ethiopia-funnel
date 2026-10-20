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

    /**
     * Answer a visitor question using only the supplied published funnel content.
     *
     * @param  array{content: array<string, mixed>, question: string, previous_questions: array<int, string>}  $context
     * @return array{answer: string}
     */
    public function answerSupportQuestion(array $context): array;

    /**
     * Answer an authenticated user's question using only supplied aggregate evidence.
     *
     * @param  array{question: string, metrics: array<string, mixed>, language: string}  $context
     * @return array{answer: string, evidence_keys: array<int, string>, limitation: string|null}
     */
    public function answerCopilotQuestion(array $context): array;
}
