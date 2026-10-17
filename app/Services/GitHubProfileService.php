<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

class GitHubProfileService
{
    private const FRAMEWORKS = [
        'React' => ['react'],
        'Next.js' => ['next.js', 'nextjs'],
        'Express' => ['express'],
        'NestJS' => ['nestjs'],
        'Node.js' => ['node.js', 'nodejs'],
        'MongoDB' => ['mongodb', 'mongoose'],
        'TypeScript' => ['typescript'],
        'JavaScript' => ['javascript'],
    ];

    /**
     * @return array{username:string,profile_url:string,primary_language:?string,detected_stack:list<string>,public_repo_count:int,has_saas_repo:bool}
     */
    public function lookup(string $username): array
    {
        $cacheKey = 'github-public-profile:'.mb_strtolower($username);
        $cached = Cache::get($cacheKey);
        if (is_array($cached)) {
            return $cached;
        }

        if (! RateLimiter::attempt('github-public-profile-lookups', 25, fn (): bool => true, 3600)) {
            throw new HttpException(429, 'GitHub profile lookup limit reached. Please try again later.');
        }

        $profileData = $this->fetchProfile($username);
        Cache::put($cacheKey, $profileData, now()->addHours(6));

        return $profileData;
    }

    /**
     * @return array{username:string,profile_url:string,primary_language:?string,detected_stack:list<string>,public_repo_count:int,has_saas_repo:bool}
     */
    private function fetchProfile(string $username): array
    {
        $client = Http::acceptJson()
            ->withHeaders([
                'X-GitHub-Api-Version' => '2022-11-28',
                'User-Agent' => 'Hailab-Developer-Profile',
            ])
            ->connectTimeout(2)
            ->timeout(6);

        try {
            $profileResponse = $client->get("https://api.github.com/users/{$username}");
            if ($profileResponse->status() === 404) {
                throw ValidationException::withMessages([
                    'username' => 'No public GitHub account was found for that username.',
                ]);
            }
            if (! $profileResponse->successful()) {
                throw new HttpException(503, 'GitHub profile lookup is temporarily unavailable. Please try again later.');
            }

            $profile = $profileResponse->json();
            if (! is_array($profile) || ! is_string($profile['login'] ?? null)) {
                throw new HttpException(503, 'GitHub returned an unexpected profile response.');
            }

            $repositoriesResponse = $client->get("https://api.github.com/users/{$username}/repos", [
                'sort' => 'updated',
                'per_page' => 100,
                'type' => 'owner',
            ]);
            if (! $repositoriesResponse->successful()) {
                throw new HttpException(503, 'GitHub repository lookup is temporarily unavailable. Please try again later.');
            }

            $repositories = $repositoriesResponse->json();
            if (! is_array($repositories) || ! array_is_list($repositories)) {
                throw new HttpException(503, 'GitHub returned an unexpected repository response.');
            }
        } catch (ConnectionException $exception) {
            throw new HttpException(503, 'GitHub profile lookup is temporarily unavailable. Please try again later.', $exception);
        }

        $languages = [];
        $stackSignals = [];
        $hasSaasRepo = false;

        foreach ($repositories as $repository) {
            if (! is_array($repository) || ($repository['fork'] ?? false) === true) {
                continue;
            }

            $language = $repository['language'] ?? null;
            if (is_string($language) && $language !== '') {
                $languages[$language] = ($languages[$language] ?? 0) + 1;
            }

            $topics = is_array($repository['topics'] ?? null) ? $repository['topics'] : [];
            $signals = mb_strtolower(implode(' ', [
                is_string($repository['name'] ?? null) ? $repository['name'] : '',
                is_string($repository['description'] ?? null) ? $repository['description'] : '',
                implode(' ', array_filter($topics, 'is_string')),
                is_string($language) ? $language : '',
            ]));
            $stackSignals[] = $signals;
            $hasSaasRepo = $hasSaasRepo || in_array('saas', $topics, true)
                || str_contains($signals, 'saas')
                || str_contains($signals, 'multi-tenant');
        }

        arsort($languages);
        $allSignals = implode(' ', $stackSignals);
        $detectedStack = [];
        foreach (self::FRAMEWORKS as $framework => $needles) {
            foreach ($needles as $needle) {
                $pattern = '/(?<![a-z0-9])'.preg_quote($needle, '/').'(?![a-z0-9])/i';
                if (preg_match($pattern, $allSignals) === 1) {
                    $detectedStack[] = $framework;
                    break;
                }
            }
        }

        $primaryLanguage = array_key_first($languages);
        if (is_string($primaryLanguage) && ! in_array($primaryLanguage, $detectedStack, true)) {
            $detectedStack[] = $primaryLanguage;
        }

        return [
            'username' => $profile['login'],
            'profile_url' => "https://github.com/{$profile['login']}",
            'primary_language' => $primaryLanguage,
            'detected_stack' => array_values(array_unique($detectedStack)),
            'public_repo_count' => max(0, (int) ($profile['public_repos'] ?? 0)),
            'has_saas_repo' => $hasSaasRepo,
        ];
    }
}
