<?php

use App\Models\MarketplacePurchase;
use App\Models\MarketplaceTemplate;
use App\Models\MarketplaceWebhookEvent;
use App\Models\User;
use App\Services\Marketplace\MarketplaceAccessService;
use Database\Seeders\MarketplaceCatalogSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

function marketplaceTemplate(array $attributes = []): MarketplaceTemplate
{
    return MarketplaceTemplate::query()->create([
        'slug' => 'test-template',
        'type' => 'template',
        'name' => 'Test Template',
        'description' => 'A test marketplace template.',
        'tech_stack' => ['React', 'TypeScript'],
        'included_modules' => ['authentication'],
        'version' => '1.0.0',
        'license' => 'Personal use',
        'status' => 'published',
        'amount_minor' => 12500,
        'currency' => 'ETB',
        'file_path' => 'marketplace/test-template/template.zip',
        ...$attributes,
    ]);
}

function successfulChapaVerify(string $txRef, int $amountMinor = 12500, string $currency = 'ETB'): void
{
    Http::fake([
        "api.chapa.co/v1/transaction/verify/{$txRef}" => Http::response([
            'status' => 'success',
            'data' => [
                'tx_ref' => $txRef,
                'status' => 'success',
                'amount' => number_format($amountMinor / 100, 2, '.', ''),
                'currency' => $currency,
                'id' => 'chapa-txn-123',
            ],
        ]),
    ]);
}

beforeEach(function () {
    test()->withoutVite();
    config([
        'services.chapa.secret_key' => 'test-secret-key',
        'services.chapa.webhook_secret' => 'test-webhook-secret',
    ]);
    Storage::fake('local');
});

test('marketplace catalog only lists published products and contributor submissions await review', function () {
    marketplaceTemplate(['slug' => 'public-template']);
    marketplaceTemplate(['slug' => 'private-template', 'status' => 'pending_review']);

    $this->get(route('marketplace.index'))
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('marketplace/index')
            ->has('products', 1)
            ->where('products.0.slug', 'public-template'));

    $owner = User::factory()->create();
    $this->actingAs($owner)->post(route('marketplace.submissions.store'), [
        'type' => 'template',
        'name' => 'Contributor Starter',
        'description' => 'A contributed starter project.',
        'tech_stack' => ['React', 'Node.js'],
        'included_modules' => ['authentication', 'testing'],
        'version' => '1.0.0',
        'license' => 'Personal use',
    ])->assertRedirect(route('marketplace.index'));

    expect($owner->marketplaceTemplates()->where('name', 'Contributor Starter')->value('status'))->toBe('pending_review');
});

test('curated marketplace catalog seeds templates, a bundle and a deferred membership', function () {
    $this->seed(MarketplaceCatalogSeeder::class);

    expect(MarketplaceTemplate::query()->where('status', 'published')->count())->toBe(10)
        ->and(MarketplaceTemplate::query()->where('type', 'template')->count())->toBe(8)
        ->and(MarketplaceTemplate::query()->where('type', 'bundle')->whereHas('bundleItems')->exists())->toBeTrue()
        ->and(MarketplaceTemplate::query()->where('type', 'membership')->whereNull('amount_minor')->exists())->toBeTrue();
});

test('checkout creates a pending purchase and grants access only after provider verification', function () {
    $buyer = User::factory()->create();
    $template = marketplaceTemplate();
    Http::fake([
        'api.chapa.co/v1/transaction/initialize' => Http::response([
            'status' => 'success',
            'data' => ['checkout_url' => 'https://checkout.chapa.co/checkout/payment/test'],
        ]),
    ]);

    $this->actingAs($buyer)->post(route('marketplace.checkout', $template->slug))
        ->assertRedirect('https://checkout.chapa.co/checkout/payment/test');

    $purchase = MarketplacePurchase::query()->firstOrFail();
    expect($purchase->status)->toBe('pending')
        ->and($purchase->contributor_share_percent)->toBe('0.00')
        ->and(app(MarketplaceAccessService::class)->hasAccess($buyer, $template))->toBeFalse();
    Http::assertSent(fn ($request) => $request->url() === 'https://api.chapa.co/v1/transaction/initialize'
        && $request['amount'] === '125.00'
        && $request['currency'] === 'ETB'
        && $request['tx_ref'] === $purchase->tx_ref);

    successfulChapaVerify($purchase->tx_ref);
    $this->actingAs($buyer)->get(route('marketplace.checkout.return', ['tx_ref' => $purchase->tx_ref]))
        ->assertRedirect(route('marketplace.show', $template->slug));

    expect($purchase->fresh()->status)->toBe('paid')
        ->and($purchase->fresh()->paid_at)->not->toBeNull()
        ->and(app(MarketplaceAccessService::class)->hasAccess($buyer, $template))->toBeTrue();
});

