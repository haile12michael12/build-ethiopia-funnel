<?php

use App\Models\Funnel;
use App\Models\FunnelEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function analyticsFunnel(User $user, bool $published = true): Funnel
{
    return $user->funnels()->create([
        'name' => 'Analytics funnel',
        'slug' => 'analytics-funnel',
        'content' => ['sections' => []],
        'settings' => [],
        'status' => $published ? 'published' : 'draft',
        'is_published' => $published,
    ]);
}

test('published funnels accept privacy conscious analytics events', function () {
    $funnel = analyticsFunnel(User::factory()->create());
    $sessionId = 'd4aaac82-e654-4c8d-9c22-2cdea9cf0a17';

    $this->postJson(route('funnels.events.store', $funnel), [
        'event_type' => 'form_start',
        'session_id' => $sessionId,
        'form_id' => 'lead-form',
        'attribution' => ['utm_source' => 'community'],
    ])->assertAccepted();

    $event = FunnelEvent::firstOrFail();
    expect($event->session_id)->toBe(hash('sha256', $sessionId))
        ->and($event->attribution['utm_source'])->toBe('community');
});

test('analytics events discard direct identifiers and strip query strings before persistence', function () {
    $funnel = analyticsFunnel(User::factory()->create());
    $sessionId = 'b780404f-95c9-429b-a49a-ed7a86444a71';

    $this->postJson(route('funnels.events.store', $funnel), [
        'event_type' => 'view',
        'event_id' => 'e073e860-0538-4eba-8a83-4fd0e8cb4e35',
        'session_id' => $sessionId,
        'attribution' => [
            'utm_source' => 'newsletter',
            'utm_campaign' => 'campaign-2026',
            'landing_page' => '/person@example.com?email=person@example.com',
            'referrer' => 'https://example.com/path?email=person@example.com',
        ],
        'metadata' => ['page' => '/person@example.com?email=person@example.com', 'device' => 'mobile'],
    ])->assertAccepted();

    $view = FunnelEvent::query()->where('event_type', 'view')->firstOrFail();
    expect($view->attribution)->toMatchArray([
        'utm_source' => 'newsletter',
        'utm_campaign' => 'campaign-2026',
        'landing_page' => '/:redacted',
        'referrer' => 'https://example.com',
    ])->and($view->metadata)->toBe(['page' => '/:redacted', 'device' => 'mobile']);
});

test('analytics rejects direct identifiers in campaign attribution', function () {
    $funnel = analyticsFunnel(User::factory()->create());

    $this->postJson(route('funnels.events.store', $funnel), [
        'event_type' => 'view',
        'attribution' => ['utm_campaign' => 'person@example.com'],
    ])->assertUnprocessable();

    expect($funnel->events()->count())->toBe(0);
});

test('replayed client event ids do not duplicate event records', function () {
    $funnel = analyticsFunnel(User::factory()->create());
    $payload = [
        'event_type' => 'view',
        'event_id' => 'cae2d901-dc21-4367-a8a0-c71833d33c26',
        'session_id' => 'd4aaac82-e654-4c8d-9c22-2cdea9cf0a17',
    ];

    $this->postJson(route('funnels.events.store', $funnel), $payload)->assertAccepted();
    $this->postJson(route('funnels.events.store', $funnel), $payload)->assertAccepted();

    expect($funnel->events()->count())->toBe(2)
        ->and($funnel->events()->where('event_type', 'view')->count())->toBe(1)
        ->and($funnel->events()->where('event_type', 'page_viewed')->count())->toBe(1);
});

test('public analytics rejects form values and unsupported metadata keys', function () {
    $funnel = analyticsFunnel(User::factory()->create());

    $this->postJson(route('funnels.events.store', $funnel), [
        'event_type' => 'form_validation_error',
        'metadata' => ['email' => 'person@example.com'],
    ])->assertUnprocessable();
});

test('draft funnels do not accept anonymous analytics events', function () {
    $funnel = analyticsFunnel(User::factory()->create(), false);

    $this->postJson(route('funnels.events.store', $funnel), ['event_type' => 'view'])->assertNotFound();
});

test('dashboard exposes daily and source analytics for owned funnels', function () {
    $user = User::factory()->create(['email' => 'owner@example.test']);
    config(['business.owner_email' => $user->email]);
    $funnel = analyticsFunnel($user);
    $funnel->events()->create([
        'event_type' => 'conversion',
        'attribution' => ['utm_source' => 'newsletter'],
        'occurred_at' => now(),
    ]);

    $this->withoutVite();
    $this->actingAs($user)->get(route('dashboard'))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('dashboard')
        ->has('analytics.daily', 14)
        ->where('analytics.sources.0.source', 'newsletter')
        ->where('analytics.sources.0.conversions', 1));
});
