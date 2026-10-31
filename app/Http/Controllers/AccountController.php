<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\Appointment;
use App\Models\Booking;
use App\Models\ClientProject;
use App\Models\Contact;
use App\Services\Marketplace\MarketplaceAccessService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AccountController extends Controller
{
    public function index(Request $request, MarketplaceAccessService $access): Response|RedirectResponse
    {
        $user = $request->user();

        // The business owner manages the console at /admin. The account page is
        // the customer portal for registered (non-owner) users.
        if ($user->isBusinessOwner()) {
            return redirect()->route('dashboard');
        }

        $requests = $user->customerContacts()
            ->latest('last_submitted_at')
            ->latest('updated_at')
            ->take(10)
            ->get()
            ->map(fn (Contact $contact): array => [
                'id' => $contact->id,
                'name' => $contact->name,
                'email' => $contact->email,
                'source' => $contact->source,
                'status' => $contact->status,
                'last_submitted_at' => $contact->last_submitted_at?->toIso8601String(),
            ])
            ->values();

        $contactIds = $user->customerContacts()->pluck('id');

        $projects = ClientProject::query()
            ->whereIn('contact_id', $contactIds)
            ->with('milestones:id,client_project_id,status')
            ->latest('updated_at')
            ->take(5)
            ->get()
            ->map(fn (ClientProject $project): array => [
                'id' => $project->id,
                'title' => $project->title,
                'status' => $project->status,
                'scope_summary' => $project->scope_summary,
                'target_completion_date' => $project->target_completion_date?->toDateString(),
                'milestones_count' => $project->milestones->count(),
                'milestones_completed' => $project->milestones->where('status', 'completed')->count(),
            ])
            ->values();

        $appointments = Appointment::query()
            ->whereHas('contact', fn ($query) => $query->where('customer_user_id', $user->id))
            ->latest('start_at')
            ->get()
            ->map(fn (Appointment $appointment): array => [
                'id' => $appointment->id,
                'company_name' => $appointment->company_name,
                'contact_name' => $appointment->contact_name,
                'service_label' => $appointment->service_label,
                'meeting_type' => $appointment->meeting_type,
                'start_at' => $appointment->start_at?->toIso8601String(),
                'timezone' => $appointment->timezone,
                'duration_minutes' => $appointment->duration_minutes,
                'status' => $appointment->status,
                'notes' => $appointment->notes,
            ])
            ->values();

        $upcomingBookings = Booking::query()
            ->whereHas('contact', fn ($query) => $query->where('customer_user_id', $user->id))
            ->with('page:id,title,timezone')
            ->where('status', 'confirmed')
            ->where('starts_at', '>=', now())
            ->orderBy('starts_at')
            ->take(5)
            ->get()
            ->map(fn (Booking $booking): array => [
                'uuid' => $booking->uuid,
                'name' => $booking->page?->title,
                'starts_at' => $booking->starts_at?->toIso8601String(),
                'timezone' => $booking->invitee_timezone ?: $booking->page?->timezone,
                'status' => $booking->status,
            ])
            ->values();

        $orders = $user->marketplacePurchases()
            ->with('template:id,name')
            ->latest('created_at')
            ->take(5)
            ->get()
            ->map(fn ($purchase): array => [
                'id' => $purchase->id,
                'reference' => $purchase->tx_ref,
                'status' => $purchase->status,
                'created_at' => $purchase->created_at?->toIso8601String(),
                'amount_minor' => $purchase->amount_minor,
                'currency' => $purchase->currency,
                'product_name' => $purchase->template?->name,
            ])
            ->values();

        $downloads = $user->marketplacePurchases()
            ->where('status', 'paid')
            ->with('template.bundleItems')
            ->latest('paid_at')
            ->get()
            ->flatMap(function ($purchase) use ($access, $user) {
                $templates = $purchase->template?->type === 'bundle'
                    ? $purchase->template->bundleItems->where('type', 'template')
                    : collect([$purchase->template])->filter();

                return $templates
                    ->filter(fn ($template) => $template->file_path && $access->hasPaidPurchase($user, $template))
                    ->map(fn ($template): array => [
                        'id' => $template->id,
                        'name' => $template->name,
                        'url' => route('marketplace.download', $template->slug),
                    ]);
            })
            ->unique('id')
            ->take(10)
            ->values();

        return Inertia::render('account/index', [
            'profile' => $user->only(['name', 'email']),
            'summary' => [
                'open_requests' => $user->customerContacts()->whereNotIn('status', ['won', 'lost'])->count(),
                'active_projects' => ClientProject::query()
                    ->whereIn('contact_id', $contactIds)
                    ->whereIn('status', ['planning', 'in_progress', 'review'])
                    ->count(),
                'completed_projects' => ClientProject::query()
                    ->whereIn('contact_id', $contactIds)
                    ->where('status', 'completed')
                    ->count(),
                'pending_orders' => $user->marketplacePurchases()->whereIn('status', ['pending', 'awaiting_payment'])->count(),
                'upcoming_appointments' => Appointment::query()
                    ->whereHas('contact', fn ($query) => $query->where('customer_user_id', $user->id))
                    ->whereIn('status', Appointment::ACTIVE_STATUSES)
                    ->where('start_at', '>=', now())
                    ->count(),
            ],
            'requests' => $requests,
            'projects' => $projects,
            'appointments' => $appointments,
            'orders' => $orders,
            'downloads' => $downloads,
            'activities' => Activity::query()
                ->where('user_id', $user->id)
                ->latest()
                ->limit(10)
                ->get()
                ->map(fn (Activity $activity): array => [
                    'id' => $activity->id,
                    'action' => $activity->action,
                    'meta' => $activity->meta ?? [],
                    'created_at' => $activity->created_at?->toIso8601String(),
                ])
                ->values(),
            'upcomingBookings' => $upcomingBookings,
            'order_count' => $user->marketplacePurchases()->count(),
            'paid_order_count' => $user->marketplacePurchases()->where('status', 'paid')->count(),
        ]);
    }
}
