<?php

use App\Models\BookingPage;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function ownerWithTools(): User
{
    config(['business.owner_email' => 'owner@example.test']);

    return User::factory()->create(['email' => 'owner@example.test']);
}

test('global search requires the business owner account', function () {
    ownerWithTools();
    $customer = User::factory()->create();

    $this->get(route('search', ['q' => 'meron']))->assertRedirect(route('login'));
    $this->actingAs($customer)->get(route('search', ['q' => 'meron']))->assertForbidden();
});

test('global search returns owner-scoped contacts, funnels, and bookings', function () {
    $owner = ownerWithTools();
    $other = User::factory()->create();

    $owner->contacts()->create(['name' => 'Meron Bekele', 'email' => 'meron@example.com', 'status' => 'new']);
    $other->contacts()->create(['name' => 'Meron Stranger', 'email' => 'stranger@example.com', 'status' => 'new']);

    $funnelDefaults = [
        'description' => null,
        'content' => ['sections' => []],
        'settings' => [],
        'status' => 'published',
        'is_published' => true,
        'views' => 0,
        'conversions' => 0,
        'conversion_rate' => 0,
    ];
    $owner->funnels()->create([...$funnelDefaults, 'name' => 'Meron landing', 'slug' => 'meron-landing']);
    $other->funnels()->create([...$funnelDefaults, 'name' => 'Meron other', 'slug' => 'meron-other']);

    $page = BookingPage::query()->create([
        'user_id' => $owner->id,
        'title' => 'Discovery call',
        'slug' => 'hdr-tools-call',
        'duration_minutes' => 30,
        'buffer_minutes' => 0,
        'min_notice_minutes' => 0,
        'advance_days' => 14,
        'timezone' => 'Africa/Addis_Ababa',
        'availability' => ['1' => [['start' => '09:00', 'end' => '12:00']], '2' => [], '3' => [], '4' => [], '5' => [], '6' => [], '7' => []],
        'is_active' => true,
    ]);
    $page->bookings()->create([
        'uuid' => (string) Illuminate\Support\Str::uuid(),
        'manage_token' => Illuminate\Support\Str::random(48),
        'invitee_name' => 'Meron Guest',
        'invitee_email' => 'guest@example.com',
        'starts_at' => now()->addDay(),
        'ends_at' => now()->addDay()->addMinutes(30),
        'status' => 'confirmed',
    ]);

    $response = $this->actingAs($owner)->get(route('search', ['q' => 'meron']))->assertOk();

    expect($response->json('groups.contacts'))->toHaveCount(1)
        ->and($response->json('groups.contacts.0.title'))->toBe('Meron Bekele')
        ->and($response->json('groups.funnels'))->toHaveCount(1)
        ->and($response->json('groups.bookings'))->toHaveCount(1);
});

test('global search validates the query length', function () {
    $owner = ownerWithTools();

    $this->actingAs($owner)->get(route('search', ['q' => 'x']))->assertUnprocessable();
});

function bookingsForNotifications(User $owner): BookingPage
{
    return BookingPage::query()->create([
        'user_id' => $owner->id,
        'title' => 'Strategy call',
        'slug' => 'notifications-call',
        'duration_minutes' => 30,
        'buffer_minutes' => 0,
        'min_notice_minutes' => 0,
        'advance_days' => 14,
        'timezone' => 'Africa/Addis_Ababa',
        'availability' => ['1' => [['start' => '09:00', 'end' => '12:00']], '2' => [], '3' => [], '4' => [], '5' => [], '6' => [], '7' => []],
        'is_active' => true,
    ]);
}

test('app notifications surface new bookings, today meetings, and overdue tasks', function () {
    $owner = ownerWithTools();
    $customer = User::factory()->create();

    $this->actingAs($customer)->get(route('app-notifications.index'))->assertForbidden();

    $page = bookingsForNotifications($owner);
    $page->bookings()->create([
        'uuid' => (string) Illuminate\Support\Str::uuid(),
        'manage_token' => Illuminate\Support\Str::random(48),
        'invitee_name' => 'Hanna Girma',
        'invitee_email' => 'hanna@example.com',
        'starts_at' => now()->addHours(5),
        'ends_at' => now()->addHours(5)->addMinutes(30),
        'status' => 'confirmed',
    ]);

    $contact = $owner->contacts()->create(['name' => 'Slow Lead', 'email' => 'slow@example.com', 'status' => 'new']);
    $owner->followUpTasks()->create([
        'contact_id' => $contact->id,
        'title' => 'Chase proposal',
        'due_at' => now()->subDay(),
        'status' => 'pending',
    ]);

    $response = $this->actingAs($owner)->get(route('app-notifications.index'))->assertOk();

    $types = collect($response->json('items'))->pluck('type')->all();
    expect($types)->toContain('booking_new')
        ->and($types)->toContain('booking_today')
        ->and($types)->toContain('task_overdue')
        ->and($response->json('count'))->toBe(3);
});

test('public pages share the booking CTA url only when an active page exists', function () {
    $owner = ownerWithTools();

    Cache::flush();
    $this->withoutVite()
        ->get('/')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('bookingCtaUrl', null));

    bookingsForNotifications($owner);
    Cache::flush();

    $this->withoutVite()
        ->get('/')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('bookingCtaUrl', route('booking.show', ['page' => 'notifications-call'])));
});
