<?php

namespace App\Http\Controllers;

use App\Models\MarketplacePurchase;
use App\Services\Marketplace\MarketplaceAccessService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MarketplacePurchaseController extends Controller
{
    public function index(Request $request): Response
    {
        $orders = $request->user()
            ->marketplacePurchases()
            ->with('template:id,name,slug,type')
            ->latest()
            ->paginate(10);

        return Inertia::render('account/orders/index', [
            'orders' => [
                'data' => $orders->getCollection()->map(fn (MarketplacePurchase $purchase): array => $this->present($purchase))->values(),
                'links' => $orders->linkCollection()->toArray(),
                'total' => $orders->total(),
            ],
        ]);
    }

    public function show(
        Request $request,
        MarketplacePurchase $purchase,
        MarketplaceAccessService $access,
    ): Response {
        $purchase = $request->user()
            ->marketplacePurchases()
            ->with('template')
            ->findOrFail($purchase->id);

        return Inertia::render('account/orders/show', [
            'order' => [
                ...$this->present($purchase),
                'product' => $purchase->template?->only(['name', 'slug', 'type', 'support_information']),
                'can_download' => $purchase->template !== null
                    && $purchase->template->type === 'template'
                    && $access->hasAccess($request->user(), $purchase->template),
                'download_url' => $purchase->template?->type === 'template'
                    && $access->hasAccess($request->user(), $purchase->template)
                        ? route('marketplace.download', $purchase->template->slug)
                        : null,
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(MarketplacePurchase $purchase): array
    {
        return [
            'id' => $purchase->id,
            'reference' => $purchase->tx_ref,
            'status' => $purchase->status,
            'amount_minor' => $purchase->amount_minor,
            'currency' => $purchase->currency,
            'created_at' => $purchase->created_at?->toIso8601String(),
            'paid_at' => $purchase->paid_at?->toIso8601String(),
            'product' => $purchase->template?->only(['name', 'slug', 'type']),
        ];
    }
}
