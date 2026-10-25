<?php

namespace App\Http\Controllers;

use App\Models\ClientProject;
use App\Models\Contact;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AccountController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();

        $requests = $user->contacts()
            ->latest('last_submitted_at')
            ->latest('updated_at')
            ->take(5)
            ->get()
            ->map(fn (Contact $contact): array => [
                'id' => $contact->id,
                'name' => $contact->name,
                'email' => $contact->email,
                'status' => $contact->status,
                'last_submitted_at' => $contact->last_submitted_at?->toIso8601String(),
            ])
            ->values();

        $projects = $user->clientProjects()
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

        return Inertia::render('account/index', [
            'profile' => $user->only(['name', 'email']),
            'summary' => [
                'open_requests' => $user->contacts()->whereNotIn('status', ['won', 'lost'])->count(),
                'active_projects' => $user->clientProjects()->whereIn('status', ['planning', 'in_progress', 'review'])->count(),
                'completed_projects' => $user->clientProjects()->where('status', 'completed')->count(),
                'pending_orders' => $user->marketplacePurchases()->whereIn('status', ['pending', 'awaiting_payment'])->count(),
            ],
            'requests' => $requests,
            'projects' => $projects,
            'orders' => $orders,
            'order_count' => $user->marketplacePurchases()->count(),
            'paid_order_count' => $user->marketplacePurchases()->where('status', 'paid')->count(),
        ]);
    }
}
