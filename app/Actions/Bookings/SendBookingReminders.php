<?php

namespace App\Actions\Bookings;

use App\Mail\BookingReminderMail;
use App\Models\Booking;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * Queues reminder emails for confirmed bookings starting within the
 * configured lead window. Invoked from the scheduler.
 */
class SendBookingReminders
{
    public function __invoke(): int
    {
        $hours = max(1, (int) config('booking.reminder_hours_before', 24));

        $sent = 0;
        Booking::query()
            ->where('status', 'confirmed')
            ->whereNull('reminder_sent_at')
            ->where('starts_at', '>', now())
            ->where('starts_at', '<=', now()->addHours($hours))
            ->with('page.user')
            ->limit(200)
            ->get()
            ->each(function (Booking $booking) use (&$sent): void {
                // Claim the row first so overlapping scheduler runs do not mail twice.
                $claimed = Booking::query()
                    ->whereKey($booking->id)
                    ->whereNull('reminder_sent_at')
                    ->where('status', 'confirmed')
                    ->update(['reminder_sent_at' => now()]);

                if ($claimed === 0) {
                    return;
                }

                try {
                    Mail::to($booking->invitee_email)->queue(new BookingReminderMail($booking));
                    $sent++;
                } catch (Throwable $exception) {
                    report($exception);
                }
            });

        return $sent;
    }
}
