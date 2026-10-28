<?php

namespace App\Actions\Bookings;

use App\Mail\BookingConfirmationMail;
use App\Mail\BookingOwnerNotificationMail;
use App\Models\Booking;
use App\Models\BookingPage;
use App\Services\Bookings\BookingAvailability;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Throwable;

class RescheduleBooking
{
    public function __construct(private BookingAvailability $availability) {}

    /**
     * @param  array{date: string, time: string, timezone?: ?string}  $data
     *
     * @throws ValidationException
     */
    public function handle(Booking $booking, array $data): Booking
    {
        $page = $booking->page;
        $pageTz = new \DateTimeZone($page->timezone);
        $startsAt = CarbonImmutable::createFromFormat('Y-m-d H:i', $data['date'].' '.$data['time'], $pageTz);
        if (! $startsAt instanceof CarbonImmutable || $startsAt->format('Y-m-d H:i') !== $data['date'].' '.$data['time']) {
            throw ValidationException::withMessages(['time' => 'Choose a valid time slot.']);
        }
        $startsAtUtc = $startsAt->setTimezone('UTC');

        $booking = DB::transaction(function () use ($booking, $startsAtUtc): Booking {
            $lockedPage = BookingPage::query()->lockForUpdate()->findOrFail($booking->booking_page_id);
            $locked = Booking::query()->lockForUpdate()->findOrFail($booking->id);

            if ($locked->status !== 'confirmed') {
                throw ValidationException::withMessages([
                    'time' => 'This booking can no longer be changed.',
                ]);
            }

            if (! $this->availability->isSlotAvailable($lockedPage, $startsAtUtc, excludeBookingId: $locked->id)) {
                throw ValidationException::withMessages([
                    'time' => 'That time slot was just taken. Please pick another one.',
                ]);
            }

            $previousStartsAt = $locked->starts_at->toIso8601String();

            $locked->forceFill([
                'starts_at' => $startsAtUtc,
                'ends_at' => $startsAtUtc->addMinutes(max(5, (int) $lockedPage->duration_minutes)),
                // The invitee must receive a fresh reminder for the new time.
                'reminder_sent_at' => null,
            ])->save();

            $locked->followUpTasks()->where('status', 'pending')->update([
                'due_at' => $startsAtUtc,
            ]);

            $locked->contact?->activities()->create([
                'actor_user_id' => $lockedPage->user_id,
                'type' => 'booking_rescheduled',
                'payload' => [
                    'booking_uuid' => $locked->uuid,
                    'from' => $previousStartsAt,
                    'to' => $locked->starts_at->toIso8601String(),
                ],
            ]);

            return $locked->loadMissing('page.user', 'contact');
        });

        try {
            Mail::to($booking->invitee_email)->queue(new BookingConfirmationMail($booking, rescheduled: true));

            $owner = $booking->page->user;
            if ($owner?->email) {
                Mail::to($owner->email)->queue(new BookingOwnerNotificationMail($booking, 'rescheduled'));
            }
        } catch (Throwable $exception) {
            report($exception);
        }

        return $booking;
    }
}
