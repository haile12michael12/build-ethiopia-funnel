<?php

namespace App\Mail;

use App\Models\Appointment;
use App\Models\Contact;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class AppointmentBooked extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Appointment $appointment,
        public Contact $contact,
    ) {}

    public function build(): self
    {
        return $this
            ->subject('New appointment booked: '.$this->appointment->company_name)
            ->text('emails.appointment-booked');
    }
}
