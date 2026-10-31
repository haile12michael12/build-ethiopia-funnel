<?php

namespace App\Services;

use App\Models\Activity;
use App\Models\Appointment;
use App\Models\Booking;
use App\Models\Contact;
use App\Models\MarketplacePurchase;
use App\Models\User;

class OwnerDashboardSummary
{
    /**
     * @return array{users:int, leads:int, bookings_last_7_days:int, verified_revenue:array<string, int>, recent_activity: \Illuminate\Support\Collection<int, array<string, mixed>>}
     */
    public function for(User $owner): array
    {
        $since = now()->subDays(7);
        $calendarBookings = Booking::query()
            ->whereHas('page', fn ($query) => $query->where('user_id', $owner->id))
            ->where('created_at', '>=', $since)
            ->count();

        $demoAppointments = Appointment::query()
            ->forUser((int) $owner->id)
            ->where('created_at', '>=', $since)
            ->count();

        $revenue = MarketplacePurchase::query()
            ->where('provider', 'chapa')
            ->where('status', 'paid')
            ->whereNotNull('paid_at')
            ->selectRaw('currency, SUM(amount_minor) as total_minor')
            ->groupBy('currency')
            ->pluck('total_minor', 'currency')
            ->map(fn ($amount): int => (int) $amount)
            ->all();

        return [
            'users' => User::query()->count(),
            'leads' => Contact::query()->where('user_id', $owner->id)->count(),
            'bookings_last_7_days' => $calendarBookings + $demoAppointments,
            'verified_revenue' => $revenue,
            'recent_activity' => Activity::query()
                ->with('user:id,name,email')
                ->latest()
                ->limit(10)
                ->get()
                ->map(fn (Activity $activity): array => [
                    'id' => $activity->id,
                    'action' => $activity->action,
                    'meta' => $activity->meta ?? [],
                    'user' => $activity->user?->only(['id', 'name', 'email']),
                    'created_at' => $activity->created_at?->toIso8601String(),
                ]),
        ];
    }
}