test('checkout cannot be forged by a return with mismatched payment details', function () {
    $buyer = User::factory()->create();
    $template = marketplaceTemplate();
    $purchase = MarketplacePurchase::query()->create([
        'buyer_id' => $buyer->id,
        'template_id' => $template->id,
        'tx_ref' => 'MKT-MISMATCH-123',
        'amount_minor' => 12500,
        'currency' => 'ETB',
        'status' => 'pending',
    ]);
    successfulChapaVerify($purchase->tx_ref, 12499);

    $this->actingAs($buyer)->get(route('marketplace.checkout.return', ['tx_ref' => $purchase->tx_ref]))
        ->assertRedirect(route('marketplace.show', $template->slug))
        ->assertSessionHas('error');

    expect($purchase->fresh()->status)->toBe('pending')
        ->and(app(MarketplaceAccessService::class)->hasAccess($buyer, $template))->toBeFalse();
});

test('a late verified payment can still fulfill after checkout initialization timed out', function () {
    $buyer = User::factory()->create();
    $template = marketplaceTemplate();
    $purchase = MarketplacePurchase::query()->create([
        'buyer_id' => $buyer->id,
        'template_id' => $template->id,
        'tx_ref' => 'MKT-LATE-SUCCESS',
        'amount_minor' => 12500,
        'currency' => 'ETB',
        'status' => 'failed',
    ]);
    successfulChapaVerify($purchase->tx_ref);
    $payload = json_encode(['tx_ref' => $purchase->tx_ref], JSON_THROW_ON_ERROR);
    $signature = hash_hmac('sha256', $payload, 'test-webhook-secret');

    $this->call('POST', route('marketplace.chapa.webhook'), [], [], [], [
        'CONTENT_TYPE' => 'application/json',
        'HTTP_X_CHAPA_SIGNATURE' => $signature,
    ], $payload)->assertOk();

    expect($purchase->fresh()->status)->toBe('paid')
        ->and(app(MarketplaceAccessService::class)->hasAccess($buyer, $template))->toBeTrue();
});

test('signed Chapa webhook verifies transaction and processes duplicate deliveries idempotently', function () {
    $buyer = User::factory()->create();
    $template = marketplaceTemplate();
    $purchase = MarketplacePurchase::query()->create([
        'buyer_id' => $buyer->id,
        'template_id' => $template->id,
        'tx_ref' => 'MKT-WEBHOOK-123',
        'amount_minor' => 12500,
        'currency' => 'ETB',
        'status' => 'pending',
    ]);
    successfulChapaVerify($purchase->tx_ref);
    $payload = json_encode(['tx_ref' => $purchase->tx_ref, 'status' => 'success'], JSON_THROW_ON_ERROR);
    $signature = hash_hmac('sha256', $payload, 'test-webhook-secret');

    $this->call('POST', route('marketplace.chapa.webhook'), [], [], [], [
        'CONTENT_TYPE' => 'application/json',
        'HTTP_X_CHAPA_SIGNATURE' => $signature,
    ], $payload)->assertOk();
    $this->call('POST', route('marketplace.chapa.webhook'), [], [], [], [
        'CONTENT_TYPE' => 'application/json',
        'HTTP_X_CHAPA_SIGNATURE' => $signature,
    ], $payload)->assertOk();

    expect($purchase->fresh()->status)->toBe('paid')
        ->and(MarketplaceWebhookEvent::query()->count())->toBe(1)
        ->and(MarketplaceWebhookEvent::query()->firstOrFail()->status)->toBe('processed');
});

test('unsigned Chapa webhook is rejected', function () {
    Http::preventStrayRequests();
    $this->postJson(route('marketplace.chapa.webhook'), ['tx_ref' => 'MKT-FAKE'])
        ->assertUnauthorized();
});

