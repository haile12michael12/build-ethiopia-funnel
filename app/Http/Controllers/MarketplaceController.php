<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\MarketplacePurchase;
use App\Models\MarketplaceTemplate;
use App\Models\User;
use App\Models\Workspace;
use App\Services\Marketplace\ChapaPaymentGateway;
use App\Services\Marketplace\MarketplaceAccessService;
use App\Services\Marketplace\MarketplacePurchaseService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpKernel\Exception\HttpException;

class MarketplaceController extends Controller
{
    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:80'],
            'type' => ['nullable', Rule::in(['template', 'bundle'])],
            'price' => ['nullable', Rule::in(['free', 'paid'])],
            'currency' => ['nullable', Rule::in(['ETB', 'USD'])],
            'sort' => ['nullable', Rule::in(['relevance', 'newest', 'price_asc', 'price_desc'])],
        ]);

        $products = MarketplaceTemplate::query()->businessStore()
            ->where('status', 'published')
            ->with('owner:id,name')
            ->when($filters['search'] ?? null, function ($query, string $search): void {
                $search = trim($search);
                $query->where(function ($query) use ($search): void {
                    $query->where('name', 'like', '%'.$search.'%')
                        ->orWhere('description', 'like', '%'.$search.'%')
                        ->orWhere('category', 'like', '%'.$search.'%');
                });
            })
            ->when($filters['category'] ?? null, fn ($query, string $category) => $query->where('category', $category))
            ->when($filters['type'] ?? null, fn ($query, string $type) => $query->where('type', $type))
            ->when($filters['price'] ?? null, fn ($query, string $price) => $price === 'free'
                ? $query->where('amount_minor', 0)
                : $query->where('amount_minor', '>', 0))
            ->when($filters['currency'] ?? null, fn ($query, string $currency) => $query->where('currency', $currency));

        match ($filters['sort'] ?? 'relevance') {
            'newest' => $products->latest(),
            'price_asc' => $products->orderByRaw('CASE WHEN amount_minor IS NULL THEN 1 ELSE 0 END')->orderBy('amount_minor'),
            'price_desc' => $products->orderByRaw('CASE WHEN amount_minor IS NULL THEN 1 ELSE 0 END')->orderByDesc('amount_minor'),
            default => isset($filters['search']) && trim($filters['search']) !== ''
                ? $products->orderByRaw(
                    'CASE WHEN name LIKE ? THEN 0 WHEN description LIKE ? THEN 1 ELSE 2 END',
                    [trim($filters['search']).'%', '%'.trim($filters['search']).'%'],
                )->orderBy('name')
                : $products->orderBy('name'),
        };
        $products = $products->paginate(12)->withQueryString();

        return Inertia::render('marketplace/index', [
            'products' => [
                'data' => $products->getCollection()->map(fn (MarketplaceTemplate $product): array => $this->present($product))->values(),
                'links' => $products->linkCollection()->toArray(),
                'total' => $products->total(),
            ],
            'filters' => [
                'search' => $filters['search'] ?? '',
                'category' => $filters['category'] ?? '',
                'type' => $filters['type'] ?? '',
                'price' => $filters['price'] ?? '',
                'currency' => $filters['currency'] ?? '',
                'sort' => $filters['sort'] ?? 'relevance',
            ],
            'categories' => MarketplaceTemplate::query()->businessStore()->where('status', 'published')
                ->whereNotNull('category')->distinct()->orderBy('category')->pluck('category'),
            'canReview' => $this->canReview($request->user()),
            'authenticated' => (bool) $request->user(),
            'mySubmissions' => $request->user()?->isBusinessOwner()
                ? MarketplaceTemplate::query()
                    ->with('workspace:id,name')
                    ->where(function ($query) use ($request): void {
                        $query->where('owner_id', $request->user()->id)
                            ->orWhereHas('workspace.members', fn ($members) => $members->whereKey($request->user()->id));
                    })
                    ->latest()
                    ->get()
                    ->map(fn (MarketplaceTemplate $product): array => [
                        'id' => $product->id,
                        'name' => $product->name,
                        'slug' => $product->slug,
                        'status' => $product->status,
                        'type' => $product->type,
                        'workspace' => $product->workspace?->name,
                        'can_edit' => $product->owner_id === $request->user()->id
                            || in_array($product->workspace?->roleFor($request->user()), ['owner', 'admin', 'editor'], true),
                    ])
                : [],
            'workspaces' => $request->user()?->isBusinessOwner()
                ? Workspace::query()
                    ->where('owner_id', $request->user()->id)
                    ->orWhereHas('members', fn ($query) => $query->whereKey($request->user()->id)
                        ->whereIn('workspace_members.role', ['owner', 'admin', 'editor']))
                    ->orderBy('name')
                    ->get(['id', 'name'])
                : [],
        ]);
    }

    public function show(Request $request, MarketplaceTemplate $template): Response
    {
        abort_unless($template->status === 'published' && $this->isBusinessStoreProduct($template), 404);

        $template->load(['owner:id,name', 'bundleItems:id,name,slug,type,amount_minor,currency']);
        $access = $request->user() && app(MarketplaceAccessService::class)->hasAccess($request->user(), $template);

        return Inertia::render('marketplace/show', [
            'product' => $this->present($template),
            'authenticated' => (bool) $request->user(),
            'hasAccess' => (bool) $access,
            'purchased' => $request->user()
                ? $request->user()->marketplacePurchases()->where('template_id', $template->id)->where('status', 'paid')->exists()
                : false,
            'checkoutEnabled' => app(ChapaPaymentGateway::class)->configured()
                && $template->type !== 'membership'
                && $template->amount_minor !== null
                && $template->amount_minor > 0
                && ($template->type !== 'template' || filled($template->file_path)),
        ]);
    }

    public function submit(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'type' => ['required', Rule::in(['template', 'bundle', 'membership'])],
            'name' => ['required', 'string', 'max:150'],
            'description' => ['required', 'string', 'max:5000'],
            'category' => ['nullable', 'string', 'max:80'],
            'tech_stack' => ['required', 'array', 'min:1', 'max:20'],
            'tech_stack.*' => ['required', 'string', 'max:50'],
            'included_modules' => ['required', 'array', 'min:1', 'max:30'],
            'included_modules.*' => ['required', 'string', 'max:100'],
            'version' => ['required', 'string', 'max:50'],
            'changelog' => ['nullable', 'string', 'max:5000'],
            'license' => ['required', 'string', 'max:100'],
            'license_terms' => ['nullable', 'string', 'max:10000'],
            'documentation_url' => ['nullable', 'url:https', 'max:2048'],
            'demo_url' => ['nullable', 'url:https', 'max:2048'],
            'compatibility' => ['nullable', 'string', 'max:1000'],
            'support_information' => ['nullable', 'string', 'max:2000'],
            'workspace_id' => ['nullable', 'integer', 'exists:workspaces,id'],
        ]);

        $workspace = isset($validated['workspace_id'])
            ? Workspace::query()->findOrFail($validated['workspace_id'])
            : null;
        if ($workspace) {
            abort_unless(in_array($workspace->roleFor($request->user()), ['owner', 'admin', 'editor'], true), 403);
        }

        $slug = Str::slug($validated['name']);
        if (MarketplaceTemplate::query()->where('slug', $slug)->exists()) {
            $slug = $slug.'-'.Str::lower(Str::random(6));
        }

        $request->user()->marketplaceTemplates()->create([
            ...$validated,
            'category' => $validated['category'] ?? 'other',
            'workspace_id' => $workspace?->id,
            'slug' => $slug,
            'currency' => 'ETB',
            'compatibility' => isset($validated['compatibility'])
                ? array_values(array_filter(array_map('trim', explode(',', $validated['compatibility']))))
                : [],
            'status' => 'pending_review',
            'contributor_revenue_share_percent' => config('marketplace.default_revenue_share_percent', 70),
        ]);

        return to_route('marketplace.index')->with('success', 'Your submission is queued for marketplace review.');
    }

    public function editListing(Request $request, MarketplaceTemplate $template): Response
    {
        $this->authorizeListingManagement($request, $template);

        return Inertia::render('marketplace/edit-listing', [
            'product' => [
                ...$this->present($template),
                'license_terms' => $template->license_terms,
                'documentation_url' => $template->documentation_url,
                'demo_url' => $template->demo_url,
                'compatibility' => implode(', ', $template->compatibility ?? []),
                'support_information' => $template->support_information,
                'status' => $template->status,
            ],
            'categories' => $this->categories(),
        ]);
    }

    public function updateListing(Request $request, MarketplaceTemplate $template): RedirectResponse
    {
        $this->authorizeListingManagement($request, $template);
        abort_if(in_array($template->status, ['suspended', 'archived'], true), 409, 'This listing cannot be edited in its current state.');

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'description' => ['required', 'string', 'max:5000'],
            'category' => ['required', 'string', 'max:80'],
            'tech_stack' => ['required', 'array', 'min:1', 'max:20'],
            'tech_stack.*' => ['required', 'string', 'max:50'],
            'included_modules' => ['required', 'array', 'min:1', 'max:30'],
            'included_modules.*' => ['required', 'string', 'max:100'],
            'version' => ['required', 'string', 'max:50'],
            'changelog' => ['nullable', 'string', 'max:5000'],
            'license' => ['required', 'string', 'max:100'],
            'license_terms' => ['nullable', 'string', 'max:10000'],
            'documentation_url' => ['nullable', 'url:https', 'max:2048'],
            'demo_url' => ['nullable', 'url:https', 'max:2048'],
            'compatibility' => ['nullable', 'string', 'max:1000'],
            'support_information' => ['nullable', 'string', 'max:2000'],
        ]);

        $template->update([
            ...$validated,
            'compatibility' => isset($validated['compatibility'])
                ? array_values(array_filter(array_map('trim', explode(',', $validated['compatibility']))))
                : [],
            'status' => 'pending_review',
        ]);

        return to_route('marketplace.index')->with('success', 'Listing changes were submitted for review. The listing is hidden until approved.');
    }

    public function reviewerIndex(Request $request): Response
    {
        abort_unless($this->canReview($request->user()), 403);

        return Inertia::render('marketplace/review', [
            'products' => MarketplaceTemplate::query()->businessStore()->with(['owner:id,name,email', 'workspace:id,name'])->withCount('bundleItems')->latest()->get()->map(fn (MarketplaceTemplate $product): array => [
                ...$this->present($product),
                'owner' => $product->owner?->only(['name', 'email']),
                'workspace' => $product->workspace?->name,
                'file_configured' => filled($product->file_path),
                'revenue_share_percent' => $product->contributor_revenue_share_percent,
                'bundle_item_count' => $product->bundle_items_count,
            ]),
            'bundleOptions' => MarketplaceTemplate::query()->businessStore()->where('status', 'published')->where('type', 'template')
                ->get(['id', 'name'])->map(fn (MarketplaceTemplate $template): array => $template->only(['id', 'name'])),
        ]);
    }

    public function review(Request $request, MarketplaceTemplate $template): RedirectResponse
    {
        abort_unless($this->canReview($request->user()), 403);
        abort_unless($this->isBusinessStoreProduct($template), 404);

        $validated = $request->validate([
            'status' => ['required', Rule::in(['published', 'rejected'])],
            'amount' => ['nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'currency' => ['required', 'string', 'size:3', 'alpha:ascii'],
            'license' => ['required', 'string', 'max:100'],
            'license_terms' => ['nullable', 'string', 'max:10000'],
            'contributor_revenue_share_percent' => ['required', 'numeric', 'min:0', 'max:90'],
            'bundle_template_ids' => ['nullable', 'array', 'max:50'],
            'bundle_template_ids.*' => [
                'integer',
                Rule::exists('marketplace_templates', 'id')->where('status', 'published')->where('type', 'template'),
            ],
            'file' => ['nullable', 'file', 'mimes:zip', 'max:102400'],
            'preview_images' => ['nullable', 'array', 'max:4'],
            'preview_images.*' => ['image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $filePath = $template->file_path;
        if ($request->hasFile('file')) {
            $filePath = $request->file('file')->store("marketplace/{$template->slug}", 'local');
        }

        $previewImages = $template->preview_images ?? [];
        foreach ($request->file('preview_images', []) as $image) {
            $previewImages[] = $image->store("marketplace/{$template->slug}/previews", 'public');
        }

        $bundleIds = array_values(array_unique($validated['bundle_template_ids'] ?? []));
        if ($bundleIds !== [] && MarketplaceTemplate::query()->businessStore()->whereIn('id', $bundleIds)->count() !== count($bundleIds)) {
            throw ValidationException::withMessages([
                'bundle_template_ids' => 'Bundles may only contain products from this storefront.',
            ]);
        }
        if ($validated['status'] === 'published') {
            if ($template->type === 'template' && ! $filePath) {
                throw ValidationException::withMessages([
                    'file' => 'Upload the private ZIP artifact before publishing this template.',
                ]);
            }
            if ($template->type === 'bundle' && $bundleIds === [] && ! $template->bundleItems()->exists()) {
                throw ValidationException::withMessages([
                    'bundle_template_ids' => 'Select at least one published template for this bundle.',
                ]);
            }
        }

        $amountMinor = $validated['amount'] === null || $validated['amount'] === ''
            ? null
            : (int) round((float) $validated['amount'] * 100);

        $template->update([
            'status' => $validated['status'],
            'amount_minor' => $amountMinor,
            'currency' => strtoupper($validated['currency']),
            'license' => $validated['license'],
            'license_terms' => $validated['license_terms'] ?? null,
            'contributor_revenue_share_percent' => $validated['contributor_revenue_share_percent'],
            'file_path' => $filePath,
            'preview_images' => $previewImages,
        ]);

        if ($template->type === 'bundle' && $bundleIds !== []) {
            $template->bundleItems()->sync($bundleIds);
        }

        return to_route('marketplace.review.index')->with('success', 'Marketplace listing updated.');
    }

    public function checkout(Request $request, MarketplaceTemplate $template, ChapaPaymentGateway $gateway): RedirectResponse
    {
        $request->validate(['license_accepted' => ['required', 'accepted']]);
        abort_unless($template->status === 'published' && $this->isBusinessStoreProduct($template), 404);
        abort_if($template->type === 'membership', 422, 'Recurring membership checkout is not enabled.');
        abort_if($template->amount_minor === null || $template->amount_minor <= 0, 422, 'This listing does not have a paid price configured.');
        abort_if($template->type === 'template' && ! $template->file_path, 422, 'This template is not available for purchase yet.');
        abort_unless($gateway->configured(), 503, 'Marketplace checkout is not configured yet.');

        if (app(MarketplaceAccessService::class)->hasAccess($request->user(), $template)) {
            return to_route('marketplace.download', $template);
        }

        $purchase = MarketplacePurchase::query()
            ->where('buyer_id', $request->user()->id)
            ->where('template_id', $template->id)
            ->where('status', 'pending')
            ->where('amount_minor', $template->amount_minor)
            ->where('currency', $template->currency)
            ->latest()
            ->first();
        if (! $purchase) {
            $purchase = MarketplacePurchase::query()->create([
                'buyer_id' => $request->user()->id,
                'template_id' => $template->id,
                'tx_ref' => 'MKT-'.Str::upper(Str::ulid()),
                'amount_minor' => $template->amount_minor,
                'currency' => $template->currency,
                'contributor_share_percent' => $template->owner_id ? $template->contributor_revenue_share_percent : 0,
                'status' => 'pending',
                'license_snapshot' => $template->license,
                'license_terms_snapshot' => $template->license_terms,
                'license_accepted_at' => now(),
                'contributor_share_amount_minor' => $template->owner_id
                    ? (int) round($template->amount_minor * ((float) $template->contributor_revenue_share_percent / 100))
                    : 0,
                'platform_commission_amount_minor' => $template->owner_id
                    ? $template->amount_minor - (int) round($template->amount_minor * ((float) $template->contributor_revenue_share_percent / 100))
                    : $template->amount_minor,
            ]);
        }

        if ($purchase->license_accepted_at === null) {
            $contributorShare = $purchase->contributor_share_percent;
            $contributorAmount = $template->owner_id
                ? (int) round($purchase->amount_minor * ((float) $contributorShare / 100))
                : 0;
            $purchase->update([
                'license_snapshot' => $template->license,
                'license_terms_snapshot' => $template->license_terms,
                'license_accepted_at' => now(),
                'contributor_share_amount_minor' => $contributorAmount,
                'platform_commission_amount_minor' => $purchase->amount_minor - $contributorAmount,
            ]);
        }

        if ($purchase->checkout_url) {
            return redirect()->away($purchase->checkout_url);
        }

        try {
            $checkoutUrl = $gateway->initialize($purchase);
        } catch (HttpException $exception) {
            $purchase->update(['status' => 'failed']);
            throw $exception;
        }

        $purchase->update(['checkout_url' => $checkoutUrl]);

        return redirect()->away($checkoutUrl);
    }

    public function checkoutReturn(
        Request $request,
        MarketplacePurchaseService $purchases,
    ): RedirectResponse {
        $validated = $request->validate(['tx_ref' => ['required', 'string', 'max:100']]);
        $purchase = MarketplacePurchase::query()
            ->with('template')
            ->where('tx_ref', $validated['tx_ref'])
            ->where('buyer_id', $request->user()->id)
            ->firstOrFail();

        if (
            $purchase->status === 'paid'
            || (in_array($purchase->status, ['pending', 'failed'], true) && $purchases->verifyAndFulfill($purchase))
        ) {
            return to_route('marketplace.show', $purchase->template)
                ->with('success', 'Payment verified. Your marketplace access is ready.');
        }

        return to_route('marketplace.show', $purchase->template)
            ->with('error', 'Payment has not been confirmed yet. No access has been granted.');
    }

    public function download(Request $request, MarketplaceTemplate $template)
    {
        $access = app(MarketplaceAccessService::class);
        $hasAccess = $access->hasAccess($request->user(), $template);
        $hasPaidPurchase = $access->hasPaidPurchase($request->user(), $template);
        abort_unless(
            $template->owner_id === $request->user()->id
            || ($template->status === 'published' && $hasAccess)
            || $hasPaidPurchase,
            403,
        );
        abort_unless($template->type === 'template' && $template->file_path, 404);
        abort_unless(Storage::disk('local')->exists($template->file_path), 404);
        Activity::record('template_downloaded', (int) $request->user()->id, $template, ['template_id' => $template->id]);

        return Storage::disk('local')->download($template->file_path, "{$template->slug}.zip");
    }

    private function canReview(?User $user): bool
    {
        return $user?->isBusinessOwner() ?? false;
    }

    private function isBusinessStoreProduct(MarketplaceTemplate $template): bool
    {
        return MarketplaceTemplate::query()->businessStore()->whereKey($template->id)->exists();
    }

    private function authorizeListingManagement(Request $request, MarketplaceTemplate $template): void
    {
        $authorized = $template->owner_id === $request->user()->id
            || ($template->workspace_id !== null
                && in_array($template->workspace?->roleFor($request->user()), ['owner', 'admin', 'editor'], true));

        abort_unless($authorized, 404);
    }

    private function categories(): array
    {
        return ['automation', 'content', 'development', 'funnels', 'marketing', 'other'];
    }

    /**
     * @return array<string, mixed>
     */
    private function present(MarketplaceTemplate $product): array
    {
        return [
            'id' => $product->id,
            'slug' => $product->slug,
            'type' => $product->type,
            'name' => $product->name,
            'description' => $product->description,
            'category' => $product->category,
            'preview_images' => array_map(
                fn (string $image): string => str_starts_with($image, '/')
                    ? $image
                    : Storage::disk('public')->url($image),
                $product->preview_images ?? [],
            ),
            'tech_stack' => $product->tech_stack ?? [],
            'amount_minor' => $product->amount_minor,
            'currency' => $product->currency,
            'included_modules' => $product->included_modules ?? [],
            'version' => $product->version,
            'changelog' => $product->changelog,
            'license' => $product->license,
            'license_terms' => $product->license_terms,
            'documentation_url' => $product->documentation_url,
            'demo_url' => $product->demo_url,
            'compatibility' => $product->compatibility ?? [],
            'support_information' => $product->support_information,
            'contributor' => $product->owner?->name,
            'contributor_badge' => $product->owner
                ? $product->owner->marketplaceTemplates()->where('status', 'published')->count() >= 3
                : false,
            'bundle_items' => $product->relationLoaded('bundleItems')
                ? $product->bundleItems->map(fn (MarketplaceTemplate $item): array => $item->only(['id', 'name', 'slug', 'type', 'amount_minor', 'currency']))->all()
                : [],
        ];
    }
}
