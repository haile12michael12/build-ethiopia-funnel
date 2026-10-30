<?php

namespace App\Http\Controllers;

use App\Actions\Bookings\CancelBooking;
use App\Actions\Leads\HandleAppointmentBooking;
use App\Http\Requests\StoreAppointmentRequest;
use App\Http\Requests\UpdateAppointmentRequest;
use App\Jobs\SendAppointmentNotifications;
use App\Models\Appointment;
use App\Models\Booking;
use App\Models\Contact;
use App\Models\FollowUpTask;
use App\Models\Funnel;
use App\Models\User;
use App\Services\AppointmentSchedule;
use App\Services\ClientAcquisitionConfiguration;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\URL;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class AppointmentController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'view' => ['nullable', Rule::in(['upcoming', 'past', 'cancelled'])],
        ]);
        $view = $validated['view'] ?? 'upcoming';

        $baseQuery = fn (): Builder => $request->user()->bookings()->getQuery();

        $bookings = $baseQuery()
            ->with(['page:id,title,timezone,location,duration_minutes', 'contact:id,name,email'])
            ->when($view === 'upcoming', fn (Builder $query) => $query
                ->where('status', 'confirmed')
                ->where('starts_at', '>=', now())
                ->orderBy('starts_at'))
            ->when($view === 'past', fn (Builder $query) => $query
                ->where(fn (Builder $inner) => $inner
                    ->where(fn (Builder $nested) => $nested->where('status', 'confirmed')->where('starts_at', '<', now()))
                    ->orWhereIn('status', ['completed', 'no_show']))
                ->orderByDesc('starts_at'))
            ->when($view === 'cancelled', fn (Builder $query) => $query
                ->where('status', 'cancelled')
                ->orderByDesc('cancelled_at'))
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Booking $booking) => $this->bookingData($booking));

        return Inertia::render('appointments/index', [
            'bookings' => $bookings,
            'view' => $view,
            'counts' => [
                'upcoming' => $baseQuery()->where('status', 'confirmed')->where('starts_at', '>=', now())->count(),
                'past' => $baseQuery()
                    ->where(fn (Builder $inner) => $inner
                        ->where(fn (Builder $nested) => $nested->where('status', 'confirmed')->where('starts_at', '<', now()))
                        ->orWhereIn('status', ['completed', 'no_show']))
                    ->count(),
                'cancelled' => $baseQuery()->where('status', 'cancelled')->count(),
            ],
        ]);
    }

    public function update(Request $request, Booking $booking, CancelBooking $cancelBooking): RedirectResponse
    {
        abort_unless($booking->page->user_id === $request->user()->id, 403);

        $validated = $request->validate([
            'action' => ['required', Rule::in(['completed', 'no_show', 'cancelled'])],
        ]);

        abort_unless($booking->status === 'confirmed', 422, 'This booking is not active anymore.');

        match ($validated['action']) {
            'completed' => $this->markOutcome($request, $booking, 'completed'),
            'no_show' => $this->markOutcome($request, $booking, 'no_show'),
            'cancelled' => $cancelBooking->handle($booking, 'owner'),
        };

        return back()->with('success', 'Booking updated.');
    }

    private function markOutcome(Request $request, Booking $booking, string $outcome): void
    {
        abort_if($booking->starts_at->isFuture(), 422, 'You can mark an outcome only after the booking starts.');

        DB::transaction(function () use ($request, $booking, $outcome): void {
            $booking->forceFill([
                'status' => $outcome,
                'completed_at' => now(),
            ])->save();

            $booking->followUpTasks()->where('status', 'pending')->update([
                'status' => 'completed',
                'completed_at' => now(),
            ]);

            if ($outcome === 'no_show') {
                $request->user()->followUpTasks()->create([
                    'contact_id' => $booking->contact_id,
                    'booking_id' => $booking->id,
                    'title' => "Re-engage {$booking->invitee_name} after missed appointment",
                    'description' => "The invitee did not show up for {$booking->page->title}. Reach out to reschedule: {$booking->invitee_email}"
                        .($booking->invitee_phone ? " / {$booking->invitee_phone}" : ''),
                    'due_at' => now()->addDay(),
                    'status' => 'pending',
                ]);
            }

            $booking->contact?->activities()->create([
                'actor_user_id' => $request->user()->id,
                'type' => $outcome === 'no_show' ? 'booking_no_show' : 'booking_completed',
                'payload' => [
                    'booking_uuid' => $booking->uuid,
                    'booking_page' => $booking->page->title,
                ],
            ]);
        });
    }

    /**
     * @return array<string, mixed>
     */
    private function bookingData(Booking $booking): array
    {
        $page = $booking->page;
        $starts = $booking->starts_at->setTimezone($page->timezone);
        $ends = $booking->ends_at->setTimezone($page->timezone);

        return [
            'id' => $booking->id,
            'page_title' => $page->title,
            'location' => $page->location,
            'duration_minutes' => $page->duration_minutes,
            'invitee_name' => $booking->invitee_name,
            'invitee_email' => $booking->invitee_email,
            'invitee_phone' => $booking->invitee_phone,
            'invitee_notes' => $booking->invitee_notes,
            'date_display' => $starts->format('D, M j, Y'),
            'time_display' => $starts->format('g:i A').' – '.$ends->format('g:i A'),
            'timezone' => $page->timezone,
            'status' => $booking->status,
            'cancellation_reason' => $booking->cancellation_reason,
            'starts_at' => $booking->starts_at->toIso8601String(),
            'starts_in_future' => $booking->starts_at->isFuture(),
            'contact_id' => $booking->contact_id,
            'contact_name' => $booking->contact?->name ?: $booking->contact?->email,
        ];
    }

    // ---------------------------------------------------------------------
    // Public demo-scheduler booking (/book-a-demo)
    // ---------------------------------------------------------------------

    public function show(Request $request, ClientAcquisitionConfiguration $configuration, AppointmentSchedule $schedule): Response
    {
        $owner = $this->configuredOwner();
        $settings = $schedule->resolveSettings($configuration->forOwner($owner->id));

        abort_unless($schedule->isEnabled($settings), 404, 'Appointment booking is currently unavailable.');

        return Inertia::render('appointments/book', [
            'services' => collect($settings['services'] ?? [])->map(fn (array $service): array => [
                'key' => $service['key'],
                'label_en' => $service['label_en'],
                'label_am' => $service['label_am'] ?? null,
            ])->values()->all(),
            'settings' => [
                'timezone' => $schedule->timezone($settings),
                'business_hours' => $schedule->businessHours($settings),
                'slot_minutes' => $schedule->slotMinutes($settings),
                'buffer_minutes' => $schedule->bufferMinutes($settings),
                'advance_days' => $schedule->advanceDays($settings),
                'max_per_day' => $schedule->maxPerDay($settings),
            ],
            'meetingTypes' => $schedule->meetingTypes($settings),
            'dates' => $this->selectableDates($settings),
            'responseEmail' => $settings['response_email'] ?? null,
            'responseTimeHours' => $settings['response_time_hours'] ?? null,
            'whatsappUrl' => $settings['whatsapp_url'] ?? null,
            'meetingUrl' => $settings['meeting_url'] ?? null,
        ]);
    }

    public function availability(Request $request, ClientAcquisitionConfiguration $configuration, AppointmentSchedule $schedule): JsonResponse
    {
        $owner = $this->configuredOwner();
        $settings = $schedule->resolveSettings($configuration->forOwner($owner->id));

        abort_unless($schedule->isEnabled($settings), 404, 'Appointment booking is currently unavailable.');

        $validated = $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
        ]);

        $date = Carbon::parse($validated['date'], $schedule->timezone($settings));

        return response()->json([
            'date' => $date->toDateString(),
            'slots' => $schedule->availableSlots($date, $owner->id, $settings),
            'business_hours' => $schedule->businessHours($settings),
            'slot_minutes' => $schedule->slotMinutes($settings),
        ]);
    }

    public function store(
        StoreAppointmentRequest $request,
        HandleAppointmentBooking $booking,
        ClientAcquisitionConfiguration $configuration,
        AppointmentSchedule $schedule,
    ): RedirectResponse {
        $owner = $this->configuredOwner();
        $validated = $request->validated();
        $settings = $schedule->resolveSettings($configuration->forOwner($owner->id));

        abort_unless($schedule->isEnabled($settings), 404, 'Appointment booking is currently unavailable.');

        $start = $schedule->resolveStart($validated['date'], $validated['time'], $settings);

        abort_unless(
            $schedule->canBook($start, $owner->id, $settings),
            422,
            'That time is no longer available. Please choose another slot.',
        );

        $analyticsFunnel = $this->publishedAnalyticsFunnel($owner, $settings['analytics_funnel_id'] ?? null);

        $bookingInput = array_merge($validated, [
            'timezone' => $schedule->timezone($settings),
            'duration_minutes' => $schedule->slotMinutes($settings),
        ]);

        /** @var Appointment|null $appointment */
        $appointment = null;
        /** @var Contact|null $contact */
        $contact = null;

        DB::transaction(function () use ($owner, $booking, $bookingInput, $request, $configuration, $analyticsFunnel, $validated, $start, $schedule, $settings, &$appointment, &$contact): void {
            $result = $booking->handle($owner, $bookingInput, $request, $configuration->forOwner($owner->id), $analyticsFunnel);
            $contact = $result['contact'];

            $appointment = Appointment::create([
                'user_id' => $owner->id,
                'contact_id' => $contact->id,
                'company_name' => trim($validated['company_name']),
                'contact_name' => trim($validated['contact_name']),
                'email' => mb_strtolower($validated['email']),
                'phone' => filled($validated['phone'] ?? null) ? trim((string) $validated['phone']) : null,
                'service_key' => $validated['service_key'],
                'service_label' => $result['project']['service_label'],
                'meeting_type' => $validated['meeting_type'],
                'start_at' => $start->copy()->setTimezone(config('app.timezone', 'UTC')),
                'timezone' => $schedule->timezone($settings),
                'duration_minutes' => $schedule->slotMinutes($settings),
                'status' => 'confirmed',
                'notes' => filled($validated['notes'] ?? null) ? trim((string) $validated['notes']) : null,
                'metadata' => [
                    'attribution' => $validated['attribution'] ?? [],
                    'source' => 'appointment_booking',
                ],
            ]);

            $contact->activities()->create([
                'actor_user_id' => $owner->id,
                'type' => 'appointment_booked',
                'payload' => [
                    'appointment_id' => $appointment->id,
                    'company_name' => $appointment->company_name,
                    'start_at' => $appointment->start_at->toIso8601String(),
                    'meeting_type' => $appointment->meeting_type,
                ],
            ]);

            FollowUpTask::create([
                'user_id' => $owner->id,
                'contact_id' => $contact->id,
                'title' => 'Prepare for the '.$appointment->meeting_type.' with '.$appointment->company_name,
                'description' => 'Review the service request and appointment notes before the meeting.',
                'due_at' => $appointment->start_at->copy()->subHour(),
                'status' => 'pending',
            ]);
        });

        $this->dispatchNotifications($appointment, $contact);

        return redirect()->to(URL::temporarySignedRoute(
            'appointments.thank-you',
            now()->addMinutes(30),
            ['appointment' => $appointment->id],
        ));
    }

    public function thankYou(Request $request, Appointment $appointment, ClientAcquisitionConfiguration $configuration, AppointmentSchedule $schedule): Response
    {
        $owner = $this->configuredOwner();
        abort_unless($appointment->user_id === $owner->id, 404);

        $settings = $schedule->resolveSettings($configuration->forOwner($owner->id));

        return Inertia::render('appointments/thank-you', [
            'appointment' => [
                'id' => $appointment->id,
                'company_name' => $appointment->company_name,
                'contact_name' => $appointment->contact_name,
                'email' => $appointment->email,
                'phone' => $appointment->phone,
                'service_key' => $appointment->service_key,
                'service_label' => $appointment->service_label,
                'meeting_type' => $appointment->meeting_type,
                'meeting_type_label' => $schedule->meetingTypeLabel($settings, $appointment->meeting_type),
                'start_at' => $appointment->start_at->setTimezone($appointment->timezone)->format('Y-m-d\TH:i:sP'),
                'start_display' => $appointment->start_at->setTimezone($appointment->timezone)->translatedFormat('l, F j, Y · H:i'),
                'timezone' => $appointment->timezone,
                'duration_minutes' => $appointment->duration_minutes,
                'status' => $appointment->status,
                'notes' => $appointment->notes,
            ],
            'nextSteps' => [
                'response_email' => $settings['response_email'] ?? null,
                'whatsapp_url' => $settings['whatsapp_url'] ?? null,
                'meeting_url' => $settings['meeting_url'] ?? null,
            ],
        ]);
    }

    // ---------------------------------------------------------------------
    // Owner dashboard for demo-scheduler appointments (/appointments/manage)
    // ---------------------------------------------------------------------

    public function manageIndex(Request $request, ClientAcquisitionConfiguration $configuration, AppointmentSchedule $schedule): Response
    {
        $user = $request->user();
        abort_unless($user?->isBusinessOwner(), 403);

        $filters = array_merge([
            'status' => null,
            'date_from' => null,
            'date_to' => null,
            'service_key' => null,
            'view' => 'upcoming',
        ], $request->validate([
            'status' => ['nullable', 'in:'.implode(',', Appointment::STATUSES)],
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:date_from'],
            'service_key' => ['nullable', 'string', 'max:40'],
            'view' => ['nullable', 'in:upcoming,past,all'],
        ]));

        $query = Appointment::query()
            ->forUser((int) $user->id)
            ->with('contact:id,name,email,phone,source,status,client_project')
            ->when($filters['status'], fn ($query, $status) => $query->where('status', $status))
            ->when($filters['service_key'], fn ($query, $service) => $query->where('service_key', $service))
            ->when($filters['date_from'], function ($query) use ($filters): void {
                $query->where('start_at', '>=', Carbon::parse($filters['date_from'])->startOfDay());
            })
            ->when($filters['date_to'], function ($query) use ($filters): void {
                $query->where('start_at', '<=', Carbon::parse($filters['date_to'])->endOfDay());
            });

        if ($filters['view'] === 'upcoming') {
            $query->upcoming();
        } elseif ($filters['view'] === 'past') {
            $query->past();
        }

        $appointments = $query->orderByDesc('start_at')->get();
        $timezone = $schedule->timezone($schedule->resolveSettings($configuration->forOwner($user->id)));

        $stats = [
            'upcoming' => (int) Appointment::query()->forUser((int) $user->id)->upcoming()->count(),
            'confirmed' => (int) Appointment::query()->forUser((int) $user->id)->where('status', 'confirmed')->upcoming()->count(),
            'cancelled' => (int) Appointment::query()->forUser((int) $user->id)->where('status', 'cancelled')->count(),
            'completed' => (int) Appointment::query()->forUser((int) $user->id)->where('status', 'completed')->count(),
            'no_show' => (int) Appointment::query()->forUser((int) $user->id)->where('status', 'no_show')->count(),
        ];

        return Inertia::render('appointments/manage', [
            'timezone' => $timezone,
            'stats' => $stats,
            'filters' => [
                'status' => $filters['status'] ?? '',
                'date_from' => $filters['date_from'] ?? '',
                'date_to' => $filters['date_to'] ?? '',
                'service_key' => $filters['service_key'] ?? '',
                'view' => $filters['view'] ?? 'upcoming',
            ],
            'appointments' => $appointments->map(fn (Appointment $appointment): array => [
                'id' => $appointment->id,
                'company_name' => $appointment->company_name,
                'contact_name' => $appointment->contact_name,
                'email' => $appointment->email,
                'phone' => $appointment->phone,
                'service_label' => $appointment->service_label,
                'service_key' => $appointment->service_key,
                'meeting_type' => $appointment->meeting_type,
                'start_at' => $appointment->start_at->setTimezone($timezone)->toIso8601String(),
                'start_display' => $appointment->start_at->setTimezone($timezone)->translatedFormat('l, F j, Y · H:i'),
                'timezone' => $appointment->timezone,
                'status' => $appointment->status,
                'notes' => $appointment->notes,
                'contact' => $appointment->contact ? [
                    'id' => $appointment->contact->id,
                    'name' => $appointment->contact->name,
                    'email' => $appointment->contact->email,
                    'phone' => $appointment->contact->phone,
                    'source' => $appointment->contact->source,
                    'status' => $appointment->contact->status,
                ] : null,
            ])->values()->all(),
        ]);
    }

    public function updateStatus(
        UpdateAppointmentRequest $request,
        Appointment $appointment,
        ClientAcquisitionConfiguration $configuration,
        AppointmentSchedule $schedule,
    ): RedirectResponse {
        $user = $request->user();
        abort_unless($user?->isBusinessOwner(), 403);
        abort_unless($appointment->user_id === $user->id, 404);

        $status = $request->validated('status');
        $this->assertTransition($appointment, $status);

        $previousStatus = $appointment->status;
        $appointment->forceFill(['status' => $status])->save();

        if ($status === 'cancelled' || $status === 'completed' || $status === 'no_show') {
            $appointment->contact?->activities()->create([
                'actor_user_id' => $user->id,
                'type' => 'appointment_status_changed',
                'payload' => [
                    'appointment_id' => $appointment->id,
                    'from' => $previousStatus,
                    'to' => $status,
                ],
            ]);
        }

        if (in_array($status, ['cancelled', 'completed', 'no_show'], true)) {
            $appointment->user->followUpTasks()
                ->where('contact_id', $appointment->contact_id)
                ->where('status', 'pending')
                ->where(fn ($query) => $query->where('title', 'like', '%'.$appointment->company_name.'%')
                    ->orWhere('due_at', '<=', $appointment->start_at))
                ->update(['status' => 'completed', 'completed_at' => now()]);
        }

        return back()->with('success', 'Appointment '.$status.'.');
    }

    /**
     * @return array<int, string>
     */
    private function selectableDates(array $settings): array
    {
        $timezone = $settings['appointment_timezone'] ?? config('appointments.timezone');
        $today = now()->setTimezone($timezone)->startOfDay();
        $max = max(1, (int) ($settings['appointment_advance_days'] ?? config('appointments.advance_days')));

        return Carbon::range($today->copy()->addDay(), $today->copy()->addDays($max))
            ->map(fn (Carbon $date): string => $date->toDateString())
            ->all();
    }

    private function publishedAnalyticsFunnel(User $owner, ?int $funnelId): ?Funnel
    {
        if (! $funnelId) {
            return null;
        }

        return $owner->funnels()->where('is_published', true)->find($funnelId);
    }

    private function dispatchNotifications(Appointment $appointment, Contact $contact): void
    {
        try {
            $job = SendAppointmentNotifications::dispatch($appointment->id, $contact->id)
                ->onQueue(config('automation.queue', 'default'));

            if (config('queue.default') === 'sync') {
                $job->afterResponse();
            }
        } catch (Throwable $exception) {
            report($exception);
        }
    }

    private function assertTransition(Appointment $appointment, string $status): void
    {
        $allowed = match ($status) {
            'confirmed' => ['pending', 'confirmed'],
            'cancelled' => ['pending', 'confirmed'],
            'completed' => ['confirmed'],
            'no_show' => ['confirmed'],
            'pending' => ['pending', 'confirmed'],
            default => [],
        };

        abort_unless(in_array($appointment->status, $allowed, true), 422, 'This appointment status cannot be changed to '.$status.'.');
    }

    private function configuredOwner(): User
    {
        $owner = User::configuredLeadOwner();
        abort_unless($owner, 503, 'Appointment booking is not configured. Set ADMIN_EMAIL or BUSINESS_AUDIT_OWNER_ID to the business owner account.');

        return $owner;
    }
}