test('Chapa secret signature header is accepted and missing webhook configuration disables checkout', function () {
    $buyer = User::factory()->create();
    $template = marketplaceTemplate();
    config(['services.chapa.webhook_secret' => null]);

    $this->get(route('marketplace.show', $template->slug))
        ->assertInertia(fn ($page) => $page->where('checkoutEnabled', false));
    $this->actingAs($buyer)->post(route('marketplace.checkout', $template->slug))
        ->assertServiceUnavailable();

    config(['services.chapa.webhook_secret' => 'test-webhook-secret']);
    $purchase = MarketplacePurchase::query()->create([
        'buyer_id' => $buyer->id,
        'template_id' => $template->id,
        'tx_ref' => 'MKT-SECRET-SIGNATURE',
        'amount_minor' => 12500,
        'currency' => 'ETB',
        'status' => 'pending',
    ]);
    successfulChapaVerify($purchase->tx_ref);
    $payload = json_encode(['tx_ref' => $purchase->tx_ref], JSON_THROW_ON_ERROR);
    $signature = hash_hmac('sha256', 'test-webhook-secret', 'test-webhook-secret');

    $this->call('POST', route('marketplace.chapa.webhook'), [], [], [], [
        'CONTENT_TYPE' => 'application/json',
        'HTTP_CHAPA_SIGNATURE' => $signature,
    ], $payload)->assertOk();

    expect($purchase->fresh()->status)->toBe('paid');
});

test('unpriced products cannot start Chapa checkout', function () {
    $buyer = User::factory()->create();
    $template = marketplaceTemplate(['slug' => 'unpriced-template', 'amount_minor' => null]);

    $this->actingAs($buyer)->post(route('marketplace.checkout', $template->slug))
        ->assertUnprocessable();
    expect(MarketplacePurchase::query()->exists())->toBeFalse();
});

test('download access is private and a paid bundle unlocks included templates', function () {
    Storage::disk('local')->put('marketplace/test-template/template.zip', 'zip-data');
    $buyer = User::factory()->create();
    $otherUser = User::factory()->create();
    $template = marketplaceTemplate();
    $bundle = marketplaceTemplate([
        'slug' => 'test-bundle',
        'type' => 'bundle',
        'name' => 'Test Bundle',
        'file_path' => null,
        'amount_minor' => 25000,
    ]);
    $bundle->bundleItems()->attach($template);

    $this->actingAs($otherUser)->get(route('marketplace.download', $template->slug))->assertForbidden();

    MarketplacePurchase::query()->create([
        'buyer_id' => $buyer->id,
        'template_id' => $bundle->id,
        'tx_ref' => 'MKT-BUNDLE-123',
        'amount_minor' => 25000,
        'currency' => 'ETB',
        'status' => 'paid',
        'paid_at' => now(),
    ]);

    expect(app(MarketplaceAccessService::class)->hasAccess($buyer, $template))->toBeTrue();
    $this->actingAs($buyer)->get(route('marketplace.download', $template->slug))
        ->assertOk()
        ->assertDownload('test-template.zip');
});

test('membership checkout remains explicitly disabled until recurring billing is supported', function () {
    $member = User::factory()->create();
    $membership = marketplaceTemplate([
        'slug' => 'pro-membership',
        'type' => 'membership',
        'name' => 'Pro Membership',
        'file_path' => null,
    ]);

    $this->actingAs($member)->post(route('marketplace.checkout', $membership->slug))
        ->assertUnprocessable();
    expect(MarketplacePurchase::query()->exists())->toBeFalse();
});

test('reviewers must explicitly publish listings and private template artifacts are required', function () {
    $reviewer = User::factory()->create(['email' => 'reviewer@example.test']);
    $template = marketplaceTemplate([
        'slug' => 'awaiting-artifact',
        'status' => 'pending_review',
        'file_path' => null,
    ]);
    config(['marketplace.reviewer_emails' => ['reviewer@example.test']]);

    $this->actingAs($reviewer)->put(route('marketplace.review.update', $template), [
        'status' => 'published',
        'amount' => '200.00',
        'currency' => 'ETB',
        'license' => 'Personal use',
        'contributor_revenue_share_percent' => 70,
    ])->assertSessionHasErrors('file');

    $this->actingAs($reviewer)->put(route('marketplace.review.update', $template), [
        'status' => 'published',
        'amount' => '200.00',
        'currency' => 'ETB',
        'license' => 'Personal use',
        'contributor_revenue_share_percent' => 70,
        'file' => UploadedFile::fake()->create('template.zip', 10, 'application/zip'),
    ])->assertRedirect(route('marketplace.review.index'));

    expect($template->fresh()->status)->toBe('published')
        ->and($template->fresh()->amount_minor)->toBe(20000)
        ->and($template->fresh()->file_path)->not->toBeNull();
});
