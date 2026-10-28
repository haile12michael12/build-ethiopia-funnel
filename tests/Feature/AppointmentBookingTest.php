<?php

use App\Models\Appointment;
use App\Models\ClientAcquisitionSettings;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function tomorrowAppointmentDate(): string
{
    return Carbon::now('Africa/Addis_Ababa')->addDay()->toDateString();
}

function validAppointmentPayload(array $overrides = []): array
{
    return array_replace([
        'company_name' => 'Blue Nile Logistics',
        'contact_name' => 'Amira Abdi',
        'email' => 'amira@bluenile.test',
        'phone' => '+251911223344',
        'service_key' => 'automation',
        'meeting_type' => 'demo',
        'date' => tomorrowAppointmentDate(),
        'time' => '10:00',
        'notes' => 'We are evaluating automation for our dispatch workflow.',
        'market' => 'ethiopia',
        'country' => 'Ethiopia',
        'marketing_consent' => true,
    ], $overrides);
}

function createAppointmentSettings(User $owner, array $overrides = []): ClientAcquisitionSettings
{
    return $owner->clientAcquisitionSettings()->create(array_replace([
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
    ], $overrides));
}

test('booking page renders services, meeting types and settings', function () {
    $owner = User::factory()->create();
    config(['business-audit.owner_id' => $owner->id, 'business.owner_email' => $owner->email]);
    createAppointmentSettings($owner);

    $this->withoutVite()
        ->get(route('appointments.show'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('appointments/book')
            ->has('services')
            ->has('meetingTypes')
            ->where('settings.timezone', 'Africa/Addis_Ababa')
            ->where('settings.business_hours.start', '09:00'));
});

test('booking page returns 503 when no owner is configured', function () {
    config(['business-audit.owner_id' => null]);

    $this->get(route('appointments.show'))->assertStatus(503);
});

test('booking page returns 404 when appointment booking is disabled', function () {
    $owner = User::factory()->create();
    config(['business-audit.owner_id' => $owner->id, 'business.owner_email' => $owner->email]);
    createAppointmentSettings($owner, ['appointment_enabled' => false]);

    $this->get(route('appointments.show'))->assertStatus(404);
});

test('availability endpoint returns business-hour slots', function () {
    $owner = User::factory()->create();
    config(['business-audit.owner_id' => $owner->id, 'business.owner_email' => $owner->email]);
    createAppointmentSettings($owner);

    $date = tomorrowAppointmentDate();
    $this->getJson(route('appointments.availability', ['date' => $date]))
        ->assertOk()
        ->assertJsonPath('date', $date)
        ->assertJsonPath('slots.0', '09:00')
        ->assertJsonCount(8, 'slots');
});

test('availability endpoint excludes booked slots', function () {
    $owner = User::factory()->create();
    config(['business-audit.owner_id' => $owner->id, 'business.owner_email' => $owner->email]);
    createAppointmentSettings($owner);

    $date = tomorrowAppointmentDate();
    $this->post(route('appointments.store'), validAppointmentPayload(['date' => $date, 'time' => '10:00']))->assertRedirect();

    $response = $this->getJson(route('appointments.availability', ['date' => $date]))->assertOk();

    expect($response->json('slots'))
        ->toContain('09:00')
        ->not->toContain('10:00');
});

test('booking captures a scored contact, appointment, submission and follow-up task', function () {
    $owner = User::factory()->create();
    config(['business-audit.owner_id' => $owner->id, 'business.owner_email' => $owner->email]);
    createAppointmentSettings($owner);

    $response = $this->post(route('appointments.store'), validAppointmentPayload())->assertRedirect();

    $contact = $owner->contacts()->where('email', 'amira@bluenile.test')->firstOrFail();
    $appointment = Appointment::query()->where('contact_id', $contact->id)->firstOrFail();

    expect($contact->source)->toBe('appointment_booking')
        ->and($contact->client_project['business_name'])->toBe('Blue Nile Logistics')
        ->and($contact->client_project['service_label'])->toBe('Business automation and integrations')
        ->and($contact->client_project['meeting_type'])->toBe('demo')
        ->and($contact->lead_score)->toBeGreaterThan(0)
        ->and($contact->submissions)->toHaveCount(1)
        ->and($contact->emailPreference->status)->toBe('subscribed');

    expect($appointment->status)->toBe('confirmed')
        ->and($appointment->service_key)->toBe('automation')
        ->and($appointment->company_name)->toBe('Blue Nile Logistics')
        ->and($appointment->timezone)->toBe('Africa/Addis_Ababa');

    $this->assertDatabaseHas('contact_activities', [
        'contact_id' => $contact->id,
        'type' => 'appointment_booked',
    ]);
    $this->assertDatabaseHas('follow_up_tasks', [
        'user_id' => $owner->id,
        'contact_id' => $contact->id,
        'status' => 'pending',
    ]);

    $this->withoutVite()
        ->get($response->headers->get('Location'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('appointments/thank-you')
            ->where('appointment.company_name', 'Blue Nile Logistics')
            ->where('appointment.meeting_type_label', 'Live product demo'));
});

test('booking rejects an unknown service and keeps no records', function () {
    $owner = User::factory()->create();
    config(['business-audit.owner_id' => $owner->id, 'business.owner_email' => $owner->email]);
    createAppointmentSettings($owner);

    $this->post(route('appointments.store'), validAppointmentPayload(['service_key' => 'not-a-service']))
        ->assertSessionHasErrors('service_key');

    expect($owner->contacts()->count())->toBe(0)
        ->and(Appointment::query()->count())->toBe(0);
});

test('booking rejects a past time', function () {
    $owner = User::factory()->create();
    config(['business-audit.owner_id' => $owner->id, 'business.owner_email' => $owner->email]);
    createAppointmentSettings($owner);

    $this->post(route('appointments.store'), validAppointmentPayload([
        'date' => Carbon::now('Africa/Addis_Ababa')->subDay()->toDateString(),
        'time' => '10:00',
    ]))->assertSessionHasErrors('time');
});

test('booking rejects a double-booked slot', function () {
    $owner = User::factory()->create();
    config(['business-audit.owner_id' => $owner->id, 'business.owner_email' => $owner->email]);
    createAppointmentSettings($owner);

    $this->post(route('appointments.store'), validAppointmentPayload())->assertRedirect();
    $this->post(route('appointments.store'), validAppointmentPayload(['email' => 'other@bluenile.test']))
        ->assertSessionHasErrors('time');

    expect($owner->contacts()->count())->toBe(1)
        ->and(Appointment::query()->count())->toBe(1);
});

test('booking updates an existing contact while keeping submission history', function () {
    $owner = User::factory()->create();
    config(['business-audit.owner_id' => $owner->id, 'business.owner_email' => $owner->email]);
    createAppointmentSettings($owner);

    $this->post(route('appointments.store'), validAppointmentPayload())->assertRedirect();
    $this->post(route('appointments.store'), validAppointmentPayload(['company_name' => 'Renamed Logistics']))->assertRedirect();

    $contact = $owner->contacts()->where('email', 'amira@bluenile.test')->firstOrFail();

    expect($owner->contacts()->count())->toBe(1)
        ->and($contact->submissions)->toHaveCount(2)
        ->and($contact->client_project['business_name'])->toBe('Renamed Logistics')
        ->and(Appointment::query()->where('contact_id', $contact->id)->count())->toBe(2);
});

test('appointment list requires the configured business owner', function () {
    $owner = User::factory()->create();
    $other = User::factory()->create();
    config(['business-audit.owner_id' => $owner->id, 'business.owner_email' => $owner->email]);
    createAppointmentSettings($owner);

    $this->actingAs($other)->get(route('appointments.index'))->assertForbidden();
    $this->withoutVite()->actingAs($owner)->get(route('appointments.index'))->assertOk();
});

test('owner can update appointment status and it records an activity', function () {
    $owner = User::factory()->create();
    config(['business-audit.owner_id' => $owner->id, 'business.owner_email' => $owner->email]);
    createAppointmentSettings($owner);

    $this->post(route('appointments.store'), validAppointmentPayload())->assertRedirect();
    $appointment = Appointment::query()->firstOrFail();

    $this->actingAs($owner)
        ->patch(route('appointments.status.update', $appointment), ['status' => 'completed'])
        ->assertRedirect();

    expect($appointment->fresh()->status)->toBe('completed');
    $this->assertDatabaseHas('contact_activities', [
        'contact_id' => $appointment->contact_id,
        'type' => 'appointment_status_changed',
    ]);
});

test('appointment status cannot be set to an invalid value', function () {
    $owner = User::factory()->create();
    config(['business-audit.owner_id' => $owner->id, 'business.owner_email' => $owner->email]);
    createAppointmentSettings($owner);

    $this->post(route('appointments.store'), validAppointmentPayload())->assertRedirect();
    $appointment = Appointment::query()->firstOrFail();

    $this->actingAs($owner)
        ->patch(route('appointments.status.update', $appointment), ['status' => 'bogus'])
        ->assertSessionHasErrors('status');

    expect($appointment->fresh()->status)->toBe('confirmed');
});

test('a booking created by a past status cannot be completed again', function () {
    $owner = User::factory()->create();
    config(['business-audit.owner_id' => $owner->id, 'business.owner_email' => $owner->email]);
    createAppointmentSettings($owner);

    $this->post(route('appointments.store'), validAppointmentPayload())->assertRedirect();
    $appointment = Appointment::query()->firstOrFail();

    $this->actingAs($owner)->patch(route('appointments.status.update', $appointment), ['status' => 'cancelled'])->assertRedirect();
    $this->actingAs($owner)->patch(route('appointments.status.update', $appointment), ['status' => 'completed'])->assertStatus(422);
});

test('appointment settings can be updated by the owner', function () {
    $owner = User::factory()->create();
    config(['business-audit.owner_id' => $owner->id, 'business.owner_email' => $owner->email]);
    createAppointmentSettings($owner);

    $this->actingAs($owner)
        ->put(route('client-acquisition.settings.update'), [
            ...ClientAcquisitionSettings::defaults(),
            'appointment_enabled' => true,
            'appointment_timezone' => 'Africa/Addis_Ababa',
            'appointment_slot_minutes' => 45,
            'appointment_buffer_minutes' => 10,
            'appointment_advance_days' => 30,
            'appointment_max_per_day' => 3,
            'appointment_business_hours' => ['start' => '08:30', 'end' => '16:00'],
            'appointment_meeting_types' => [
                ['key' => 'demo', 'label_en' => 'Live product demo', 'label_am' => 'ትክክለኛ የፕሮድክቶ መሞከሪያ'],
            ],
        ])
        ->assertRedirect();

    expect($owner->clientAcquisitionSettings()->fresh()->appointment_slot_minutes)->toBe(45)
        ->and($owner->clientAcquisitionSettings()->fresh()->appointment_business_hours['start'])->toBe('08:30');
});
