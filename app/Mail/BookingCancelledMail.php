<?php

namespace App\Mail;

use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class BookingCancelledMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Booking $booking) {}

    public function build(): self
    {
        $booking = $this->booking->loadMissing('page');
        $starts = $booking->starts_at->setTimezone($booking->page->timezone);

        return $this
            ->subject('Cancelled: '.$booking->page->title.' on '.$starts->format('M j, Y'))
            ->text('emails.booking-cancelled')
            ->with([
                'dateLine' => $starts->format('l, F j, Y'),
                'timeLine' => $starts->format('g:i A').' ('.$booking->page->timezone.')',
                'bookUrl' => $booking->page->publicUrl(),
            ]);
    }
}
