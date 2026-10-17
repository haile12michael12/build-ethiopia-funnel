<?php

use App\Jobs\CalculateLeadScore;
use App\Models\DeveloperProfile;
use App\Models\Funnel;
use App\Models\User;
use App\Services\DeveloperFunnelInstaller;
use App\Services\GitHubProfileService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\RateLimiter;

uses(RefreshDatabase::class);

function optedInDeveloper(Funnel $landing, User $owner, string $sessionId): array
{
    test()->post(route('funnels.leads.store', $landing), [
        'email' => 'github-visitor@example.com',
        'name' => 'GitHub Visitor',
        'session_id' => $sessionId,
    ])->assertRedirect();

    $quiz = $owner->funnels()->where('slug', 'developer-quiz')->firstOrFail();

    return [$quiz, $owner->contacts()->where('email', 'github-visitor@example.com')->firstOrFail()];
}

test('public GitHub profile lookup stores minimal profile data and returns a personalized offer', function () {
    Queue::fake();
    Cache::forget('github-public-profile:saas-builder');
    Http::preventStrayRequests();
    Http::fake([
        'api.github.com/users/saas-builder' => Http::response([
            'login' => 'saas-builder',
            'public_repos' => 24,
        ]),
        'api.github.com/users/saas-builder/repos*' => Http::response([
            [
                'name' => 'billing-platform',
                'description' => 'A multi-tenant SaaS application',
                'language' => 'TypeScript',
                'topics' => ['saas', 'express', 'mongodb'],
                'fork' => false,
            ],
            [
                'name' => 'copied-project',
                'description' => 'React starter',
                'language' => 'JavaScript',
                'topics' => ['react'],
                'fork' => true,
            ],
        ]),
    ]);

    $owner = User::factory()->create();
    $landing = app(DeveloperFunnelInstaller::class)->installFor($owner);
    $sessionId = '5f07793d-e6f2-42d0-8114-d487912462ec';
    [$quiz, $contact] = optedInDeveloper($landing, $owner, $sessionId);

    $response = $this->postJson(route('funnels.github-profile.store', $quiz), [
        'username' => 'saas-builder',
        'session_id' => $sessionId,
    ])->assertOk()
        ->assertJsonPath('profile.username', 'saas-builder')
        ->assertJsonPath('profile.primary_language', 'TypeScript')
        ->assertJsonPath('profile.public_repo_count', 24)
        ->assertJsonPath('recommendation.offer_slug', 'mern-boilerplate')
        ->assertJsonPath('recommendation.offer_name', 'MERN SaaS Boilerplate');

    $profile = DeveloperProfile::query()->where('contact_id', $contact->id)->firstOrFail();
    expect($profile->detected_stack)->toContain('Express', 'MongoDB', 'TypeScript')
        ->and($profile->has_saas_repo)->toBeTrue()
        ->and($profile->github_profile_url)->toBe('https://github.com/saas-builder')
        ->and($profile->toArray())->not->toHaveKey('repository_list');

    $this->postJson(route('funnels.steps.evaluate', $quiz), [
        'step_slug' => 'developer-quiz',
        'answers' => ['experience' => 'intermediate', 'goal' => 'learn-full-stack', 'timeline' => 'soon'],
        'session_id' => $sessionId,
    ])->assertOk()
        ->assertJsonPath('matched_branch', 'TypeScript SaaS builder')
        ->assertJsonPath('next_step_slug', 'mern-boilerplate');

    $this->assertDatabaseHas('funnel_events', [
        'funnel_id' => $quiz->id,
        'event_type' => 'github_connected',
        'contact_id' => $contact->id,
    ]);
    Queue::assertPushed(CalculateLeadScore::class);

    app(GitHubProfileService::class)->lookup('saas-builder');
    Http::assertSentCount(2);
});

test('GitHub profile lookup requires an email opt-in and validates usernames before contacting GitHub', function () {
    Http::preventStrayRequests();
    Http::fake();

    $owner = User::factory()->create();
    app(DeveloperFunnelInstaller::class)->installFor($owner);
    $quiz = $owner->funnels()->where('slug', 'developer-quiz')->firstOrFail();
    $sessionId = 'c5ef0f11-5a96-499f-8df2-75d47f605cab';

    $this->postJson(route('funnels.github-profile.store', $quiz), [
        'username' => 'valid-user',
        'session_id' => $sessionId,
    ])->assertUnprocessable()
        ->assertJsonPath('message', 'Complete the email opt-in before connecting a GitHub profile.');

    $this->postJson(route('funnels.github-profile.store', $quiz), [
        'username' => 'https://github.com/valid-user',
        'session_id' => $sessionId,
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['username']);

    Http::assertNothingSent();
});

test('unknown GitHub profiles fail explicitly without creating a developer profile', function () {
    Http::preventStrayRequests();
    Http::fake([
        'api.github.com/users/missing-user' => Http::response(['message' => 'Not Found'], 404),
    ]);

    $owner = User::factory()->create();
    $landing = app(DeveloperFunnelInstaller::class)->installFor($owner);
    $sessionId = '614bc4d9-55ba-472e-91e8-527a2f73a81e';
    [$quiz, $contact] = optedInDeveloper($landing, $owner, $sessionId);

    $this->postJson(route('funnels.github-profile.store', $quiz), [
        'username' => 'missing-user',
        'session_id' => $sessionId,
    ])->assertUnprocessable()
        ->assertJsonValidationErrors(['username']);

    expect(DeveloperProfile::query()->where('contact_id', $contact->id)->exists())->toBeFalse();
});

test('GitHub API outages return an explicit service error without storing a profile', function () {
    Http::preventStrayRequests();
    Http::fake([
        'api.github.com/users/rate-limited' => Http::response(['message' => 'API rate limit exceeded'], 403),
    ]);

    $owner = User::factory()->create();
    $landing = app(DeveloperFunnelInstaller::class)->installFor($owner);
    $sessionId = '7b2a31a4-1361-4dd9-9307-415796ea2805';
    [$quiz, $contact] = optedInDeveloper($landing, $owner, $sessionId);

    $this->postJson(route('funnels.github-profile.store', $quiz), [
        'username' => 'rate-limited',
        'session_id' => $sessionId,
    ])->assertServiceUnavailable();

    expect(DeveloperProfile::query()->where('contact_id', $contact->id)->exists())->toBeFalse();
});

test('GitHub profile lookup enforces an application-wide public API limit', function () {
    Http::preventStrayRequests();
    Http::fake();
    RateLimiter::clear('github-public-profile-lookups');
    for ($attempt = 0; $attempt < 25; $attempt++) {
        RateLimiter::hit('github-public-profile-lookups', 3600);
    }

    $owner = User::factory()->create();
    $landing = app(DeveloperFunnelInstaller::class)->installFor($owner);
    $sessionId = '1941ba9e-c503-498e-9b74-b8f5172e9155';
    [$quiz] = optedInDeveloper($landing, $owner, $sessionId);

    $this->postJson(route('funnels.github-profile.store', $quiz), [
        'username' => 'another-builder',
        'session_id' => $sessionId,
    ])->assertTooManyRequests();

    Http::assertNothingSent();
    RateLimiter::clear('github-public-profile-lookups');
});
