<?php

namespace App\Http\Controllers;

use App\Actions\Bookings\CancelBooking;
use App\Models\Booking;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AppointmentController extends Controller
{
    public function index(Request $request): Response
    {
        $validated = $request->validate([
            'view' => ['nullable', Rule::in(['upcoming', 'past', 'cancelled'])],
        ]);
        $view = $validated['view'] ?? 'upcoming';

        $baseQuery = fn (): Builder => $request->user()->bookings();

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
                // Missed meetings create a re-engagement task so the lead does
                // not silently drop out of the funnel.
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
}
