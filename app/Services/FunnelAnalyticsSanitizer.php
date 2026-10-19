<?php

namespace App\Services;

class FunnelAnalyticsSanitizer
{
    /**
     * @param  array<string, mixed>  $attribution
     * @return array<string, string>
     */
    public function attribution(array $attribution): array
    {
        $safe = [];
        foreach (['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as $key) {
            $value = trim((string) ($attribution[$key] ?? ''));
            if ($value !== '' && ! preg_match('/\+?\d[\d\s().-]{7,}\d/', $value) && ! str_contains($value, '@')) {
                $safe[$key] = mb_substr($value, 0, 100);
            }
        }

        $landingPath = parse_url((string) ($attribution['landing_page'] ?? ''), PHP_URL_PATH);
        if (is_string($landingPath) && str_starts_with($landingPath, '/') && ! str_contains($landingPath, '..')) {
            $safe['landing_page'] = mb_substr($landingPath, 0, 255);
        }

        $referrer = parse_url((string) ($attribution['referrer'] ?? ''));
        if (is_array($referrer)
            && in_array($referrer['scheme'] ?? null, ['http', 'https'], true)
            && isset($referrer['host'])
            && ! isset($referrer['user'], $referrer['pass'])) {
            $safe['referrer'] = mb_substr(
                $referrer['scheme'].'://'.$referrer['host'].($referrer['path'] ?? ''),
                0,
                2000,
            );
        }

        if (isset($attribution['device']) && in_array($attribution['device'], ['mobile', 'tablet', 'desktop'], true)) {
            $safe['device'] = $attribution['device'];
        }

        return $safe;
    }

    /**
     * @param  array<string, mixed>  $metadata
     * @return array<string, string>
     */
    public function eventMetadata(array $metadata): array
    {
        $safe = [];
        foreach (['page', 'device', 'step', 'cta', 'block_id'] as $key) {
            if (! isset($metadata[$key]) || ! is_scalar($metadata[$key])) {
                continue;
            }

            $value = trim((string) $metadata[$key]);
            if ($key === 'page') {
                $path = parse_url($value, PHP_URL_PATH);
                if (is_string($path) && str_starts_with($path, '/') && ! str_contains($path, '..')) {
                    $safe[$key] = mb_substr($path, 0, 255);
                }
            } elseif ($key === 'device' && in_array($value, ['mobile', 'tablet', 'desktop'], true)) {
                $safe[$key] = $value;
            } elseif ($key === 'step' && ctype_digit($value)) {
                $safe[$key] = mb_substr($value, 0, 3);
            } elseif (in_array($key, ['cta', 'block_id'], true) && preg_match('/^[a-zA-Z0-9_-]{1,80}$/', $value) === 1) {
                $safe[$key] = $value;
            }
        }

        return $safe;
    }
}
