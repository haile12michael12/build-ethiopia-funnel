<?php

use App\Models\Funnel;
use App\Models\FunnelExperiment;
use App\Models\User;
use App\Services\FunnelExperimentEvaluator;
use App\Services\FunnelVariantResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;

uses(RefreshDatabase::class);

function experimentTestFunnel(User $user): Funnel
{
    return $user->funnels()->create([
        'name' => 'Experiment funnel',
        'slug' => 'experiment-funnel-'.random_int(1000, 9999),
        'content' => ['sections' => []],
        'settings' => [],
        'status' => 'published',
        'is_published' => true,
        'published_at' => now(),
    ]);
}

function createRunningExperiment(Funnel $funnel, int $variantId, array $overrides = []): FunnelExperiment
{
    return $funnel->experiments()->create(array_replace([
        'user_id' => $funnel->user_id,
        'name' => 'Hero test',
        'hypothesis' => 'A clearer headline may increase submitted inquiries.',
        'target_step' => 'hero',
        'primary_metric' => 'conversion_rate',
        'guardrail_metrics' => ['form_validation_errors'],
        'allocations' => [['variant_id' => $variantId, 'weight' => 40]],
        'status' => 'running',
        'starts_at' => now()->subDay(),
        'ends_at' => null,
        'activity_history' => [],
    ], $overrides));
}

test('experiment assignment is first-party stable and retains a control allocation', function () {
    $funnel = experimentTestFunnel(User::factory()->create());
    $variant = $funnel->variants()->create([
        'name' => 'Alternative',
        'content' => ['sections' => []],
        'settings' => [],
        'weight' => 50,
        'is_active' => false,
    ]);
    $experiment = createRunningExperiment($funnel, $variant->id);
    $resolver = new FunnelVariantResolver;
    $firstAssignment = $resolver->resolve($funnel, Request::create('/f/'.$funnel->slug));

    expect($firstAssignment['experiment_id'])->toBe($experiment->id)
        ->and($firstAssignment['experiment_cookie_value'])->toStartWith($experiment->id.':');

    $stableAssignment = $resolver->resolve($funnel, Request::create('/f/'.$funnel->slug, 'GET', [], [
        $firstAssignment['experiment_cookie'] => $firstAssignment['experiment_cookie_value'],
    ]));
    expect($stableAssignment['experiment_cookie_value'])->toBe($firstAssignment['experiment_cookie_value'])
        ->and($stableAssignment['variant']?->id)->toBe($firstAssignment['variant']?->id);
});

test('public exposures and confirmed submissions are tied to the active experiment assignment', function () {
    $user = User::factory()->create();
    $funnel = experimentTestFunnel($user);
    $variant = $funnel->variants()->create([
        'name' => 'Alternative',
        'content' => ['sections' => []],
        'settings' => [],
        'weight' => 50,
        'is_active' => false,
    ]);
    $experiment = createRunningExperiment($funnel, $variant->id);
    $sessionId = '6cc246c3-5b82-45c0-8b71-5d52555db782';
    $cookieName = 'of_experiment_'.$funnel->id;
    $preview = $this->withoutVite()->get(route('funnels.show', $funnel->slug))->assertOk();
    $assignedVariantId = $preview->viewData('page')['props']['funnel']['variant_id'] ?? null;
    $assignmentCookie = $preview->getCookie($cookieName)->getValue();
    $legacyCookie = $preview->getCookie('of_variant_'.$funnel->id)->getValue();

    $exposure = $this->withCredentials()
        ->withCookie('of_variant_'.$funnel->id, $legacyCookie)
        ->withCookie($cookieName, $assignmentCookie)
        ->postJson(route('funnels.events.store', $funnel), [
            'event_type' => 'view',
            'event_id' => 'a148263a-17ce-40ad-a0c9-8d5e6b4232b2',
            'session_id' => $sessionId,
            'variant_id' => $assignedVariantId,
            'experiment_id' => $experiment->id,
        ]);
    $exposure->assertAccepted();

    $this->withCredentials()
        ->withCookie('of_variant_'.$funnel->id, $legacyCookie)
        ->withCookie($cookieName, $assignmentCookie)
        ->post(route('funnels.leads.store', $funnel), [
            'email' => 'experiment-lead@example.com',
            'session_id' => $sessionId,
            'variant_id' => $assignedVariantId,
            'experiment_id' => $experiment->id,
        ])->assertRedirect();

    $this->assertDatabaseHas('contact_submissions', [
        'funnel_id' => $funnel->id,
        'variant_id' => $assignedVariantId,
        'experiment_id' => $experiment->id,
    ]);
    $this->assertDatabaseHas('funnel_events', [
        'funnel_id' => $funnel->id,
        'event_type' => 'conversion',
        'variant_id' => $assignedVariantId,
        'experiment_id' => $experiment->id,
    ]);

    $evaluation = (new FunnelExperimentEvaluator)->evaluate($experiment->fresh());
    $variantResult = collect($evaluation['variants'])->firstWhere('variant_id', $assignedVariantId);
    expect($variantResult['eligible_sessions'])->toBe(1)
        ->and($variantResult['exposures'])->toBe(1)
        ->and($variantResult['numerator'])->toBe(1)
        ->and($variantResult['denominator'])->toBe(1)
        ->and($evaluation['conclusion'])->toBe('inconclusive');
});

