<?php

namespace App\Actions\Bookings;

use App\Mail\BookingConfirmationMail;
use App\Mail\BookingOwnerNotificationMail;
use App\Models\Booking;
use App\Models\BookingPage;
use App\Models\Contact;
use App\Services\Bookings\BookingAvailability;
use App\Services\EthiopianPhoneNormalizer;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Throwable;

class CreateBooking
{
    public function __construct(
        private BookingAvailability $availability,
        private EthiopianPhoneNormalizer $phoneNormalizer,
    ) {}

    /**
     * @param  array{name: string, email: string, phone?: ?string, notes?: ?string, timezone?: ?string, date: string, time: string}  $data
     *
     * @throws ValidationException
     */
    public function handle(BookingPage $page, array $data, Request $request): Booking
    {
        $pageTz = new \DateTimeZone($page->timezone);
        $startsAt = CarbonImmutable::createFromFormat('Y-m-d H:i', $data['date'].' '.$data['time'], $pageTz);
        if (! $startsAt instanceof CarbonImmutable || $startsAt->format('Y-m-d H:i') !== $data['date'].' '.$data['time']) {
            throw ValidationException::withMessages(['time' => 'Choose a valid time slot.']);
        }
        $startsAtUtc = $startsAt->setTimezone('UTC');

        $phone = isset($data['phone']) ? trim((string) $data['phone']) : '';
        $phone = $phone === '' ? null : ($this->phoneNormalizer->normalize($phone) ?? $phone);

        $booking = DB::transaction(function () use ($page, $data, $startsAtUtc, $phone, $request): Booking {
            // Lock the page row so concurrent requests cannot take the same slot.
            $lockedPage = BookingPage::query()->lockForUpdate()->findOrFail($page->id);
            abort_unless($lockedPage->is_active, 404);

            if (! $this->availability->isSlotAvailable($lockedPage, $startsAtUtc)) {
                throw ValidationException::withMessages([
                    'time' => 'That time slot was just taken. Please pick another one.',
                ]);
            }

            $booking = $lockedPage->bookings()->create([
                'uuid' => (string) Str::uuid(),
                'manage_token' => Str::random(48),
                'invitee_name' => trim($data['name']),
                'invitee_email' => mb_strtolower(trim($data['email'])),
                'invitee_phone' => $phone,
                'invitee_notes' => filled($data['notes'] ?? null) ? trim((string) $data['notes']) : null,
                'invitee_timezone' => filled($data['timezone'] ?? null) ? (string) $data['timezone'] : null,
                'starts_at' => $startsAtUtc,
                'ends_at' => $startsAtUtc->addMinutes(max(5, (int) $lockedPage->duration_minutes)),
                'status' => 'confirmed',
            ]);

            $contact = $this->upsertContact($lockedPage, $booking, $request);
            $booking->forceFill(['contact_id' => $contact->id])->save();

            $contact->activities()->create([
                'actor_user_id' => $lockedPage->user_id,
                'type' => 'booking_created',
                'payload' => [
                    'booking_uuid' => $booking->uuid,
                    'booking_page' => $lockedPage->title,
                    'starts_at' => $booking->starts_at->toIso8601String(),
                ],
            ]);

            $lockedPage->user->followUpTasks()->create([
                'contact_id' => $contact->id,
                'booking_id' => $booking->id,
                'title' => "Appointment with {$booking->invitee_name} — {$lockedPage->title}",
                'description' => collect([
                    'Email: '.$booking->invitee_email,
                    $booking->invitee_phone ? 'Phone: '.$booking->invitee_phone : null,
                    $lockedPage->location ? 'Location: '.$lockedPage->location : null,
                    $booking->invitee_notes ? 'Notes: '.$booking->invitee_notes : null,
                ])->filter()->implode("\n"),
                'due_at' => $booking->starts_at,
                'status' => 'pending',
            ]);

            return $booking->loadMissing('page.user');
        });

        $this->sendNotifications($booking);

        return $booking;
    }

    private function upsertContact(BookingPage $page, Booking $booking, Request $request): Contact
    {
        $contact = Contact::query()->firstOrNew([
            'user_id' => $page->user_id,
            'email' => $booking->invitee_email,
        ]);
        $isNew = ! $contact->exists;

        // A booked appointment implies a scheduled consultation unless the CRM
        // already tracks the contact further down the pipeline.
        $status = $contact->status ?: 'new';
        if (in_array($status, ['new', 'reviewing', 'contacted', 'nurture'], true)) {
            $status = 'consultation_scheduled';
        }

        $contact->fill([
            'name' => $contact->name ?: $booking->invitee_name,
            'phone' => $contact->phone ?: $booking->invitee_phone,
            'source' => $isNew ? 'booking' : $contact->source,
            'status' => $status,
            'tags' => array_values(array_unique([...($contact->tags ?? []), 'booking'])),
            'metadata' => [
                ...($contact->metadata ?? []),
                'last_booking_uuid' => $booking->uuid,
                'last_booking_at' => now()->toIso8601String(),
            ],
            'ip_address' => $request->ip(),
            'user_agent' => (string) $request->userAgent(),
            'last_submitted_at' => now(),
        ]);
        $contact->save();

        return $contact;
    }

    private function sendNotifications(Booking $booking): void
    {
        try {
            Mail::to($booking->invitee_email)->queue(new BookingConfirmationMail($booking));

            $owner = $booking->page->user;
            if ($owner?->email) {
                Mail::to($owner->email)->queue(new BookingOwnerNotificationMail($booking, 'created'));
            }
        } catch (Throwable $exception) {
            report($exception);
        }
    }
}
