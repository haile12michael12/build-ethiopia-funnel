<?php

namespace App\Services;

use App\Contracts\CopilotAdvisor;
use App\Models\Funnel;
use Exception;
use Illuminate\Support\Facades\Log;

class FunnelSupportChatAssistant
{
    public function __construct(private readonly CopilotAdvisor $advisor) {}

    /**
     * @param  array<string, mixed>  $content
     * @param  array<int, string>  $previousQuestions
     * @return array{answer: string, source: 'ai'|'page_content'}
     */
    public function reply(Funnel $funnel, array $content, string $question, array $previousQuestions = []): array
    {
        try {
            $result = $this->advisor->answerSupportQuestion([
                'content' => $content,
                'question' => $question,
                'previous_questions' => array_slice($previousQuestions, -5),
            ]);

            if (! is_string($result['answer'] ?? null) || trim($result['answer']) === '') {
                throw new \RuntimeException('The AI provider returned an invalid support answer.');
            }

            return [
                'answer' => mb_substr(trim(strip_tags($result['answer'])), 0, 1500),
                'source' => 'ai',
            ];
        } catch (Exception $exception) {
            Log::warning('Funnel support chat fell back to page content.', [
                'funnel_id' => $funnel->id,
                'exception' => $exception::class,
            ]);

            return [
                'answer' => $this->pageContentFallback($content, $question),
                'source' => 'page_content',
            ];
        }
    }

    /**
     * @param  array<string, mixed>  $content
     */
    private function pageContentFallback(array $content, string $question): string
    {
        $snippets = [];
        $sections = is_array($content['sections'] ?? null) ? array_slice($content['sections'], 0, 12) : [];
        foreach ($sections as $section) {
            $columns = is_array($section['columns'] ?? null) ? array_slice($section['columns'], 0, 4) : [];
            foreach ($columns as $column) {
                $blocks = is_array($column['blocks'] ?? null) ? array_slice($column['blocks'], 0, 30) : [];
                foreach ($blocks as $block) {
                    if (! is_array($block)) {
                        continue;
                    }
                    $blockContent = $block['content'] ?? [];
                    if (! is_array($blockContent)) {
                        continue;
                    }
                    foreach (['text', 'html', 'label', 'heading', 'subheading', 'buttonText', 'title', 'description', 'quote'] as $key) {
                        if (is_string($blockContent[$key] ?? null)) {
                            $text = $this->plainText($blockContent[$key]);
                            if ($text !== '') {
                                $snippets[] = mb_substr($text, 0, 500);
                            }
                        }
                    }
                    $fields = is_array($blockContent['fields'] ?? null) ? array_slice($blockContent['fields'], 0, 20) : [];
                    foreach ($fields as $field) {
                        if (! is_array($field)) {
                            continue;
                        }
                        if (is_string($field['label'] ?? null) && trim($field['label']) !== '') {
                            $snippets[] = mb_substr($this->plainText($field['label']), 0, 120);
                        }
                    }
                }
            }
        }

        $terms = collect(preg_split('/[^\pL\pN]+/u', mb_strtolower($question)) ?: [])
            ->filter(fn (string $term) => mb_strlen($term) >= 3)
            ->unique()
            ->values();
        $matched = collect($snippets)->first(function (string $snippet) use ($terms): bool {
            $normalized = mb_strtolower($snippet);

            return $terms->contains(fn (string $term) => str_contains($normalized, $term));
        });

        if (is_string($matched)) {
            return 'I can only answer from information on this page. It mentions: '.$matched;
        }

        return $snippets === []
            ? 'I could not find support details on this page. Please use the page contact form to reach the team.'
            : 'I could not find that information on this page. Please use the page contact form to reach the team.';
    }

    private function plainText(string $value): string
    {
        $withoutActiveContent = preg_replace('/<(script|style)\b[^>]*>.*?<\/\1>/is', ' ', $value) ?? '';

        return trim(strip_tags($withoutActiveContent));
    }
}
