<?php

namespace App\Http\Controllers;

use App\Actions\Bookings\CancelBooking;
use App\Actions\Bookings\CreateBooking;
use App\Actions\Bookings\RescheduleBooking;
use App\Http\Requests\StoreBookingRequest;
use App\Models\Booking;
use App\Models\BookingPage;
use App\Services\Bookings\BookingAvailability;
use DateTimeZone;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class PublicBookingController extends Controller
{
    public function show(BookingPage $page, BookingAvailability $availability): Response
    {
        abort_unless($page->is_active, 404);

        return Inertia::render('booking/show', [
            'page' => $this->pageData($page),
            'availableDates' => $availability->availableDates($page),
        ]);
    }

    public function slots(BookingPage $page, Request $request, BookingAvailability $availability): JsonResponse
    {
        abort_unless($page->is_active, 404);

        $validated = $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
            'tz' => ['nullable', 'string', 'max:64', Rule::in(DateTimeZone::listIdentifiers())],
            'booking' => ['nullable', 'string', 'uuid'],
            'token' => ['nullable', 'string', 'max:64'],
        ]);

        // When rescheduling, the invitee's own booking is offered as movable —
        // it must not block its own slot. The manage token is required before
        // any booking is excluded from conflict checks.
        $excludeBookingId = null;
        if (! empty($validated['booking']) && ! empty($validated['token'])) {
            $exclude = $page->bookings()->where('uuid', $validated['booking'])->first();
            if ($exclude && hash_equals($exclude->manage_token, $validated['token'])) {
                $excludeBookingId = $exclude->id;
            }
        }

        return response()->json([
            'slots' => $availability->slotsForDate($page, $validated['date'], $validated['tz'] ?? null, $excludeBookingId),
        ]);
    }

    public function store(StoreBookingRequest $request, BookingPage $page, CreateBooking $createBooking): RedirectResponse
    {
        abort_unless($page->is_active, 404);

        $booking = $createBooking->handle($page, $request->validated(), $request);

        return redirect()->route('booking.confirmation', [
            'booking' => $booking->uuid,
            'token' => $booking->manage_token,
        ]);
    }

    public function confirmation(Booking $booking, string $token): Response
    {
        $this->authorizeToken($booking, $token);

        return Inertia::render('booking/confirmation', [
            'page' => $this->pageData($booking->page),
            'booking' => $this->bookingData($booking),
        ]);
    }

    public function manage(Booking $booking, string $token, BookingAvailability $availability): Response
    {
        $this->authorizeToken($booking, $token);

        return Inertia::render('booking/manage', [
            'page' => $this->pageData($booking->page),
            'booking' => $this->bookingData($booking),
            'availableDates' => $booking->isChangeable()
                ? $availability->availableDates($booking->page)
                : [],
        ]);
    }

    public function cancel(Request $request, Booking $booking, string $token, CancelBooking $cancelBooking): RedirectResponse
    {
        $this->authorizeToken($booking, $token);

        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:500'],
        ]);

        abort_unless($booking->isChangeable(), 404);

        $cancelBooking->handle($booking, 'invitee', $validated['reason'] ?? null);

        return redirect()
            ->route('booking.manage', ['booking' => $booking->uuid, 'token' => $booking->manage_token])
            ->with('success', 'Your booking was cancelled.');
    }

    public function reschedule(Request $request, Booking $booking, string $token, RescheduleBooking $rescheduleBooking): RedirectResponse
    {
        $this->authorizeToken($booking, $token);

        $validated = $request->validate([
            'date' => ['required', 'date_format:Y-m-d'],
            'time' => ['required', 'date_format:H:i'],
            'timezone' => ['nullable', 'string', 'max:64', Rule::in(DateTimeZone::listIdentifiers())],
        ]);

        abort_unless($booking->isChangeable(), 404);

        $rescheduleBooking->handle($booking, $validated);

        return redirect()
            ->route('booking.manage', ['booking' => $booking->uuid, 'token' => $booking->manage_token])
            ->with('success', 'Your booking was rescheduled.');
    }

    private function authorizeToken(Booking $booking, string $token): void
    {
        // A constant-time miss behaves like a missing booking so tokens
        // cannot be probed by response difference.
        abort_unless(hash_equals($booking->manage_token, $token), 404);
    }

    /**
     * @return array<string, mixed>
     */
    private function pageData(BookingPage $page): array
    {
        return [
            'slug' => $page->slug,
            'title' => $page->title,
            'description' => $page->description,
            'location' => $page->location,
            'duration_minutes' => $page->duration_minutes,
            'timezone' => $page->timezone,
            'advance_days' => $page->advance_days,
            'is_active' => $page->is_active,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function bookingData(Booking $booking): array
    {
        $page = $booking->page;
        [$tzName, $tz] = $this->displayTimezone($booking);
        $starts = $booking->starts_at->setTimezone($tz);
        $ends = $booking->ends_at->setTimezone($tz);

        return [
            'uuid' => $booking->uuid,
            'token' => $booking->manage_token,
            'status' => $booking->status,
            'name' => $booking->invitee_name,
            'email' => $booking->invitee_email,
            'date_display' => $starts->format('l, F j, Y'),
            'time_display' => $starts->format('g:i A').' – '.$ends->format('g:i A'),
            'tz_label' => $tzName,
            'manage_url' => $booking->manageUrl(),
            'google_calendar_url' => 'https://calendar.google.com/calendar/render?'.http_build_query([
                'action' => 'TEMPLATE',
                'text' => $page->title,
                'dates' => $booking->starts_at->format('Ymd\THis\Z').'/'.$booking->ends_at->format('Ymd\THis\Z'),
                'details' => "Booked via {$page->title}.\nManage or reschedule: ".$booking->manageUrl(),
                'location' => (string) ($page->location ?? ''),
            ]),
            'can_change' => $booking->isChangeable(),
        ];
    }

    /**
     * @return array{0: string, 1: DateTimeZone}
     */
    private function displayTimezone(Booking $booking): array
    {
        $name = $booking->invitee_timezone ?: $booking->page->timezone;
        try {
            return [$name, new DateTimeZone($name)];
        } catch (Throwable) {
            $fallback = $booking->page->timezone;

            return [$fallback, new DateTimeZone($fallback)];
        }
    }
}