test('experiment lifecycle validates control traffic and enforces owner authorization', function () {
    $owner = User::factory()->create();
    $funnel = experimentTestFunnel($owner);
    $variant = $funnel->variants()->create([
        'name' => 'Alternative',
        'content' => ['sections' => []],
        'settings' => [],
        'weight' => 100,
        'is_active' => false,
    ]);

    $this->actingAs($owner)->postJson(route('funnels.experiments.store', $funnel), [
        'name' => 'No control experiment',
        'hypothesis' => 'Test a concrete headline.',
        'primary_metric' => 'conversion_rate',
        'allocations' => [['variant_id' => $variant->id, 'weight' => 100]],
    ])->assertUnprocessable()->assertJsonValidationErrors('allocations.0.weight');

    $draft = $this->actingAs($owner)->postJson(route('funnels.experiments.store', $funnel), [
        'name' => 'Measured headline',
        'hypothesis' => 'Test a concrete headline.',
        'primary_metric' => 'conversion_rate',
        'allocations' => [['variant_id' => $variant->id, 'weight' => 40]],
        'guardrail_metrics' => ['form_validation_errors'],
    ])->assertCreated();
    $experimentId = (int) $draft->json('id');
    $this->assertDatabaseHas('funnel_experiments', ['id' => $experimentId, 'status' => 'draft']);

    $this->actingAs($owner)
        ->patch(route('funnels.experiments.status', [$funnel, $experimentId]), ['status' => 'running'])
        ->assertRedirect();
    expect(FunnelExperiment::findOrFail($experimentId)->isAcceptingTraffic())->toBeTrue();
    $this->actingAs($owner)
        ->patch(route('funnels.experiments.status', [$funnel, $experimentId]), ['status' => 'paused'])
        ->assertRedirect();
    expect(FunnelExperiment::findOrFail($experimentId)->isAcceptingTraffic())->toBeFalse();

    $this->actingAs(User::factory()->create())
        ->patchJson(route('funnels.experiments.status', [$funnel, $experimentId]), ['status' => 'running'])
        ->assertForbidden();
});

test('experiment stops accepting traffic after pause', function () {
    $funnel = experimentTestFunnel(User::factory()->create());
    $variant = $funnel->variants()->create([
        'name' => 'Alternative',
        'content' => ['sections' => []],
        'settings' => [],
        'weight' => 50,
        'is_active' => false,
    ]);
    $experiment = createRunningExperiment($funnel, $variant->id);
    $experiment->recordStatus('paused', $funnel->user_id);

    expect($experiment->fresh()->isAcceptingTraffic())->toBeFalse();
});
