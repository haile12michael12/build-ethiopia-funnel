<?php

use App\Actions\Bookings\SendBookingReminders;
use App\Mail\BookingCancelledMail;
use App\Mail\BookingConfirmationMail;
use App\Mail\BookingOwnerNotificationMail;
use App\Mail\BookingReminderMail;
use App\Models\Booking;
use App\Models\BookingPage;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function bookingPageFor(User $owner, array $overrides = []): BookingPage
{
    return BookingPage::query()->create(array_replace([
        'user_id' => $owner->id,
        'title' => 'Discovery call',
        'slug' => 'discovery-call',
        'description' => 'A short intro call.',
        'location' => 'Google Meet',
        'duration_minutes' => 30,
        'buffer_minutes' => 10,
        'min_notice_minutes' => 0,
        'advance_days' => 14,
        'timezone' => 'Africa/Addis_Ababa',
        'availability' => [
            '1' => [['start' => '09:00', 'end' => '12:00']],
            '2' => [['start' => '09:00', 'end' => '12:00']],
            '3' => [['start' => '09:00', 'end' => '12:00']],
            '4' => [['start' => '09:00', 'end' => '12:00']],
            '5' => [['start' => '09:00', 'end' => '12:00']],
            '6' => [],
            '7' => [],
        ],
        'is_active' => true,
    ], $overrides));
}

/**
 * Next weekday (Mon–Fri) that is at least two days ahead so slot math stays
 * comfortably inside the advance window regardless of when tests run.
 */
function nextOpenDate(): CarbonImmutable
{
    $date = CarbonImmutable::now('Africa/Addis_Ababa')->addDays(2);
    while ($date->isoWeekday() > 5) {
        $date = $date->addDay();
    }

    return $date;
}

test('public booking page renders for guests', function () {
    $owner = User::factory()->create();
    bookingPageFor($owner);

    $this->withoutVite()
        ->get(route('booking.show', ['page' => 'discovery-call']))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('booking/show')
            ->where('page.title', 'Discovery call')
            ->has('availableDates'));
});

test('inactive booking pages are not publicly reachable', function () {
    $owner = User::factory()->create();
    bookingPageFor($owner, ['is_active' => false]);

    $this->get(route('booking.show', ['page' => 'discovery-call']))->assertNotFound();
});

test('slots endpoint respects availability windows', function () {
    $owner = User::factory()->create();
    bookingPageFor($owner);

    $date = nextOpenDate();

    $response = $this->getJson(route('booking.slots', ['page' => 'discovery-call']).'?date='.$date->toDateString())
        ->assertOk();

    $slots = $response->json('slots');
    expect($slots)->toHaveCount(6)
        ->and($slots[0]['value'])->toBe('09:00')
        ->and($slots[5]['value'])->toBe('11:30');

    // Sundays have no availability window.
    $sunday = CarbonImmutable::now('Africa/Addis_Ababa')->addDays(2);
    while ($sunday->isoWeekday() !== 7) {
        $sunday = $sunday->addDay();
    }

    $this->getJson(route('booking.slots', ['page' => 'discovery-call']).'?date='.$sunday->toDateString())
        ->assertOk()
        ->assertJsonPath('slots', []);
});

test('booking creates a contact, follow-up task, and queued mails', function () {
    Mail::fake();

    $owner = User::factory()->create();
    bookingPageFor($owner);
    $date = nextOpenDate();

    $response = $this->post(route('booking.store', ['page' => 'discovery-call']), [
        'name' => 'Meron Bekele',
        'email' => 'meron@example.com',
        'phone' => '0911 123 456',
        'notes' => 'Interested in a funnel rebuild.',
        'date' => $date->toDateString(),
        'time' => '10:00',
        'timezone' => 'Africa/Nairobi',
    ])->assertRedirect();

    $booking = Booking::query()->firstOrFail();
    expect($booking->invitee_phone)->toBe('+251911123456')
        ->and($booking->status)->toBe('confirmed')
        ->and($booking->starts_at->toIso8601String())
        ->toBe($date->setTime(10, 0)->setTimezone('UTC')->toIso8601String())
        ->and($booking->ends_at->toIso8601String())
        ->toBe($date->setTime(10, 30)->setTimezone('UTC')->toIso8601String());

    $contact = $owner->contacts()->where('email', 'meron@example.com')->firstOrFail();
    expect($contact->source)->toBe('booking')
        ->and($contact->status)->toBe('consultation_scheduled')
        ->and($contact->tags)->toContain('booking')
        ->and($booking->contact_id)->toBe($contact->id)
        ->and($contact->activities()->where('type', 'booking_created')->exists())->toBeTrue();

    $task = $owner->followUpTasks()->where('booking_id', $booking->id)->firstOrFail();
    expect($task->status)->toBe('pending')
        ->and($task->due_at->toIso8601String())->toBe($booking->starts_at->toIso8601String());

    expect($response->headers->get('Location'))->toContain('/booking/'.$booking->uuid.'/confirmation/');

    Mail::assertQueued(BookingConfirmationMail::class, fn ($mail) => $mail->hasTo('meron@example.com'));
    Mail::assertQueued(BookingOwnerNotificationMail::class, fn ($mail) => $mail->hasTo($owner->email) && $mail->action === 'created');
});

