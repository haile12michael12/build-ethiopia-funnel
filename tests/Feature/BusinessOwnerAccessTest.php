<?php

use App\Models\MarketplacePurchase;
use App\Models\MarketplaceTemplate;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function businessStoreProduct(array $attributes = []): MarketplaceTemplate
{
    return MarketplaceTemplate::query()->create([
        'slug' => 'business-product',
        'type' => 'template',
        'name' => 'Business Product',
        'description' => 'A digital product for customers.',
        'tech_stack' => ['Laravel'],
        'included_modules' => ['documentation'],
        'version' => '1.0.0',
        'license' => 'Personal use',
        'status' => 'published',
        'amount_minor' => 2500,
        'currency' => 'ETB',
        'file_path' => 'marketplace/business-product/product.zip',
        ...$attributes,
    ]);
}

function businessPurchase(User $buyer, MarketplaceTemplate $product, string $reference): MarketplacePurchase
{
    return MarketplacePurchase::query()->create([
        'buyer_id' => $buyer->id,
        'template_id' => $product->id,
        'tx_ref' => $reference,
        'amount_minor' => $product->amount_minor,
        'currency' => $product->currency,
        'status' => 'paid',
        'paid_at' => now(),
    ]);
}

beforeEach(function () {
    $this->withoutVite();
    config(['business.owner_email' => 'owner@example.test']);
});

test('customers cannot access owner management routes but can use their own account', function () {
    $customer = User::factory()->create();
    $otherCustomer = User::factory()->create();
    $product = businessStoreProduct();
    $ownOrder = businessPurchase($customer, $product, 'MKT-CUSTOMER-OWN');
    $otherOrder = businessPurchase($otherCustomer, $product, 'MKT-CUSTOMER-OTHER');

    $this->actingAs($customer)
        ->get(route('dashboard'))->assertForbidden();
    $this->actingAs($customer)
        ->get(route('contacts.index'))->assertForbidden();
    $this->actingAs($customer)
        ->get(route('site-content.index', 'service'))->assertForbidden();
    $this->actingAs($customer)
        ->get(route('workspaces.index'))->assertForbidden();
    $this->actingAs($customer)
        ->get(route('marketplace.review.index'))->assertForbidden();
    $this->actingAs($customer)
        ->get(route('marketplace.orders.index'))->assertForbidden();
    $this->actingAs($customer)
        ->post(route('marketplace.submissions.store'), [])->assertForbidden();

    $this->actingAs($customer)
        ->get(route('account.orders.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('account/orders/index')
            ->has('orders.data', 1)
            ->where('orders.data.0.id', $ownOrder->id));

    $this->actingAs($customer)
        ->get(route('account.orders.show', $ownOrder))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('account/orders/show')
            ->where('order.reference', 'MKT-CUSTOMER-OWN'));

    $this->actingAs($customer)
        ->get(route('account.orders.show', $otherOrder))
        ->assertNotFound();
});

test('the configured existing owner retains access to the business dashboard and product review', function () {
    $owner = User::factory()->create(['email' => 'owner@example.test']);

    $this->actingAs($owner)->get(route('dashboard'))->assertOk();
    $this->actingAs($owner)->get(route('marketplace.review.index'))->assertOk();
    $this->actingAs($owner)->get(route('marketplace.orders.index'))->assertOk();
});

test('owner management access fails closed when the owner email is not configured', function () {
    config(['business.owner_email' => '']);
    $user = User::factory()->create();

    $this->actingAs($user)->get(route('dashboard'))->assertForbidden();
});

test('the storefront hides contributor products while retaining curated products', function () {
    $owner = User::factory()->create(['email' => 'owner@example.test']);
    $contributor = User::factory()->create();
    businessStoreProduct(['slug' => 'curated-product']);
    businessStoreProduct([
        'owner_id' => $owner->id,
        'slug' => 'owner-product',
    ]);
    businessStoreProduct([
        'owner_id' => $contributor->id,
        'slug' => 'contributor-product',
    ]);

    $this->get(route('marketplace.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('products.data', 2)
            ->where('canReview', false));

    $this->get(route('marketplace.show', 'contributor-product'))->assertNotFound();
    $this->get(route('marketplace.show', 'owner-product'))->assertOk();
});
