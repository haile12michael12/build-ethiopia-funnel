<?php

namespace App\Http\Controllers;

use App\Models\Booking;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/**
 * Owner-only header notifications, derived live from CRM state (no separate
 * notification storage): fresh bookings, meetings happening today, overdue
 * follow-up tasks, and recently failed automation runs.
 */
class AppNotificationsController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $user = $request->user();

        /** @var Collection<int, array<string, string>> $items */
        $items = collect();

        $user->bookings()
            ->with('page:id,title')
            ->where('status', 'confirmed')
            ->where('created_at', '>=', now()->subDays(2))
            ->latest('created_at')
            ->limit(5)
            ->get()
            ->each(fn (Booking $booking) => $items->push([
                'id' => 'booking-new-'.$booking->id,
                'type' => 'booking_new',
                'title' => "New booking: {$booking->invitee_name}",
                'detail' => ($booking->page?->title ?? 'Booking').' · '.$booking->starts_at
                    ->setTimezone($booking->page?->timezone ?? config('booking.default_timezone', 'Africa/Addis_Ababa'))
                    ->format('M j, g:i A'),
                'url' => route('appointments.index'),
                'occurred_at' => $booking->created_at->toIso8601String(),
            ]));

        $todayCount = $user->bookings()
            ->where('status', 'confirmed')
            ->whereBetween('starts_at', [now()->startOfDay(), now()->endOfDay()])
            ->count();
        if ($todayCount > 0) {
            $items->push([
                'id' => 'bookings-today',
                'type' => 'booking_today',
                'title' => trans_choice('{1} :count appointment today|:count appointments today', $todayCount, ['count' => $todayCount]),
                'detail' => 'Scheduled to start today.',
                'url' => route('appointments.index'),
                'occurred_at' => now()->startOfDay()->toIso8601String(),
            ]);
        }

        $overdue = $user->followUpTasks()
            ->with('contact:id,name,email')
            ->where('status', 'pending')
            ->where('due_at', '<', now())
            ->oldest('due_at')
            ->limit(5)
            ->get();
        $overdue->each(fn ($task) => $items->push([
            'id' => 'task-overdue-'.$task->id,
            'type' => 'task_overdue',
            'title' => 'Overdue: '.$task->title,
            'detail' => 'For '.($task->contact?->name ?: $task->contact?->email ?? 'a contact').' · due '.$task->due_at->format('M j, g:i A'),
            'url' => route('follow-up-tasks.index', ['view' => 'overdue']),
            'occurred_at' => $task->due_at->toIso8601String(),
        ]));

        $failedRuns = $user->automationRuns()
            ->where('status', 'failed')
            ->where('updated_at', '>=', now()->subDays(3))
            ->latest('updated_at')
            ->limit(3)
            ->get(['id', 'workflow_id', 'updated_at']);
        if ($failedRuns->isNotEmpty()) {
            $items->push([
                'id' => 'automation-failed',
                'type' => 'automation_failed',
                'title' => trans_choice('{1} :count automation run failed|:count automation runs failed', $failedRuns->count(), ['count' => $failedRuns->count()]),
                'detail' => 'Most recent '.($failedRuns->first()->updated_at?->diffForHumans() ?? 'recently').'.',
                'url' => route('automations.index'),
                'occurred_at' => $failedRuns->first()->updated_at?->toIso8601String() ?? now()->toIso8601String(),
            ]);
        }

        $sorted = $items->sortByDesc('occurred_at')->values();

        return response()->json([
            'count' => $sorted->count(),
            'items' => $sorted,
            'generated_at' => now()->toIso8601String(),
        ]);
    }
}