test('a taken slot cannot be booked twice even with the page buffer considered', function () {
    Mail::fake();

    $owner = User::factory()->create();
    $page = bookingPageFor($owner);
    $date = nextOpenDate();

    $payload = [
        'name' => 'First Guest',
        'email' => 'first@example.com',
        'date' => $date->toDateString(),
        'time' => '10:00',
    ];
    $this->post(route('booking.store', ['page' => $page->slug]), $payload)->assertRedirect();

    // Same slot is rejected…
    $this->post(route('booking.store', ['page' => $page->slug]), [
        ...$payload,
        'name' => 'Second Guest',
        'email' => 'second@example.com',
    ])->assertSessionHasErrors('time');

    // …and the buffer (10 min here) blocks the 10:30 slot as well, while 10:40 is free.
    $this->post(route('booking.store', ['page' => $page->slug]), [
        ...$payload,
        'name' => 'Buffer Guest',
        'email' => 'buffer@example.com',
        'time' => '10:30',
    ])->assertSessionHasErrors('time');

    $this->post(route('booking.store', ['page' => $page->slug]), [
        ...$payload,
        'name' => 'Safe Guest',
        'email' => 'safe@example.com',
        'time' => '10:40',
    ])->assertRedirect();

    expect(Booking::query()->count())->toBe(2);
});

test('invitees cancel and reschedule through token-guarded links', function () {
    Mail::fake();

    $owner = User::factory()->create();
    bookingPageFor($owner);
    $date = nextOpenDate();

    $this->post(route('booking.store', ['page' => 'discovery-call']), [
        'name' => 'Hanna Girma',
        'email' => 'hanna@example.com',
        'date' => $date->toDateString(),
        'time' => '09:00',
    ])->assertRedirect();

    $booking = Booking::query()->firstOrFail();
    $otherDate = nextOpenDate()->addDays(2)->isoWeekday() > 5
        ? nextOpenDate()
        : nextOpenDate()->addDays(2);

    // Wrong tokens cannot probe bookings.
    $this->post(route('booking.reschedule', ['booking' => $booking->uuid, 'token' => str_repeat('x', 48)]), [
        'date' => $otherDate->toDateString(),
        'time' => '09:30',
    ])->assertNotFound();

    // Reschedule moves the meeting and keeps the pending task aligned.
    $this->post(route('booking.reschedule', ['booking' => $booking->uuid, 'token' => $booking->manage_token]), [
        'date' => $otherDate->toDateString(),
        'time' => '09:30',
    ])->assertRedirect();

    $booking->refresh();
    expect($booking->status)->toBe('confirmed')
        ->and($booking->starts_at->toIso8601String())
        ->toBe($otherDate->setTime(9, 30)->setTimezone('UTC')->toIso8601String());

    Mail::assertQueued(BookingConfirmationMail::class, fn ($mail) => $mail->rescheduled === true);

    // Cancel marks the booking, cancels the pending task, and mails the owner.
    $this->post(route('booking.cancel', ['booking' => $booking->uuid, 'token' => $booking->manage_token]), [
        'reason' => 'Something came up.',
    ])->assertRedirect();

    $booking->refresh();
    expect($booking->status)->toBe('cancelled')
        ->and($booking->cancellation_reason)->toBe('Something came up.')
        ->and($owner->followUpTasks()->where('booking_id', $booking->id)->firstOrFail()->status)->toBe('cancelled');

    Mail::assertQueued(BookingOwnerNotificationMail::class, fn ($mail) => $mail->action === 'cancelled');
});

test('reminder action mails invitees inside the lead window only once', function () {
    Mail::fake();

    $owner = User::factory()->create();
    $page = bookingPageFor($owner);
    $soon = Booking::query()->create([
        'uuid' => (string) Str::uuid(),
        'manage_token' => Str::random(48),
        'booking_page_id' => $page->id,
        'invitee_name' => 'Soon Guest',
        'invitee_email' => 'soon@example.com',
        'starts_at' => now()->addHours(20),
        'ends_at' => now()->addHours(20)->addMinutes(30),
        'status' => 'confirmed',
    ]);
    Booking::query()->create([
        'uuid' => (string) Str::uuid(),
        'manage_token' => Str::random(48),
        'booking_page_id' => $page->id,
        'invitee_name' => 'Later Guest',
        'invitee_email' => 'later@example.com',
        'starts_at' => now()->addDays(3),
        'ends_at' => now()->addDays(3)->addMinutes(30),
        'status' => 'confirmed',
    ]);

    expect(app(SendBookingReminders::class)->__invoke())->toBe(1);
    expect(app(SendBookingReminders::class)->__invoke())->toBe(0);

    Mail::assertQueued(BookingReminderMail::class, fn ($mail) => $mail->hasTo('soon@example.com'));
    Mail::assertNotQueued(BookingReminderMail::class, fn ($mail) => $mail->hasTo('later@example.com'));
    expect($soon->refresh()->reminder_sent_at)->not->toBeNull();
});

