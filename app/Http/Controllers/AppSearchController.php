<?php

namespace App\Http\Controllers;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Owner-only global search across CRM contacts, funnels, and bookings.
 * Returns small grouped payloads for the header search dropdown.
 */
class AppSearchController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:80'],
        ]);

        $term = '%'.$validated['q'].'%';
        $user = $request->user();

        $contacts = $user->contacts()
            ->where(fn (Builder $query) => $query
                ->whereLike('name', $term)
                ->orWhereLike('email', $term)
                ->orWhereLike('phone', $term))
            ->latest('updated_at')
            ->limit(5)
            ->get(['id', 'name', 'email', 'status'])
            ->map(fn ($contact): array => [
                'id' => 'contact-'.$contact->id,
                'title' => $contact->name ?: $contact->email,
                'detail' => $contact->email.' · '.$contact->status,
                'url' => route('contacts.show', $contact->id),
            ]);

        $funnels = $user->funnels()
            ->where(fn (Builder $query) => $query
                ->whereLike('name', $term)
                ->orWhereLike('slug', $term))
            ->latest('updated_at')
            ->limit(5)
            ->get(['id', 'name', 'slug', 'status'])
            ->map(fn ($funnel): array => [
                'id' => 'funnel-'.$funnel->id,
                'title' => $funnel->name,
                'detail' => '/f/'.$funnel->slug.' · '.$funnel->status,
                'url' => route('funnels.edit', $funnel->id),
            ]);

        $bookings = $user->bookings()
            ->with('page:id,title')
            ->where(fn (Builder $query) => $query
                ->whereLike('invitee_name', $term)
                ->orWhereLike('invitee_email', $term))
            ->latest('created_at')
            ->limit(5)
            ->get(['id', 'booking_page_id', 'invitee_name', 'invitee_email', 'status', 'starts_at'])
            ->map(fn ($booking): array => [
                'id' => 'booking-'.$booking->id,
                'title' => $booking->invitee_name,
                'detail' => $booking->page?->title.' · '.$booking->starts_at->format('M j, g:i A').' · '.$booking->status,
                'url' => route('appointments.index'),
            ]);

        return response()->json([
            'query' => $validated['q'],
            'groups' => [
                'contacts' => $contacts,
                'funnels' => $funnels,
                'bookings' => $bookings,
            ],
        ]);
    }
}
