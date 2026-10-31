<?php

use App\Actions\Bookings\CreateBooking;
use App\Actions\Bookings\CancelBooking;
use App\Actions\Bookings\RescheduleBooking;
use App\Models\Activity;
use App\Models\BookingPage;
use App\Models\Contact;
use App\Models\MarketplacePurchase;
use App\Models\MarketplaceTemplate;
use App\Models\User;
use App\Services\Marketplace\MarketplacePurchaseService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function dashboardActivityPage(User $owner): BookingPage
{
    return BookingPage::query()->create([
        'user_id' => $owner->id,
        'title' => 'Discovery call',
        'slug' => 'activity-discovery-call',
        'description' => 'A short intro call.',
        'location' => 'Google Meet',
        'duration_minutes' => 30,
        'buffer_minutes' => 10,
        'min_notice_minutes' => 0,
        'advance_days' => 14,
        'timezone' => 'Africa/Addis_Ababa',
        'availability' => array_fill_keys(range(1, 7), [['start' => '09:00', 'end' => '12:00']]),
        'is_active' => true,
    ]);
}

test('customers can only view their own activity and cannot open owner dashboards', function () {
    $customer = User::factory()->create();
    $other = User::factory()->create();
    $ownActivity = Activity::query()->create(['user_id' => $customer->id, 'action' => 'login', 'meta' => []]);
    Activity::query()->create(['user_id' => $other->id, 'action' => 'registered', 'meta' => []]);

    $this->withoutVite()
        ->actingAs($customer)
        ->get(route('customer.activity'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('account/activity')
            ->has('activities.data', 1)
            ->where('activities.data.0.id', $ownActivity->id));

    $this->actingAs($customer)->get('/admin')->assertForbidden();
    $this->actingAs($customer)->get(route('activity.index'))->assertForbidden();
});

test('owner can view and filter activity from every user', function () {
    $owner = User::factory()->create(['email' => 'activity-owner@example.test']);
    $customer = User::factory()->create();
    config(['business.owner_email' => $owner->email, 'business-audit.owner_id' => $owner->id]);
    Activity::query()->create(['user_id' => $owner->id, 'action' => 'login', 'meta' => []]);
    Activity::query()->create(['user_id' => $customer->id, 'action' => 'registered', 'meta' => []]);
    Activity::query()->create(['action' => 'lead_submitted', 'meta' => []]);

    $this->withoutVite()
        ->actingAs($owner)
        ->get(route('activity.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/activity')
            ->has('activities.data', 3));

    $this->actingAs($owner)
        ->get(route('activity.index', ['action' => 'registered', 'user_id' => $customer->id]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->has('activities.data', 1)
            ->where('activities.data.0.action', 'registered')
            ->where('filters.user_id', (string) $customer->id));
});

test('owner dashboard reports persisted counts and verified Chapa revenue by currency', function () {
    $owner = User::factory()->create(['email' => 'dashboard-owner@example.test']);
    $customer = User::factory()->create();
    config(['business.owner_email' => $owner->email, 'business-audit.owner_id' => $owner->id]);
    $owner->contacts()->create([
        'email' => 'dashboard-lead@example.test',
        'name' => 'Dashboard Lead',
        'source' => 'business_audit',
        'status' => 'new',
    ]);
    $template = MarketplaceTemplate::query()->create([
        'slug' => 'dashboard-revenue-template',
        'type' => 'template',
        'name' => 'Dashboard Revenue Template',
        'description' => 'A template for dashboard revenue tests.',
        'status' => 'published',
        'amount_minor' => 2400,
        'currency' => 'ETB',
    ]);
    MarketplacePurchase::query()->create([
        'buyer_id' => $customer->id,
        'template_id' => $template->id,
        'provider' => 'chapa',
        'tx_ref' => 'DASHBOARD-PAID-123',
        'amount_minor' => 2400,
        'currency' => 'ETB',
        'status' => 'paid',
        'paid_at' => now(),
    ]);
    MarketplacePurchase::query()->create([
        'buyer_id' => $customer->id,
        'template_id' => $template->id,
        'provider' => 'chapa',
        'tx_ref' => 'DASHBOARD-PENDING-123',
        'amount_minor' => 800,
        'currency' => 'ETB',
        'status' => 'pending',
    ]);

    $this->withoutVite()
        ->actingAs($owner)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('platformStats.users', 2)
            ->where('platformStats.leads', 1)
            ->where('platformStats.verified_revenue.ETB', 2400));
});

test('registration and login events create activity records and preserve intended redirects', function () {
    $email = 'activity-customer@example.test';

    $this->post(route('register'), [
        'name' => 'Activity Customer',
        'email' => $email,
        'password' => 'StrongPassword123!',
        'password_confirmation' => 'StrongPassword123!',
    ])->assertRedirect();

    $user = User::query()->where('email', $email)->firstOrFail();
    $this->assertDatabaseHas('activities', [
        'user_id' => $user->id,
        'action' => 'registered',
    ]);

    $this->post(route('logout'))->assertRedirect('/');
    $this->withSession(['url.intended' => '/marketplace'])
        ->post(route('login'), ['email' => $email, 'password' => 'StrongPassword123!'])
        ->assertRedirect('/marketplace');

    $this->assertDatabaseHas('activities', [
        'user_id' => $user->id,
        'action' => 'login',
    ]);
});

test('registration still succeeds when activity storage is unavailable', function () {
    Schema::drop('activities');

    $this->post(route('register'), [
        'name' => 'Resilient Customer',
        'email' => 'resilient-customer@example.test',
        'password' => 'StrongPassword123!',
        'password_confirmation' => 'StrongPassword123!',
    ])->assertRedirect();

    expect(User::query()->where('email', 'resilient-customer@example.test')->exists())->toBeTrue();
});

test('owner login defaults to admin and still honors an intended destination', function () {
    $owner = User::factory()->create([
        'email' => 'activity-owner-login@example.test',
        'password' => Hash::make('StrongPassword123!'),
    ]);
    config(['business.owner_email' => $owner->email]);

    $this->post(route('login'), ['email' => $owner->email, 'password' => 'StrongPassword123!'])
        ->assertRedirect('/admin');
    $this->post(route('logout'))->assertRedirect('/');
    $this->withSession(['url.intended' => '/admin/funnels'])
        ->post(route('login'), ['email' => $owner->email, 'password' => 'StrongPassword123!'])
        ->assertRedirect('/admin/funnels');
});

test('verified Chapa purchase and paid template download create activity records', function () {
    config(['services.chapa.secret_key' => 'activity-test-secret']);
    $buyer = User::factory()->create(['email_verified_at' => now()]);
    $template = MarketplaceTemplate::query()->create([
        'slug' => 'activity-template',
        'type' => 'template',
        'name' => 'Activity Template',
        'description' => 'A template for activity tests.',
        'status' => 'published',
        'amount_minor' => 1200,
        'currency' => 'ETB',
        'file_path' => 'marketplace/activity-template.zip',
    ]);
    Storage::fake('local');
    Storage::disk('local')->put($template->file_path, 'template archive');

    $purchase = MarketplacePurchase::query()->create([
        'buyer_id' => $buyer->id,
        'template_id' => $template->id,
        'provider' => 'chapa',
        'tx_ref' => 'ACTIVITY-VERIFIED-123',
        'amount_minor' => 1200,
        'currency' => 'ETB',
        'status' => 'pending',
    ]);
    Http::fake([
        'api.chapa.co/v1/transaction/verify/ACTIVITY-VERIFIED-123' => Http::response([
            'status' => 'success',
            'data' => [
                'tx_ref' => $purchase->tx_ref,
                'status' => 'success',
                'amount' => '12.00',
                'currency' => 'ETB',
                'id' => 'activity-transaction',
            ],
        ]),
    ]);

    expect(app(MarketplacePurchaseService::class)->verifyAndFulfill($purchase))->toBeTrue();
    $this->assertDatabaseHas('activities', [
        'user_id' => $buyer->id,
        'action' => 'purchase_paid',
        'subject_id' => $purchase->id,
    ]);

    $this->actingAs($buyer)->get(route('marketplace.download', $template->slug))->assertOk();
    $this->assertDatabaseHas('activities', [
        'user_id' => $buyer->id,
        'action' => 'template_downloaded',
        'subject_id' => $template->id,
    ]);

    $this->actingAs($buyer)
        ->get(route('customer.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('downloads.0.name', 'Activity Template'));
});

test('authenticated calendar booking is linked to its customer and logged', function () {
    Mail::fake();
    $owner = User::factory()->create();
    $customer = User::factory()->create();
    $page = dashboardActivityPage($owner);
    $date = CarbonImmutable::now('Africa/Addis_Ababa')->addDays(3);
    while ($date->isWeekend()) {
        $date = $date->addDay();
    }
    $request = Request::create('/book/activity-discovery-call', 'POST');
    $request->setUserResolver(fn () => $customer);

    $booking = app(CreateBooking::class)->handle($page, [
        'name' => $customer->name,
        'email' => $customer->email,
        'date' => $date->toDateString(),
        'time' => '09:00',
        'timezone' => 'Africa/Addis_Ababa',
    ], $request);

    expect($booking->contact->customer_user_id)->toBe($customer->id);
    $this->assertDatabaseHas('activities', [
        'user_id' => $customer->id,
        'action' => 'booking_created',
        'subject_id' => $booking->id,
    ]);

    $this->withoutVite()
        ->actingAs($customer)
        ->get(route('customer.dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->where('upcomingBookings.0.uuid', $booking->uuid)
            ->where('activities.0.action', 'booking_created'));

    $rescheduleDate = $date->addDay();
    while ($rescheduleDate->isWeekend()) {
        $rescheduleDate = $rescheduleDate->addDay();
    }
    $rescheduled = app(RescheduleBooking::class)->handle($booking, [
        'date' => $rescheduleDate->toDateString(),
        'time' => '10:00',
        'timezone' => 'Africa/Addis_Ababa',
    ]);
    app(CancelBooking::class)->handle($rescheduled, 'invitee', 'Changed plans.');

    $this->assertDatabaseHas('activities', [
        'user_id' => $customer->id,
        'action' => 'booking_rescheduled',
        'subject_id' => $booking->id,
    ]);
    $this->assertDatabaseHas('activities', [
        'user_id' => $customer->id,
        'action' => 'booking_cancelled',
        'subject_id' => $booking->id,
    ]);
});