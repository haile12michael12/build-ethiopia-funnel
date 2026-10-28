<?php

namespace App\Mail;

use App\Models\Booking;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class BookingOwnerNotificationMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  string  $action  'created' | 'cancelled' | 'rescheduled'
     * @param  string|null  $cancelledBy  'invitee' or 'owner' when action is cancelled
     */
    public function __construct(
        public Booking $booking,
        public string $action,
        public ?string $cancelledBy = null,
    ) {}

    public function build(): self
    {
        $booking = $this->booking->loadMissing('page');
        $starts = $booking->starts_at->setTimezone($booking->page->timezone);

        $subject = match ($this->action) {
            'cancelled' => 'Booking cancelled: '.$booking->invitee_name.' — '.$booking->page->title,
            'rescheduled' => 'Booking rescheduled: '.$booking->invitee_name.' — '.$booking->page->title,
            default => 'New booking: '.$booking->invitee_name.' — '.$booking->page->title,
        };

        return $this
            ->subject($subject)
            ->text('emails.booking-owner-notification')
            ->with([
                'action' => $this->action,
                'cancelledBy' => $this->cancelledBy,
                'dateLine' => $starts->format('l, F j, Y'),
                'timeLine' => $starts->format('g:i A').' ('.$booking->page->timezone.')',
                'appointmentsUrl' => route('appointments.index'),
                'contactUrl' => $booking->contact_id ? route('contacts.show', $booking->contact_id) : null,
            ]);
    }
}
