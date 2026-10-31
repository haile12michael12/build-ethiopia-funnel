<?php

use App\Models\BookingPage;
use App\Models\MarketplacePurchase;
use App\Models\MarketplaceTemplate;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
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
    $owner = User::factory()->create(['email' => 'owner@example.test']);
    $product = businessStoreProduct();
    $ownOrder = businessPurchase($customer, $product, 'MKT-CUSTOMER-OWN');
    $otherOrder = businessPurchase($otherCustomer, $product, 'MKT-CUSTOMER-OTHER');
    $ownerContact = $owner->contacts()->create(['name' => 'Business Contact', 'email' => 'business-contact@example.test']);
    $customer->contacts()->create(['name' => 'Customer Contact', 'email' => 'customer-contact@example.test']);
    $otherCustomer->contacts()->create(['name' => 'Other Contact', 'email' => 'other-contact@example.test']);
    $ownerTask = $owner->followUpTasks()->create([
        'contact_id' => $ownerContact->id,
        'title' => 'Business follow-up',
        'due_at' => today()->setTime(12, 0),
    ]);
    $ownerBookingPage = BookingPage::query()->create([
        'user_id' => $owner->id,
        'title' => 'Business appointment',
        'slug' => 'business-appointment',
        'description' => 'Business appointment page.',
        'location' => 'Online',
        'duration_minutes' => 30,
        'buffer_minutes' => 0,
        'min_notice_minutes' => 0,
        'advance_days' => 14,
        'timezone' => 'Africa/Addis_Ababa',
        'availability' => [],
        'is_active' => true,
    ]);
    $ownerBooking = $ownerBookingPage->bookings()->create([
        'uuid' => (string) Str::uuid(),
        'manage_token' => Str::random(48),
        'invitee_name' => 'Business Guest',
        'invitee_email' => 'business-guest@example.test',
        'starts_at' => now()->subHours(2),
        'ends_at' => now()->subHours(2)->addMinutes(30),
        'status' => 'confirmed',
    ]);

    $this->actingAs($customer)
        ->get(route('dashboard'))->assertForbidden();
    $this->actingAs($customer)
        ->get(route('contacts.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('contacts.data', 1)
            ->where('contacts.data.0.id', $ownerContact->id));
    $this->actingAs($customer)
        ->patch(route('contacts.update', $ownerContact), ['status' => 'contacted'])
        ->assertRedirect();
    expect($ownerContact->fresh()->status)->toBe('contacted');
    $this->actingAs($customer)
        ->get(route('follow-up-tasks.index', ['view' => 'all']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('tasks.data', 1)
            ->where('tasks.data.0.id', $ownerTask->id));
    $this->actingAs($customer)
        ->patch(route('follow-up-tasks.update', $ownerTask), ['status' => 'completed'])
        ->assertRedirect();
    expect($ownerTask->fresh()->status)->toBe('completed');
    $this->actingAs($customer)
        ->get(route('appointments.index', ['view' => 'past']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('bookings.data', 1)
            ->where('bookings.data.0.id', $ownerBooking->id));
    $this->actingAs($customer)
        ->patch(route('appointments.update', $ownerBooking), ['action' => 'completed'])
        ->assertRedirect();
    expect($ownerBooking->fresh()->status)->toBe('completed');
    $this->actingAs($customer)->get(route('booking-pages.index'))->assertForbidden();
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
    foreach (['services', 'products', 'projects', 'requests', 'orders', 'payments', 'content', 'settings'] as $area) {
        $this->actingAs($customer)->get('/admin/'.$area)->assertForbidden();
    }

    $this->actingAs($customer)->get('/dashboard')->assertOk();
    $this->actingAs($customer)->get('/dashboard/profile')->assertRedirect('/settings/profile');
    $this->actingAs($customer)->get('/dashboard/requests')->assertRedirect('/dashboard#requests');
    $this->actingAs($customer)->get('/dashboard/projects')->assertRedirect('/dashboard#projects');
    $this->actingAs($customer)->get('/dashboard/services')->assertRedirect('/services');
    $this->actingAs($customer)->get('/dashboard/products')->assertRedirect('/products');
    $this->actingAs($customer)->get('/dashboard/contact')->assertRedirect('/contact');

    $this->actingAs($customer)
        ->get('/dashboard/orders')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('account/orders/index')
            ->has('orders.data', 1)
            ->where('orders.data.0.id', $ownOrder->id));
    $this->actingAs($customer)->get('/dashboard/orders/'.$ownOrder->id)->assertOk();
    $this->actingAs($customer)->get('/dashboard/orders/'.$otherOrder->id)->assertNotFound();

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
    $this->actingAs($owner)->get('/dashboard')->assertRedirect('/admin');
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
