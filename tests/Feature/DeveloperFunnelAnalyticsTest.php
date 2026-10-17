<?php

use App\Models\FunnelEvent;
use App\Models\MarketplacePurchase;
use App\Models\MarketplaceTemplate;
use App\Models\User;
use App\Services\DeveloperFunnelInstaller;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('developer analytics summarize recorded events and verified marketplace purchases', function () {
    $this->withoutVite();
    $owner = User::factory()->create();
    $first = app(DeveloperFunnelInstaller::class)->installFor($owner);
    $quiz = $owner->funnels()->where('slug', 'developer-quiz')->firstOrFail();
    $variant = $first->variants()->firstOrFail();

    foreach ([
        ['view', 'visitor-a', null, ['utm_source' => 'newsletter']],
        ['quiz_completed', 'visitor-a', null, ['utm_source' => 'newsletter']],
        ['github_connected', 'visitor-a', null, []],
        ['branch_evaluated', 'visitor-a', null, []],
        ['conversion', 'visitor-a', $variant->id, ['utm_source' => 'newsletter']],
        ['lead_created', 'visitor-a', $variant->id, ['utm_source' => 'newsletter']],
        ['offer_viewed', 'visitor-b', null, []],
    ] as [$eventType, $session, $variantId, $attribution]) {
        FunnelEvent::query()->create([
            'funnel_id' => $quiz->id,
            'event_type' => $eventType,
            'session_id' => hash('sha256', $session),
            'variant_id' => $variantId,
            'attribution' => $attribution,
            'metadata' => [],
            'occurred_at' => now(),
        ]);
    }

    $template = MarketplaceTemplate::query()->create([
        'slug' => 'analytics-bundle',
        'owner_id' => $owner->id,
        'type' => 'bundle',
        'name' => 'Analytics bundle',
        'description' => 'A bundle',
        'tech_stack' => ['React'],
        'included_modules' => ['forms'],
        'version' => '1.0.0',
        'license' => 'Personal use',
        'status' => 'published',
        'amount_minor' => 5000,
        'currency' => 'ETB',
    ]);
    MarketplacePurchase::query()->create([
        'buyer_id' => $owner->id,
        'template_id' => $template->id,
        'tx_ref' => 'ANALYTICS-PAID-1',
        'amount_minor' => 5000,
        'currency' => 'ETB',
        'status' => 'paid',
        'paid_at' => now(),
    ]);
    MarketplacePurchase::query()->create([
        'buyer_id' => $owner->id,
        'template_id' => $template->id,
        'tx_ref' => 'ANALYTICS-PENDING-1',
        'amount_minor' => 5000,
        'currency' => 'ETB',
        'status' => 'pending',
        'checkout_url' => 'https://checkout.chapa.co/example',
    ]);

    $this->actingAs($owner)->get(route('developer-analytics.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('developer-analytics')
            ->where('metrics.unique_visitors', 1)
            ->where('metrics.quiz_completions', 1)
            ->where('metrics.github_profiles_connected', 1)
            ->where('metrics.quiz_branch_evaluations', 1)
            ->where('metrics.lead_conversions', 1)
            ->where('metrics.offer_views', 1)
            ->where('metrics.checkout_starts', 1)
            ->where('metrics.paid_purchases', 1)
            ->where('metrics.bundle_purchases', 1)
            ->where('attribution.0.source', 'newsletter')
            ->where('experiments.0.conversions', 1)
            ->where('revenue.0.currency', 'ETB')
            ->where('revenue.0.amount_minor', 5000));

    $anotherUser = User::factory()->create();
    $this->actingAs($anotherUser)->get(route('developer-analytics.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->where('metrics.unique_visitors', 0)
            ->where('metrics.paid_purchases', 0)
            ->where('revenue', []));
});
