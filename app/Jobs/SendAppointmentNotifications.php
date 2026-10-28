<?php

namespace App\Jobs;

use App\Mail\AppointmentBooked;
use App\Mail\AppointmentBookingConfirmation;
use App\Models\Appointment;
use App\Models\Contact;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Throwable;

class SendAppointmentNotifications implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public array $backoff = [30, 120];

    public function __construct(
        public int $appointmentId,
        public int $contactId,
    ) {}

    public function handle(): void
    {
        $appointment = Appointment::with('contact')->find($this->appointmentId);
        $contact = Contact::find($this->contactId);

        if (! $appointment || ! $contact || ! $appointment->user || $appointment->user->is_demo) {
            return;
        }

        $owner = $appointment->user;
        $recipient = config('services.lead_capture.notification_email') ?: $owner->email;

        if ($recipient) {
            $this->attempt(fn () => Mail::to($recipient)->send(new AppointmentBooked($appointment, $contact)));
        }

        if ($appointment->email) {
            $this->attempt(fn () => Mail::to($appointment->email)->send(new AppointmentBookingConfirmation($appointment)));
        }

        $webhookUrl = config('services.lead_capture.webhook_url');
        if ($webhookUrl) {
            $this->attempt(fn () => Http::timeout(5)->post($webhookUrl, [
                'event' => 'appointment.booked',
                'appointment' => [
                    'id' => $appointment->id,
                    'company_name' => $appointment->company_name,
                    'email' => $appointment->email,
                    'service' => $appointment->service_label,
                    'meeting_type' => $appointment->meeting_type,
                    'start_at' => $appointment->start_at->toISOString(),
                    'timezone' => $appointment->timezone,
                    'status' => $appointment->status,
                ],
                'contact' => [
                    'id' => $contact->id,
                    'name' => $contact->name,
                    'email' => $contact->email,
                    'status' => $contact->status,
                    'lead_score' => $contact->lead_score,
                ],
            ]));
        }
    }

    private function attempt(callable $callback): void
    {
        try {
            $callback();
        } catch (Throwable $exception) {
            report($exception);
        }
    }
}
