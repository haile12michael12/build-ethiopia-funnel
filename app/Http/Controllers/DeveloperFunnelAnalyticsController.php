<?php

namespace App\Http\Controllers;

use App\Models\Funnel;
use App\Models\FunnelEvent;
use App\Models\MarketplacePurchase;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DeveloperFunnelAnalyticsController extends Controller
{
    private const FUNNEL_SLUGS = [
        'mern-saas-starter',
        'mern-starter-delivery',
        'developer-quiz',
        'mern-boilerplate',
        'mern-course',
        'code-review',
        'thank-you',
    ];

    public function index(Request $request): Response
    {
        $user = $request->user();
        $funnelIds = Funnel::query()
            ->where('user_id', $user->id)
            ->whereIn('slug', self::FUNNEL_SLUGS)
            ->select('id');
        $since = now()->subDays(29)->startOfDay();
        $events = FunnelEvent::query()
            ->whereIn('funnel_id', $funnelIds)
            ->where('occurred_at', '>=', $since)
            ->get(['event_type', 'session_id', 'attribution', 'variant_id']);

        $count = fn (string $eventType): int => $events->where('event_type', $eventType)->count();
        $conversions = $events->where('event_type', 'conversion');
        $sources = $conversions
            ->countBy(fn (FunnelEvent $event) => data_get($event->attribution, 'utm_source', 'Direct'))
            ->sortDesc()
            ->map(fn (int $conversions, string $source) => ['source' => $source, 'conversions' => $conversions])
            ->values();

        $variants = $events->whereNotNull('variant_id')->groupBy('variant_id')->map(function ($variantEvents, $variantId) {
            $visitors = $variantEvents->where('event_type', 'view')->pluck('session_id')->filter()->unique()->count();
            $conversions = $variantEvents->where('event_type', 'conversion')->count();

            return [
                'variant_id' => (int) $variantId,
                'visitors' => $visitors,
                'conversions' => $conversions,
                'conversion_rate' => $visitors > 0 ? round($conversions / $visitors * 100, 2) : 0,
            ];
        })->values();

        $workspaceIds = $user->workspaces()->select('workspaces.id');
        $ownedListings = fn ($query) => $query->where(function ($query) use ($user, $workspaceIds): void {
            $query->where('owner_id', $user->id)
                ->orWhereIn('workspace_id', $workspaceIds);
        });
        $purchases = MarketplacePurchase::query()
            ->where('status', 'paid')
            ->where('paid_at', '>=', $since)
            ->whereHas('template', $ownedListings)
            ->with('template:id,type')
            ->get(['id', 'template_id', 'amount_minor', 'currency']);
        $checkoutStarts = MarketplacePurchase::query()
            ->where('status', 'pending')
            ->whereNotNull('checkout_url')
            ->where('created_at', '>=', $since)
            ->whereHas('template', $ownedListings)
            ->count();
        $revenue = $purchases->groupBy('currency')->map(fn ($currencyPurchases, $currency) => [
            'currency' => $currency,
            'amount_minor' => (int) $currencyPurchases->sum('amount_minor'),
        ])->values();

        return Inertia::render('developer-analytics', [
            'period' => ['from' => $since->toDateString(), 'to' => today()->toDateString()],
            'metrics' => [
                'unique_visitors' => $events->where('event_type', 'view')->pluck('session_id')->filter()->unique()->count(),
                'quiz_completions' => $count('quiz_completed'),
                'github_profiles_connected' => $count('github_connected'),
                'quiz_branch_evaluations' => $count('branch_evaluated'),
                'lead_conversions' => $conversions->count(),
                'offer_views' => $count('offer_viewed'),
                'checkout_starts' => $checkoutStarts,
                'paid_purchases' => $purchases->count(),
                'bundle_purchases' => $purchases->filter(fn (MarketplacePurchase $purchase) => $purchase->template?->type === 'bundle')->count(),
            ],
            'revenue' => $revenue,
            'attribution' => $sources,
            'experiments' => $variants,
        ]);
    }
}
