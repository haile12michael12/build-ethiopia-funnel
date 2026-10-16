<?php

namespace App\Services\Ai;

use App\Contracts\CopilotAdvisor;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class OpenAICopilotAdvisor implements CopilotAdvisor
{
    public function advise(array $context): array
    {
        $safeContent = $this->sanitizeContent($context['content'] ?? []);
        $prompt = $this->buildPrompt($safeContent, $context['metrics'] ?? [], $context['findings'] ?? [], $context['language'] ?? 'en');

        $response = Http::withToken((string) config('funnel-ai.api_key'))
            ->acceptJson()
            ->timeout((int) config('funnel-ai.timeout'))
            ->post((string) config('funnel-ai.endpoint'), [
                'model' => config('funnel-ai.model'),
                'instructions' => 'You are a conversion rate optimization expert. Analyze funnel content and metrics. Return only valid JSON matching the requested schema. Never invent analytics data. Never guarantee conversion improvements. Use the requested language for all text output.',
                'input' => $prompt,
                'text' => [
                    'format' => [
                        'type' => 'json_schema',
                        'name' => 'copilot_advice',
                        'strict' => false,
                        'schema' => $this->responseSchema(),
                    ],
                ],
            ]);

        if ($response->failed()) {
            throw new RuntimeException('The AI provider could not generate optimization advice.');
        }

        $text = collect($response->json('output', []))
            ->flatMap(fn (array $item) => $item['content'] ?? [])
            ->first(fn (array $content) => isset($content['text']))['text'] ?? null;

        if (! is_string($text) || strlen($text) > 50000) {
            throw new RuntimeException('The AI provider returned an empty response.');
        }

        $result = json_decode($text, true);
        if (! is_array($result) || ! $this->hasValidResponseShape($result)) {
            throw new RuntimeException('The AI provider returned invalid JSON.');
        }

        return $this->validateResponse($result);
    }

    private function hasValidResponseShape(array $result): bool
    {
        foreach (['explanations', 'copy_suggestions', 'experiment_hypotheses', 'next_steps'] as $key) {
            if (! isset($result[$key]) || ! is_array($result[$key])) {
                return false;
            }
        }

        return true;
    }

    private function sanitizeContent(array $content): array
    {
        $sections = $content['sections'] ?? [];
        if (! is_array($sections)) {
            return ['sections' => []];
        }

        return [
            'sections' => collect($sections)->filter('is_array')->take(12)->map(function (array $section) {
                return [
                    'layout' => $this->safeText($section['layout'] ?? 'single', 80),
                    'columns' => collect($section['columns'] ?? [])->filter('is_array')->take(4)->map(function (array $column) {
                        return [
                            'width' => is_numeric($column['width'] ?? null) ? (int) $column['width'] : 100,
                            'blocks' => collect($column['blocks'] ?? [])->filter('is_array')->take(30)->map(function (array $block) {
                                return [
                                    'type' => $this->safeText($block['type'] ?? 'text', 80),
                                    'content' => $this->sanitizeBlockContent($block['content'] ?? []),
                                ];
                            })->all(),
                        ];
                    })->all(),
                ];
            })->take(20)->all(),
        ];
    }

    private function sanitizeBlockContent(array $content): array
    {
        $allowed = ['text', 'html', 'label', 'placeholder', 'heading', 'subheading', 'buttonText', 'name', 'author', 'quote', 'title', 'description'];
        $sanitized = [];
        foreach ($allowed as $key) {
            if (isset($content[$key]) && is_string($content[$key])) {
                $sanitized[$key] = $this->safeText($content[$key], 2000);
            }
        }

        if (is_array($content['fields'] ?? null)) {
            $sanitized['fields'] = collect($content['fields'])->filter('is_array')->take(25)->map(fn (array $field) => [
                'type' => $this->safeText($field['type'] ?? '', 40),
                'label' => $this->safeText($field['label'] ?? '', 120),
                'required' => (bool) ($field['required'] ?? false),
            ])->all();
        }

        return $sanitized;
    }

    private function safeText(mixed $value, int $limit): string
    {
        return mb_substr(trim(strip_tags((string) $value)), 0, $limit);
    }

    private function buildPrompt(array $content, array $metrics, array $findings, string $language): string
    {
        $languageInstruction = $language === 'am'
            ? 'Respond entirely in Amharic (አማርኛ).'
            : 'Respond entirely in English.';

        $safeMetrics = [
            ...array_intersect_key($metrics, array_flip([
                'date_from', 'date_to', 'views', 'unique_sessions', 'cta_clicks', 'form_starts',
                'conversions', 'conversion_rate', 'cta_click_rate', 'form_completion_rate',
                'sample_size_sufficient', 'data_quality', 'data_warnings',
            ])),
            'daily' => array_slice($metrics['daily'] ?? [], 0, 90),
            'traffic_sources' => array_slice($metrics['traffic_sources'] ?? [], 0, 10),
            'devices' => array_slice($metrics['devices'] ?? [], 0, 5),
            'variants' => array_slice($metrics['variants'] ?? [], 0, 10),
            'control' => $metrics['control'] ?? null,
        ];
        $safeFindings = collect($findings)->take(15)->map(fn (array $finding) => array_intersect_key($finding, array_flip([
            'key', 'title', 'category', 'evidence', 'explanation', 'suggested_action',
            'priority', 'confidence', 'confidence_score', 'confidence_explanation',
        ])))->all();
        $prompt = json_encode([
            'task' => 'Analyze this funnel and provide optimization advice.',
            'language' => $languageInstruction,
            'funnel_content' => $content,
            'current_metrics' => $safeMetrics,
            'rule_based_findings' => $safeFindings,
        ], JSON_THROW_ON_ERROR);

        if (strlen($prompt) > 24000) {
            throw new RuntimeException('The funnel content is too large to send for AI advice.');
        }

        return $prompt;
    }

    private function responseSchema(): array
    {
        return [
            'type' => 'object',
            'required' => ['explanations', 'copy_suggestions', 'experiment_hypotheses', 'next_steps'],
            'properties' => [
                'explanations' => [
                    'type' => 'array',
                    'maxItems' => 10,
                    'items' => [
                        'type' => 'object',
                        'properties' => [
                            'key' => ['type' => 'string'],
                            'explanation' => ['type' => 'string'],
                        ],
                    ],
                ],
                'copy_suggestions' => [
                    'type' => 'array',
                    'maxItems' => 10,
                    'items' => [
                        'type' => 'object',
                        'properties' => [
                            'key' => ['type' => 'string'],
                            'type' => ['type' => 'string'],
                            'original' => ['type' => 'string'],
                            'suggestion' => ['type' => 'string'],
                            'rationale' => ['type' => 'string'],
                        ],
                    ],
                ],
                'experiment_hypotheses' => [
                    'type' => 'array',
                    'maxItems' => 5,
                    'items' => [
                        'type' => 'object',
                        'properties' => [
                            'hypothesis' => ['type' => 'string'],
                            'primary_metric' => ['type' => 'string'],
                            'variant_description' => ['type' => 'string'],
                        ],
                    ],
                ],
                'next_steps' => [
                    'type' => 'array',
                    'maxItems' => 5,
                    'items' => ['type' => 'string'],
                ],
            ],
        ];
    }

    private function validateResponse(array $result): array
    {
        $validated = [
            'explanations' => [],
            'copy_suggestions' => [],
            'experiment_hypotheses' => [],
            'next_steps' => [],
        ];

        foreach (array_slice($result['explanations'], 0, 10) as $item) {
            if (! is_array($item) || ! isset($item['key'], $item['explanation']) || ! is_string($item['key']) || ! is_string($item['explanation'])) {
                throw new RuntimeException('The AI provider returned an invalid explanation.');
            }
            $validated['explanations'][] = [
                'key' => $this->safeText($item['key'], 100),
                'explanation' => $this->safeText($item['explanation'], 1000),
            ];
        }

        foreach (array_slice($result['copy_suggestions'], 0, 10) as $item) {
            if (! is_array($item) || ! isset($item['suggestion'], $item['type']) || ! is_string($item['suggestion']) || ! is_string($item['type'])) {
                throw new RuntimeException('The AI provider returned an invalid copy suggestion.');
            }
            $validated['copy_suggestions'][] = [
                'key' => $this->safeText(is_string($item['key'] ?? null) ? $item['key'] : '', 100),
                'type' => $this->safeText($item['type'], 40),
                'original' => is_string($item['original'] ?? null) ? $this->safeText($item['original'], 500) : null,
                'suggestion' => $this->safeText($item['suggestion'], 500),
                'rationale' => $this->safeText(is_string($item['rationale'] ?? null) ? $item['rationale'] : '', 1000),
            ];
        }

        foreach (array_slice($result['experiment_hypotheses'], 0, 5) as $item) {
            if (! is_array($item) || ! is_string($item['hypothesis'] ?? null)) {
                throw new RuntimeException('The AI provider returned an invalid experiment hypothesis.');
            }
            $validated['experiment_hypotheses'][] = [
                'hypothesis' => $this->safeText($item['hypothesis'], 1000),
                'primary_metric' => 'conversion_rate',
                'variant_description' => $this->safeText(is_string($item['variant_description'] ?? null) ? $item['variant_description'] : '', 500),
            ];
        }

        foreach (array_slice($result['next_steps'], 0, 5) as $step) {
            if (! is_string($step)) {
                throw new RuntimeException('The AI provider returned an invalid next step.');
            }
            $validated['next_steps'][] = $this->safeText($step, 500);
        }

        return $validated;
    }
}
