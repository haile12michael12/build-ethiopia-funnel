<?php

namespace App\Services;

use App\Services\Automation\WebhookUrlGuard;
use Illuminate\Support\Facades\Http;
use InvalidArgumentException;
use Throwable;

class ProspectWebsiteInspector
{
    public function __construct(
        private readonly WebhookUrlGuard $guard = new WebhookUrlGuard,
    ) {}

    /**
     * @return array{
     *     url: string,
     *     is_accessible: bool,
     *     status_code: int|null,
     *     response_time_ms: int|null,
     *     has_ssl: bool,
     *     server: string|null,
     *     error: string|null
     * }
     */
    public function inspect(string $url): array
    {
        $normalizedUrl = trim($url);
        if (! str_starts_with($normalizedUrl, 'http://') && ! str_starts_with($normalizedUrl, 'https://')) {
            $normalizedUrl = 'https://'.$normalizedUrl;
        }

        try {
            $this->guard->assertSafe($normalizedUrl);
        } catch (InvalidArgumentException $exception) {
            return [
                'url' => $normalizedUrl,
                'is_accessible' => false,
                'status_code' => null,
                'response_time_ms' => null,
                'has_ssl' => str_starts_with($normalizedUrl, 'https://'),
                'server' => null,
                'error' => $exception->getMessage(),
            ];
        }

        $start = microtime(true);

        try {
            $response = Http::timeout(3)
                ->connectTimeout(2)
                ->withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (compatible; HailabProspectAuditor/1.0; +https://openfunnels.com)',
                    'Accept' => 'text/html,application/xhtml+xml',
                ])
                ->head($normalizedUrl);

            // If HEAD was rejected (e.g. 405 Method Not Allowed), retry with small GET
            if ($response->status() === 405) {
                $response = Http::timeout(3)
                    ->connectTimeout(2)
                    ->withHeaders([
                        'User-Agent' => 'Mozilla/5.0 (compatible; HailabProspectAuditor/1.0; +https://openfunnels.com)',
                    ])
                    ->get($normalizedUrl);
            }

            $elapsedMs = (int) round((microtime(true) - $start) * 1000);

            return [
                'url' => $normalizedUrl,
                'is_accessible' => $response->successful() || $response->redirect(),
                'status_code' => $response->status(),
                'response_time_ms' => $elapsedMs,
                'has_ssl' => str_starts_with($normalizedUrl, 'https://'),
                'server' => $response->header('Server') ?: null,
                'error' => null,
            ];
        } catch (Throwable $exception) {
            $elapsedMs = (int) round((microtime(true) - $start) * 1000);

            return [
                'url' => $normalizedUrl,
                'is_accessible' => false,
                'status_code' => null,
                'response_time_ms' => $elapsedMs,
                'has_ssl' => str_starts_with($normalizedUrl, 'https://'),
                'server' => null,
                'error' => 'Connection timed out or host unreachable.',
            ];
        }
    }
}
