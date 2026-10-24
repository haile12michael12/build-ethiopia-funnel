<?php

namespace App\Http\Controllers;

use App\Models\MarketplacePurchase;
use App\Models\MarketplaceTemplate;
use App\Services\Marketplace\MarketplaceAccessService;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MarketplacePurchaseController extends Controller
{
    public function adminIndex(): Response
    {
        $orders = MarketplacePurchase::query()
            ->with(['buyer:id,name,email', 'template:id,name,slug,type'])
            ->latest()
            ->paginate(20);

        return Inertia::render('marketplace/orders/index', [
            'orders' => [
                'data' => $orders->getCollection()->map(fn (MarketplacePurchase $purchase): array => [
                    ...$this->present($purchase),
                    'buyer' => $purchase->buyer?->only(['name', 'email']),
                ])->values(),
                'links' => $orders->linkCollection()->toArray(),
                'total' => $orders->total(),
            ],
        ]);
    }

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
            ->with('template.bundleItems:id,name,slug,type')
            ->findOrFail($purchase->id);

        $downloadableProducts = collect();
        if ($purchase->status === 'paid' && $purchase->template) {
            $products = $purchase->template->type === 'bundle'
                ? $purchase->template->bundleItems->where('type', 'template')
                : collect([$purchase->template])->where('type', 'template');

            $downloadableProducts = $products
                ->filter(fn (MarketplaceTemplate $product): bool => $access->hasPaidPurchase($request->user(), $product))
                ->map(fn (MarketplaceTemplate $product): array => [
                    'name' => $product->name,
                    'url' => route('marketplace.download', $product->slug),
                ])
                ->values();
        }

        return Inertia::render('account/orders/show', [
            'order' => [
                ...$this->present($purchase),
                'product' => $purchase->template?->only(['name', 'slug', 'type', 'support_information']),
                'downloads' => $downloadableProducts,
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
