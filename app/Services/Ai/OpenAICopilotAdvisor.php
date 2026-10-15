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

        if (! is_string($text)) {
            throw new RuntimeException('The AI provider returned an empty response.');
        }

        $result = json_decode($text, true);
        if (! is_array($result)) {
            throw new RuntimeException('The AI provider returned invalid JSON.');
        }

        return $this->validateResponse($result);
    }

    private function sanitizeContent(array $content): array
    {
        // Only send structural content, strip any potentially sensitive metadata
        $sections = $content['sections'] ?? [];

        return [
            'sections' => collect($sections)->map(function (array $section) {
                return [
                    'layout' => $section['layout'] ?? 'single',
                    'columns' => collect($section['columns'] ?? [])->map(function (array $column) {
                        return [
                            'width' => $column['width'] ?? 100,
                            'blocks' => collect($column['blocks'] ?? [])->map(function (array $block) {
                                return [
                                    'type' => $block['type'] ?? 'text',
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
        $allowed = ['text', 'html', 'src', 'alt', 'label', 'url', 'placeholder', 'heading', 'subheading', 'buttonText', 'fields', 'successAction', 'name', 'author', 'quote', 'title', 'description'];

        return array_intersect_key($content, array_flip($allowed));
    }

    private function buildPrompt(array $content, array $metrics, array $findings, string $language): string
    {
        $languageInstruction = $language === 'am'
            ? 'Respond entirely in Amharic (አማርኛ).'
            : 'Respond entirely in English.';

        return json_encode([
            'task' => 'Analyze this funnel and provide optimization advice.',
            'language' => $languageInstruction,
            'funnel_content' => $content,
            'current_metrics' => $metrics,
            'rule_based_findings' => $findings,
        ], JSON_THROW_ON_ERROR);
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

        foreach ($result['explanations'] ?? [] as $item) {
            if (is_array($item) && isset($item['key'], $item['explanation'])) {
                $validated['explanations'][] = [
                    'key' => (string) $item['key'],
                    'explanation' => (string) $item['explanation'],
                ];
            }
        }

        foreach ($result['copy_suggestions'] ?? [] as $item) {
            if (is_array($item) && isset($item['suggestion'], $item['type'])) {
                $validated['copy_suggestions'][] = [
                    'key' => (string) ($item['key'] ?? ''),
                    'type' => (string) $item['type'],
                    'original' => isset($item['original']) ? (string) $item['original'] : null,
                    'suggestion' => (string) $item['suggestion'],
                    'rationale' => (string) ($item['rationale'] ?? ''),
                ];
            }
        }

        foreach ($result['experiment_hypotheses'] ?? [] as $item) {
            if (is_array($item) && isset($item['hypothesis'])) {
                $validated['experiment_hypotheses'][] = [
                    'hypothesis' => (string) $item['hypothesis'],
                    'primary_metric' => (string) ($item['primary_metric'] ?? 'conversion_rate'),
                    'variant_description' => (string) ($item['variant_description'] ?? ''),
                ];
            }
        }

        foreach ($result['next_steps'] ?? [] as $step) {
            if (is_string($step)) {
                $validated['next_steps'][] = $step;
            }
        }

        return $validated;
    }
}

