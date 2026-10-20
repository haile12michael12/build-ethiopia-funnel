<?php

namespace App\Services;

use App\Models\Funnel;
use Illuminate\Support\Str;
use InvalidArgumentException;

class FunnelTemplateService
{
    public const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

    public const MAX_SECTIONS = 200;

    /**
     * @return array<string, mixed>
     */
    public function export(Funnel $funnel): array
    {
        return [
            'kind' => 'openfunnels-template',
            'schemaVersion' => 1,
            'metadata' => [
                'name' => $funnel->name,
                'description' => $funnel->description ?? '',
                'category' => 'Agency Funnel',
                'tags' => ['agency', 'marketing', 'hailab'],
                'exported_at' => now()->toIso8601String(),
            ],
            'funnel' => [
                'content' => $funnel->content ?: ['sections' => []],
                'settings' => $funnel->settings ?: [],
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $manifest
     * @return array{
     *     name: string,
     *     description: string,
     *     content: array<string, mixed>,
     *     settings: array<string, mixed>
     * }
     */
    public function parseAndValidate(string $jsonString): array
    {
        if (strlen($jsonString) > self::MAX_BYTES) {
            throw new InvalidArgumentException('Template files must be smaller than 2 MB.');
        }

        $decoded = json_decode($jsonString, true);
        if (! is_array($decoded)) {
            throw new InvalidArgumentException('This file is not valid JSON.');
        }

        if (($decoded['kind'] ?? null) !== 'openfunnels-template' || ($decoded['schemaVersion'] ?? null) !== 1) {
            throw new InvalidArgumentException('This is not a supported Hailab template.');
        }

        $metadata = $decoded['metadata'] ?? null;
        if (! is_array($metadata) || empty($metadata['name']) || ! is_string($metadata['name'])) {
            throw new InvalidArgumentException('The template metadata is incomplete.');
        }

        $funnelData = $decoded['funnel'] ?? null;
        if (! is_array($funnelData) || ! isset($funnelData['content']['sections']) || ! is_array($funnelData['content']['sections'])) {
            throw new InvalidArgumentException('The template content is incomplete.');
        }

        $sections = $funnelData['content']['sections'];
        if (count($sections) > self::MAX_SECTIONS) {
            throw new InvalidArgumentException('The template exceeds the 200-section limit.');
        }

        // Regenerate unique IDs for all sections, columns, and blocks to prevent collisions
        $regeneratedSections = $this->regenerateIds($sections);

        return [
            'name' => (string) $metadata['name'],
            'description' => (string) ($metadata['description'] ?? ''),
            'content' => [
                'sections' => $regeneratedSections,
            ],
            'settings' => is_array($funnelData['settings'] ?? null) ? $funnelData['settings'] : [],
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $sections
     * @return list<array<string, mixed>>
     */
    private function regenerateIds(array $sections): array
    {
        return array_map(function (array $section) {
            $section['id'] = 'section-'.Str::uuid();
            if (isset($section['columns']) && is_array($section['columns'])) {
                $section['columns'] = array_map(function (array $column) {
                    $column['id'] = 'column-'.Str::uuid();
                    if (isset($column['blocks']) && is_array($column['blocks'])) {
                        $column['blocks'] = $this->regenerateBlockIds($column['blocks']);
                    }

                    return $column;
                }, $section['columns']);
            }

            return $section;
        }, $sections);
    }

    /**
     * @param  list<array<string, mixed>>  $blocks
     * @return list<array<string, mixed>>
     */
    private function regenerateBlockIds(array $blocks): array
    {
        return array_map(function (array $block) {
            $block['id'] = 'block-'.Str::uuid();
            if (isset($block['children']) && is_array($block['children'])) {
                $block['children'] = $this->regenerateBlockIds($block['children']);
            }

            return $block;
        }, $blocks);
    }
}

