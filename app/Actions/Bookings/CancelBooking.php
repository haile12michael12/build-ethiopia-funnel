<?php

namespace App\Actions\Bookings;

use App\Mail\BookingCancelledMail;
use App\Mail\BookingOwnerNotificationMail;
use App\Models\Activity;
use App\Models\Booking;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;
use Throwable;

class CancelBooking
{
    /**
     * @param  string  $cancelledBy  'invitee' or 'owner'
     *
     * @throws ValidationException
     */
    public function handle(Booking $booking, string $cancelledBy, ?string $reason = null): Booking
    {
        $booking = DB::transaction(function () use ($booking, $cancelledBy, $reason): Booking {
            $locked = Booking::query()->lockForUpdate()->findOrFail($booking->id);

            if ($locked->status !== 'confirmed') {
                throw ValidationException::withMessages([
                    'booking' => 'This booking is not active anymore.',
                ]);
            }

            $locked->forceFill([
                'status' => 'cancelled',
                'cancelled_at' => now(),
                'cancellation_reason' => filled($reason) ? mb_substr(trim($reason), 0, 500) : null,
            ])->save();

            $locked->followUpTasks()->where('status', 'pending')->update([
                'status' => 'cancelled',
            ]);

            $locked->contact?->activities()->create([
                'actor_user_id' => $locked->page->user_id,
                'type' => 'booking_cancelled',
                'payload' => [
                    'booking_uuid' => $locked->uuid,
                    'cancelled_by' => $cancelledBy,
                    'reason' => $locked->cancellation_reason,
                ],
            ]);
            Activity::record('booking_cancelled', $locked->contact?->customer_user_id, $locked, ['booking_page_id' => $locked->booking_page_id]);

            return $locked->loadMissing('page.user', 'contact');
        });

        try {
            if ($cancelledBy === 'owner') {
                Mail::to($booking->invitee_email)->queue(new BookingCancelledMail($booking));
            }

            $owner = $booking->page->user;
            if ($owner?->email) {
                Mail::to($owner->email)->queue(new BookingOwnerNotificationMail($booking, 'cancelled', $cancelledBy));
            }
        } catch (Throwable $exception) {
            report($exception);
        }

        return $booking;
    }
}
