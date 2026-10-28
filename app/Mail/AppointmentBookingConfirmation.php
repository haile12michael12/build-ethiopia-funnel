<?php

namespace App\Mail;

use App\Models\Appointment;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class AppointmentBookingConfirmation extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Appointment $appointment,
    ) {}

    public function build(): self
    {
        return $this
            ->to($this->appointment->email)
            ->subject('Your appointment is confirmed: '.$this->appointment->company_name)
            ->text('emails.appointment-confirmation');
    }
}
