<?php

use App\Models\ClientAcquisitionSettings;
use App\Models\Funnel;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function validClientProjectPayload(array $overrides = []): array
{
    return array_replace([
        'name' => 'Selam Tesfaye',
        'email' => 'selam@example.com',
        'phone' => '+251911223344',
        'business_name' => 'Addis Studio',
        'market' => 'ethiopia',
        'country' => 'Ethiopia',
        'service_interests' => ['web_app', 'consultation'],
        'project_description' => 'We need a new customer platform to streamline our sales process and support our growing team. It should also connect our customer service and reporting tools.',
        'budget' => 'etb_100000_500000',
        'timeline' => 'within_1_month',
        'preferred_contact' => 'email',
        'marketing_consent' => true,
    ], $overrides);
}

function createPublishedClientAnalyticsFunnel(User $owner, array $overrides = []): Funnel
{
    return $owner->funnels()->create(array_replace([
        'name' => 'Client acquisition analytics',
        'slug' => 'client-acquisition-analytics',
        'content' => [],
        'settings' => [],
        'is_published' => true,
        'status' => 'published',
        'published_at' => now(),
    ], $overrides));
}

test('public contact page renders', function () {
    $this->withoutVite()
        ->get(route('contact'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('contact'));
});

test('public project funnel renders localized choices and default settings', function () {
    $owner = User::factory()->create();
    config(['business-audit.owner_id' => $owner->id, 'business.owner_email' => $owner->email]);

    $this->withoutVite()
        ->get(route('client-acquisition.show'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('client-acquisition/index')
            ->has('services')
            ->where('settings.budgets.0.currency', 'ETB')
            ->where('experiment.variant_id', null)
            ->where('submissionsConfigured', true));
});

test('public project funnel renders without 503 when no owner is configured while submissions fail closed', function () {
    config(['business-audit.owner_id' => null, 'business.owner_email' => null]);

    $this->withoutVite()
        ->get(route('client-acquisition.show'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('client-acquisition/index')
            ->where('services', [])
            ->where('projects', [])
            ->where('testimonials', [])
            ->where('settings.budgets.0.currency', 'ETB')
            ->where('experiment.variant_id', null)
            ->where('submissionsConfigured', false));

    $this->post(route('client-acquisition.store'), validClientProjectPayload())
        ->assertStatus(503);

    $this->assertDatabaseMissing('contacts', ['email' => 'selam@example.com']);
});

test('project submission persists explainable scoring, preferences and signed confirmation', function () {
    $owner = User::factory()->create();
    config(['business-audit.owner_id' => $owner->id, 'business.owner_email' => $owner->email]);

    $response = $this->post(route('client-acquisition.store'), validClientProjectPayload())
        ->assertRedirect();
    $contact = $owner->contacts()->where('email', 'selam@example.com')->firstOrFail();

    expect($contact->source)->toBe('client_acquisition')
        ->and($contact->status)->toBe('qualified')
        ->and($contact->lead_score)->toBe(83)
        ->and($contact->client_project['service_labels'])->toBe([
            'Website or web application',
            'Custom project or consultation',
        ])
        ->and($contact->lead_score_reasons)->toHaveCount(6)
        ->and($contact->last_scored_at)->not->toBeNull()
        ->and($contact->submissions)->toHaveCount(1);

    $this->assertDatabaseHas('contact_email_preferences', [
        'user_id' => $owner->id,
        'contact_id' => $contact->id,
        'status' => 'subscribed',
        'source' => 'client_acquisition',
    ]);

    $this->withoutVite()
        ->get($response->headers->get('Location'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('client-acquisition/thank-you')
            ->where('request.name', 'Selam Tesfaye')
            ->where('labels.budgets.etb_100000_500000', 'ETB 100,000–500,000'));
});

test('repeat project requests update the owner contact while retaining submission history', function () {
    $owner = User::factory()->create();
    config(['business-audit.owner_id' => $owner->id, 'business.owner_email' => $owner->email]);

    $this->post(route('client-acquisition.store'), validClientProjectPayload())->assertRedirect();
    $this->post(route('client-acquisition.store'), validClientProjectPayload([
        'business_name' => 'Updated Studio',
        'marketing_consent' => false,
    ]))->assertRedirect();

    $contact = $owner->contacts()->where('email', 'selam@example.com')->firstOrFail();

    expect($owner->contacts()->count())->toBe(1)
        ->and($contact->submissions()->count())->toBe(2)
        ->and(data_get($contact->metadata, 'submission_count'))->toBe(2)
        ->and(data_get($contact->client_project, 'business_name'))->toBe('Updated Studio')
        ->and($contact->emailPreference->status)->toBe('subscribed');
});

test('repeat submissions keep original attribution while each submission records its own source', function () {
    $owner = User::factory()->create();
    config(['business-audit.owner_id' => $owner->id, 'business.owner_email' => $owner->email]);

    $this->post(route('client-acquisition.store'), validClientProjectPayload([
        'attribution' => [
            'utm_source' => 'first-source',
            'utm_campaign' => 'launch-one',
            'landing_page' => '/start-project?utm_campaign=launch-one',
        ],
    ]))->assertRedirect();
    $this->post(route('client-acquisition.store'), validClientProjectPayload([
        'attribution' => [
            'utm_source' => 'second-source',
            'utm_campaign' => 'launch-two',
            'landing_page' => '/start-project?utm_campaign=launch-two',
        ],
    ]))->assertRedirect();

    $contact = $owner->contacts()->where('email', 'selam@example.com')->firstOrFail();
    expect(data_get($contact->client_project, 'attribution.utm_source'))->toBe('first-source')
        ->and(data_get($contact->submissions()->latest()->firstOrFail()->attribution, 'utm_source'))->toBe('second-source');
});

test('saving scoring rules recalculates existing project lead scores', function () {
    $owner = User::factory()->create();
    config(['business-audit.owner_id' => $owner->id, 'business.owner_email' => $owner->email]);
    $this->post(route('client-acquisition.store'), validClientProjectPayload())->assertRedirect();
    $contact = $owner->contacts()->where('email', 'selam@example.com')->firstOrFail();
    $previousScore = $contact->lead_score;
    $settings = ClientAcquisitionSettings::defaults();
    $settings['scoring_weights']['service_fit'] = 0;

    $this->actingAs($owner)->put(route('client-acquisition.settings.update'), $settings)->assertRedirect();

    expect($contact->fresh()->lead_score)->toBe($previousScore - 25)
        ->and($contact->fresh()->last_scored_at)->not->toBeNull();
});

test('project requests reject mismatched markets and invalid option keys', function () {
    $owner = User::factory()->create();
    config(['business-audit.owner_id' => $owner->id, 'business.owner_email' => $owner->email]);

    $this->post(route('client-acquisition.store'), validClientProjectPayload([
        'market' => 'international',
        'country' => 'Kenya',
        'budget' => 'etb_100000_500000',
        'service_interests' => ['not-a-service'],
    ]))->assertSessionHasErrors(['budget', 'service_interests.0']);

    $this->assertDatabaseMissing('contacts', ['email' => 'selam@example.com']);
});

test('project funnel records linked experiment assignment on conversion and submission', function () {
    $owner = User::factory()->create();
    config(['business-audit.owner_id' => $owner->id, 'business.owner_email' => $owner->email]);
    $funnel = createPublishedClientAnalyticsFunnel($owner);
    $variant = $funnel->variants()->create([
        'name' => 'Alternative hero',
        'content' => [
            'sections' => [[
                'columns' => [[
                    'blocks' => [
                        ['type' => 'text', 'content' => ['html' => '<h1>Build a better business</h1>']],
                        ['type' => 'button', 'content' => ['label' => 'Plan my project']],
                    ],
                ]],
            ]],
        ],
        'settings' => [],
        'weight' => 100,
        'is_active' => true,
    ]);
    ClientAcquisitionSettings::query()->create([
        'user_id' => $owner->id,
        'services' => config('client-acquisition.services'),
        'budgets' => config('client-acquisition.budgets'),
        'timelines' => config('client-acquisition.timelines'),
        'scoring_weights' => config('client-acquisition.scoring_weights'),
        'qualified_score' => 70,
        'analytics_funnel_id' => $funnel->id,
    ]);
    $sessionId = 'd4aaac82-e654-4c8d-9c22-2cdea9cf0a17';
    $funnel->events()->create([
        'event_type' => 'view',
        'session_id' => hash('sha256', $sessionId),
        'variant_id' => $variant->id,
        'occurred_at' => now(),
    ]);

    $this->withoutVite()
        ->get(route('client-acquisition.show'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('experiment.variant_id', $variant->id)
            ->where('experiment.headline', 'Build a better business')
            ->where('experiment.call_to_action', 'Plan my project'));

    $this->withCookie('of_variant_'.$funnel->id, (string) $variant->id)
        ->post(route('client-acquisition.store'), validClientProjectPayload([
            'session_id' => $sessionId,
            'variant_id' => $variant->id,
        ]))->assertRedirect();

    $contact = $owner->contacts()->where('email', 'selam@example.com')->firstOrFail();

    $this->assertDatabaseHas('contact_submissions', [
        'contact_id' => $contact->id,
        'funnel_id' => $funnel->id,
        'variant_id' => $variant->id,
    ]);
    $this->assertDatabaseHas('funnel_events', [
        'funnel_id' => $funnel->id,
        'variant_id' => $variant->id,
        'event_type' => 'conversion',
        'contact_id' => $contact->id,
        'submission_id' => $contact->submissions()->firstOrFail()->id,
    ]);
    $this->assertDatabaseHas('funnel_events', [
        'funnel_id' => $funnel->id,
        'event_type' => 'view',
        'contact_id' => $contact->id,
    ]);

    expect($funnel->fresh()->conversions)->toBe(1);

    $this->withCookie('of_variant_'.$funnel->id, (string) $variant->id)
        ->post(route('client-acquisition.store'), validClientProjectPayload())
        ->assertStatus(422);
    expect($contact->fresh()->submissions()->count())->toBe(1);
});

test('an unpublished linked funnel pauses analytics without breaking the public project request', function () {
    $owner = User::factory()->create();
    config(['business-audit.owner_id' => $owner->id, 'business.owner_email' => $owner->email]);
    $funnel = createPublishedClientAnalyticsFunnel($owner);
    ClientAcquisitionSettings::query()->create([
        'user_id' => $owner->id,
        'services' => config('client-acquisition.services'),
        'budgets' => config('client-acquisition.budgets'),
        'timelines' => config('client-acquisition.timelines'),
        'scoring_weights' => config('client-acquisition.scoring_weights'),
        'qualified_score' => 70,
        'analytics_funnel_id' => $funnel->id,
    ]);
    $funnel->unpublish();

    $this->withoutVite()
        ->get(route('client-acquisition.show'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('settings.analytics_funnel_id', null)
            ->where('experiment.variant_id', null));

    $this->post(route('client-acquisition.store'), validClientProjectPayload())->assertRedirect();

    expect($owner->contacts()->where('email', 'selam@example.com')->firstOrFail()->funnel_id)->toBeNull();
    $this->withoutVite()
        ->actingAs($owner)
        ->get(route('client-acquisition.settings.edit'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('analyticsFunnelUnavailable', true));
});

test('client acquisition settings remain restricted to the configured owner', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    config(['business-audit.owner_id' => $owner->id, 'business.owner_email' => $owner->email]);

    $this->actingAs($otherUser)
        ->get(route('client-acquisition.settings.edit'))
        ->assertForbidden();

    $this->withoutVite()
        ->actingAs($owner)
        ->get(route('client-acquisition.settings.edit'))
        ->assertOk();
});

test('settings cannot link analytics to a funnel owned by another user', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $foreignFunnel = createPublishedClientAnalyticsFunnel($otherUser, [
        'name' => 'Foreign funnel',
        'slug' => 'foreign-funnel',
    ]);
    config(['business-audit.owner_id' => $owner->id, 'business.owner_email' => $owner->email]);

    $this->actingAs($owner)
        ->put(route('client-acquisition.settings.update'), [
            ...ClientAcquisitionSettings::defaults(),
            'analytics_funnel_id' => $foreignFunnel->id,
        ])
        ->assertSessionHasErrors('analytics_funnel_id');

    expect($owner->clientAcquisitionSettings()->exists())->toBeFalse();
});

test('CRM contact detail includes private project qualification and scoring details for its owner', function () {
    $owner = User::factory()->create(['email' => 'owner@example.test']);
    config(['business.owner_email' => $owner->email]);
    $contact = $owner->contacts()->create([
        'email' => 'selam@example.com',
        'name' => 'Selam Tesfaye',
        'source' => 'client_acquisition',
        'status' => 'qualified',
        'client_project' => [
            'business_name' => 'Addis Studio',
            'market' => 'ethiopia',
            'country' => 'Ethiopia',
            'service_interests' => ['web_app'],
            'service_labels' => ['Website or web application'],
            'project_description' => 'A private project summary.',
            'budget_label' => 'ETB 100,000–500,000',
            'timeline_label' => 'Within one month',
            'social_links' => [],
            'preferred_contact' => 'email',
            'marketing_consent' => false,
        ],
        'lead_score' => 50,
        'lead_score_breakdown' => ['service_fit' => 20],
        'lead_score_reasons' => [['key' => 'service_fit', 'points' => 20, 'reason' => 'Selected a service.']],
    ]);

    $this->actingAs($owner)
        ->withoutVite()
        ->get(route('contacts.show', $contact))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('contact-detail')
            ->where('contact.client_project.business_name', 'Addis Studio')
            ->where('contact.lead_score_reasons.0.reason', 'Selected a service.'));

    $this->actingAs(User::factory()->create())
        ->get(route('contacts.show', $contact))
        ->assertForbidden();
});

test('signed confirmation cannot expose a different owner or another lead source', function () {
    $owner = User::factory()->create();
    $otherOwner = User::factory()->create();
    config(['business-audit.owner_id' => $owner->id, 'business.owner_email' => $owner->email]);
    $privateContact = $otherOwner->contacts()->create([
        'email' => 'private@example.com',
        'source' => 'client_acquisition',
    ]);

    $this->get(URL::temporarySignedRoute(
        'client-acquisition.thank-you',
        now()->addMinutes(30),
        ['contact' => $privateContact->id],
    ))->assertNotFound();
});
