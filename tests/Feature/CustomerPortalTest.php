<?php

use App\Models\ClientAcquisitionSettings;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function portalAuditPayload(string $email, array $overrides = []): array
{
    return array_replace([
        'name' => 'Selam Tesfaye',
        'business_name' => 'Addis Design Studio',
        'email' => $email,
        'phone' => '0911 223344',
        'website' => 'https://addis.example.com',
        'website_status' => 'live',
        'service_interests' => ['website', 'marketing'],
        'budget' => 'over_500000',
        'timeline' => 'within_1_month',
    ], $overrides);
}

function portalAppointmentDate(): string
{
    return Carbon::now('Africa/Addis_Ababa')->addDay()->toDateString();
}

function portalAppointmentPayload(string $email, array $overrides = []): array
{
    return array_replace([
        'company_name' => 'Blue Nile Logistics',
        'contact_name' => 'Amira Abdi',
        'email' => $email,
        'phone' => '+251911223344',
        'service_key' => 'automation',
        'meeting_type' => 'demo',
        'date' => portalAppointmentDate(),
        'time' => '10:00',
        'notes' => 'We are evaluating automation for our dispatch workflow.',
        'market' => 'ethiopia',
        'country' => 'Ethiopia',
        'marketing_consent' => true,
    ], $overrides);
}

function portalAppointmentSettings(User $owner): ClientAcquisitionSettings
{
    return $owner->clientAcquisitionSettings()->create([
        'services' => config('client-acquisition.services'),
        'budgets' => config('client-acquisition.budgets'),
        'timelines' => config('client-acquisition.timelines'),
        'scoring_weights' => config('client-acquisition.scoring_weights'),
        'qualified_score' => 70,
        'appointment_enabled' => true,
        'appointment_timezone' => 'Africa/Addis_Ababa',
        'appointment_slot_minutes' => 60,
        'appointment_buffer_minutes' => 15,
        'appointment_advance_days' => 60,
        'appointment_max_per_day' => 4,
        'appointment_business_hours' => ['start' => '09:00', 'end' => '17:00'],
        'appointment_meeting_types' => config('appointments.meeting_types'),
    ]);
}

test('the business owner is redirected from the customer dashboard to the admin console', function () {
    $owner = User::factory()->create(['email' => 'owner@example.test']);
    config(['business.owner_email' => $owner->email]);

    $this->actingAs($owner)
        ->get('/dashboard')
        ->assertRedirect(route('dashboard', absolute: false));
});

test('registered customers see their own audit submission on their dashboard', function () {
    $owner = User::factory()->create();
    config(['business-audit.owner_id' => $owner->id]);

    $customer = User::factory()->create(['email_verified_at' => now()]);

    $this->actingAs($customer)
        ->post(route('business-audit.store'), portalAuditPayload($customer->email))
        ->assertRedirect();

    $contact = $owner->contacts()->where('email', $customer->email)->firstOrFail();

    expect($contact->customer_user_id)->toBe($customer->id);

    $this->actingAs($customer)
        ->withoutVite()
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('account/index')
            ->has('requests.data', 1)
            ->where('requests.data.0.email', $customer->email)
            ->where('requests.data.0.source', 'business_audit'));
});

test('registered customers see their own demo booking on their dashboard', function () {
    $owner = User::factory()->create();
    config(['business-audit.owner_id' => $owner->id, 'business.owner_email' => $owner->email]);
    portalAppointmentSettings($owner);

    $customer = User::factory()->create(['email_verified_at' => now()]);

    $this->actingAs($customer)
        ->post(route('appointments.store'), portalAppointmentPayload($customer->email))
        ->assertRedirect();

    $this->actingAs($customer)
        ->withoutVite()
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('account/index')
            ->has('appointments.data', 1)
            ->where('appointments.data.0.company_name', 'Blue Nile Logistics')
            ->where('appointments.data.0.status', 'confirmed'));
});

test('a customer cannot see another customer submissions on their dashboard', function () {
    $owner = User::factory()->create();
    config(['business-audit.owner_id' => $owner->id]);

    $customer = User::factory()->create(['email_verified_at' => now()]);
    $other = User::factory()->create(['email_verified_at' => now()]);

    $this->actingAs($customer)
        ->post(route('business-audit.store'), portalAuditPayload($customer->email))
        ->assertRedirect();

    $this->actingAs($other)
        ->withoutVite()
        ->get('/dashboard')
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('account/index')
            ->where('summary.open_requests', 0)
            ->where('requests.data', []));
});

test('an unauthenticated visitor cannot open the customer dashboard', function () {
    $this->get('/dashboard')->assertRedirect('/login');
});
