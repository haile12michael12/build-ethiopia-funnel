<?php

namespace App\Mail;

use App\Models\Booking;
use DateTimeZone;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Throwable;

class BookingReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Booking $booking) {}

    public function build(): self
    {
        $booking = $this->booking->loadMissing('page');
        $tz = $this->displayTimezone();
        $starts = $booking->starts_at->setTimezone($tz);
        $ends = $booking->ends_at->setTimezone($tz);

        return $this
            ->subject('Reminder: '.$booking->page->title.' on '.$starts->format('M j, Y'))
            ->text('emails.booking-reminder')
            ->with([
                'dateLine' => $starts->format('l, F j, Y'),
                'timeLine' => $starts->format('g:i A').' – '.$ends->format('g:i A').' ('.$tz.')',
                'manageUrl' => $booking->manageUrl(),
            ]);
    }

    private function displayTimezone(): string
    {
        $name = $this->booking->invitee_timezone ?: $this->booking->page->timezone;
        try {
            new DateTimeZone($name);

            return $name;
        } catch (Throwable) {
            return (string) config('booking.default_timezone', 'Africa/Addis_Ababa');
        }
    }
}