test('dashboard users can mark appointment outcomes and invitees are notified of owner cancellations', function () {
    Mail::fake();
    config(['business.owner_email' => 'owner@example.test']);

    $owner = User::factory()->create(['email' => 'owner@example.test']);
    $page = bookingPageFor($owner);
    $contact = $owner->contacts()->create(['name' => 'Outcome Guest', 'email' => 'outcome@example.com']);
    $booking = Booking::query()->create([
        'uuid' => (string) Str::uuid(),
        'manage_token' => Str::random(48),
        'booking_page_id' => $page->id,
        'contact_id' => $contact->id,
        'invitee_name' => 'Outcome Guest',
        'invitee_email' => 'outcome@example.com',
        'starts_at' => now()->subHours(2),
        'ends_at' => now()->subHours(2)->addMinutes(30),
        'status' => 'confirmed',
    ]);
    $owner->followUpTasks()->create([
        'contact_id' => $contact->id,
        'booking_id' => $booking->id,
        'title' => 'Appointment task',
        'due_at' => $booking->starts_at,
        'status' => 'pending',
    ]);

    // Signed-in dashboard users can manage configured-owner appointments.
    $customer = User::factory()->create();
    $this->actingAs($customer)->patch(route('appointments.update', $booking), ['action' => 'no_show'])->assertRedirect();

    $booking->refresh();
    expect($booking->status)->toBe('no_show')
        ->and($owner->followUpTasks()->where('booking_id', $booking->id)->where('title', 'Appointment task')->firstOrFail()->status)
        ->toBe('completed')
        ->and($owner->followUpTasks()->where('booking_id', $booking->id)->where('status', 'pending')->exists())->toBeTrue();

    // Owner cancellations email the invitee.
    $future = Booking::query()->create([
        'uuid' => (string) Str::uuid(),
        'manage_token' => Str::random(48),
        'booking_page_id' => $page->id,
        'invitee_name' => 'Future Guest',
        'invitee_email' => 'future@example.com',
        'starts_at' => now()->addDays(2),
        'ends_at' => now()->addDays(2)->addMinutes(30),
        'status' => 'confirmed',
    ]);
    $this->actingAs($owner)->patch(route('appointments.update', $future), ['action' => 'cancelled'])->assertRedirect();

    expect($future->refresh()->status)->toBe('cancelled');
    Mail::assertQueued(BookingCancelledMail::class, fn ($mail) => $mail->hasTo('future@example.com'));
});

test('owner manages booking pages from the calendars screens', function () {
    config(['business.owner_email' => 'owner@example.test']);
    $owner = User::factory()->create(['email' => 'owner@example.test']);

    $this->actingAs($owner)
        ->post(route('booking-pages.store'), [
            'title' => 'Strategy Session',
            'location' => 'Phone',
            'duration_minutes' => 45,
        ])->assertRedirect();

    $page = BookingPage::query()->where('slug', 'strategy-session')->firstOrFail();
    expect($page->availability['1'][0])->toBe(['start' => '09:00', 'end' => '17:00'])
        ->and($page->timezone)->toBe('Africa/Addis_Ababa');

    $availability = [
        '1' => [['start' => '10:00', 'end' => '14:00']],
        '2' => [['start' => '10:00', 'end' => '14:00']],
        '3' => [],
        '4' => [],
        '5' => [],
        '6' => [['start' => '11:00', 'end' => '13:00']],
        '7' => [],
    ];

    $this->actingAs($owner)
        ->put(route('booking-pages.update', $page), [
            'title' => 'Strategy Session',
            'description' => null,
            'location' => 'Phone',
            'duration_minutes' => 45,
            'buffer_minutes' => 15,
            'min_notice_hours' => 12,
            'advance_days' => 30,
            'timezone' => 'Africa/Addis_Ababa',
            'is_active' => true,
            'availability' => $availability,
        ])->assertRedirect();

    $page->refresh();
    expect($page->min_notice_minutes)->toBe(720)
        ->and($page->advance_days)->toBe(30)
        ->and($page->availability['6'][0])->toBe(['start' => '11:00', 'end' => '13:00']);

    // A window that ends before it starts is rejected.
    $this->actingAs($owner)
        ->put(route('booking-pages.update', $page), [
            'title' => 'Strategy Session',
            'duration_minutes' => 45,
            'buffer_minutes' => 15,
            'min_notice_hours' => 12,
            'advance_days' => 30,
            'timezone' => 'Africa/Addis_Ababa',
            'is_active' => true,
            'availability' => ['1' => [['start' => '15:00', 'end' => '09:00']]] + $availability,
        ])->assertSessionHasErrors('availability');
});
