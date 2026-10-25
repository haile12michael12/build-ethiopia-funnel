<?php

use App\Models\MarketplaceTemplate;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function marketAuditPayload(array $overrides = []): array
{
    return array_replace([
        'name' => 'Selam Tesfaye',
        'business_name' => 'Addis Design Studio',
        'email' => 'selam@example.com',
        'phone' => '0911 223344',
        'website' => 'https://addis.example.com',
        'website_status' => 'live',
        'service_interests' => ['website', 'marketing'],
        'budget' => 'over_500000',
        'timeline' => 'within_1_month',
    ], $overrides);
}

test('international audit stores USD budget and market without converting currencies', function () {
    $owner = User::factory()->create();
    config(['business-audit.owner_id' => $owner->id]);

    $this->post(route('business-audit.store'), marketAuditPayload([
        'market' => 'international',
        'country' => 'Kenya',
        'budget' => 'usd_over_5000',
    ]))->assertRedirect();

    $contact = $owner->contacts()->where('email', 'selam@example.com')->firstOrFail();

    expect(data_get($contact->business_audit, 'market'))->toBe('international')
        ->and(data_get($contact->business_audit, 'country'))->toBe('Kenya')
        ->and(data_get($contact->business_audit, 'budget_currency'))->toBe('USD')
        ->and(data_get($contact->business_audit, 'budget'))->toBe('usd_over_5000')
        ->and($contact->lead_score_breakdown['budget'])->toBe(30)
        ->and($contact->lead_score)->toBe(85);
});

test('audit rejects budget bands that do not match the selected market currency', function () {
    $owner = User::factory()->create();
    config(['business-audit.owner_id' => $owner->id]);

    $this->post(route('business-audit.store'), marketAuditPayload([
        'market' => 'international',
        'budget' => 'under_25000',
    ]))->assertSessionHasErrors('budget');

    $this->post(route('business-audit.store'), marketAuditPayload([
        'market' => 'ethiopia',
        'budget' => 'usd_250_1000',
    ]))->assertSessionHasErrors('budget');

    $this->assertDatabaseMissing('contacts', ['email' => 'selam@example.com']);
});

test('audit thank-you recommends only published catalog products that match requested services', function () {
    $owner = User::factory()->create();
    config(['business-audit.owner_id' => $owner->id]);
    MarketplaceTemplate::query()->create([
        'slug' => 'n8n-automation-toolkit',
        'name' => 'n8n Automation Toolkit',
        'description' => 'Ready-made n8n workflows for lead follow-up.',
        'amount_minor' => 450000,
        'currency' => 'ETB',
        'status' => 'published',
    ]);
    MarketplaceTemplate::query()->create([
        'slug' => 'restaurant-menu-pack',
        'name' => 'Restaurant Menu Pack',
        'description' => 'A printable menu design bundle.',
        'amount_minor' => 100000,
        'currency' => 'ETB',
        'status' => 'published',
    ]);
    MarketplaceTemplate::query()->create([
        'slug' => 'draft-automation',
        'name' => 'Draft Automation Bundle',
        'description' => 'Automation workflows still awaiting review.',
        'amount_minor' => 200000,
        'currency' => 'ETB',
        'status' => 'pending_review',
    ]);

    $response = $this->post(route('business-audit.store'), marketAuditPayload([
        'service_interests' => ['automation'],
    ]))->assertRedirect();

    $this->withoutVite()
        ->get($response->headers->get('Location'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('audit/thank-you')
            ->where('audit.market', 'ethiopia')
            ->where('audit.budget_currency', 'ETB')
            ->where('audit.report.products', fn ($products): bool => $products instanceof Collection
                && $products->count() === 1
                && $products[0]['name'] === 'n8n Automation Toolkit'
                && $products[0]['price_display'] === '4,500.00 ETB'
                && $products[0]['url'] === '/marketplace/n8n-automation-toolkit'));
});
